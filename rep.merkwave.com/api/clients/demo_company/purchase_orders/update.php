<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $purchase_orders_id = $_POST['purchase_orders_id'] ?? null;

    if (empty($purchase_orders_id) || !is_numeric($purchase_orders_id) || $purchase_orders_id <= 0) {
        print_failure("Error: Valid Purchase Order ID is required for update.");
    }

    // --- Collect Main Purchase Order POST Data ---
    $purchase_orders_supplier_id          = $_POST['purchase_orders_supplier_id']          ?? null;
    $purchase_orders_warehouse_id         = $_POST['purchase_orders_warehouse_id']         ?? null;
    $purchase_orders_order_date           = $_POST['purchase_orders_order_date']           ?? null;
    $purchase_orders_expected_delivery_date = $_POST['purchase_orders_expected_delivery_date'] ?? null;
    $purchase_orders_order_discount        = isset($_POST['purchase_orders_order_discount']) ? $_POST['purchase_orders_order_discount'] : null;
    $purchase_orders_status               = $_POST['purchase_orders_status']               ?? null;
    $purchase_orders_notes                = $_POST['purchase_orders_notes']                ?? null;
    $purchase_order_items_data            = json_decode($_POST['purchase_order_items'] ?? '[]', true); // Array of items

    // Handle empty strings for nullable fields
    if (array_key_exists('purchase_orders_expected_delivery_date', $_POST) && $_POST['purchase_orders_expected_delivery_date'] === "") {$purchase_orders_expected_delivery_date = null;}
    if (array_key_exists('purchase_orders_notes', $_POST) && $_POST['purchase_orders_notes'] === "") {$purchase_orders_notes = null;}

    // --- Basic Purchase Order Validation for update fields ---
    $update_po_fields = [];
    $bind_po_types = "";
    $bind_po_params = []; // This will hold the actual parameter values

    // Fetch current PO data for comparison and supplier balance adjustment
    $stmt_fetch_current_po = $conn->prepare("
        SELECT purchase_orders_supplier_id, purchase_orders_total_amount, purchase_orders_status
        FROM purchase_orders
        WHERE purchase_orders_id = ?
        LIMIT 1
    ");
    if (!$stmt_fetch_current_po) throw new Exception("Prepare failed to fetch current PO: " . $conn->error);
    $stmt_fetch_current_po->bind_param("i", $purchase_orders_id);
    $stmt_fetch_current_po->execute();
    $current_po_data = $stmt_fetch_current_po->get_result()->fetch_assoc();
    $stmt_fetch_current_po->close();

    if (!$current_po_data) {
        print_failure("Error: Purchase Order with ID " . $purchase_orders_id . " not found for update.");
    }

    $old_supplier_id = (int)$current_po_data['purchase_orders_supplier_id'];
    $old_total_amount = (float)$current_po_data['purchase_orders_total_amount'];
    $old_status = $current_po_data['purchase_orders_status'];

    $new_supplier_id_effective = $old_supplier_id;
    $new_total_amount_effective = $old_total_amount;
    $new_status_effective = $old_status;


    // Map POST data to database columns and prepare for dynamic update
    $po_fields_to_check = [
        'purchase_orders_supplier_id'          => ['type' => 'i', 'numeric' => true, 'min' => 1],
        'purchase_orders_warehouse_id'         => ['type' => 'i', 'numeric' => true, 'min' => 1],
        'purchase_orders_order_date'           => ['type' => 's', 'validate' => 'date'],
        'purchase_orders_expected_delivery_date' => ['type' => 's', 'nullable' => true, 'validate' => 'date'],
        // Order-level discount (decimal)
        'purchase_orders_order_discount'      => ['type' => 'd', 'numeric' => true, 'min' => 0, 'nullable' => true],
        'purchase_orders_status'               => ['type' => 's', 'enum' => ['Draft', 'Ordered', 'Shipped', 'Received', 'Partially Received', 'Cancelled']],
        'purchase_orders_notes'                => ['type' => 's', 'nullable' => true],
    ];

    foreach ($po_fields_to_check as $field_name => $props) {
        if (array_key_exists($field_name, $_POST)) {
            $value = $_POST[$field_name];

            if (isset($props['nullable']) && $props['nullable'] === true && $value === "") {
                $value = null;
            }
            
            if (isset($props['numeric']) && $value !== null && !is_numeric($value)) {
                print_failure("Error: Invalid numeric value for PO " . $field_name . ".");
            }
            if (isset($props['min']) && $value !== null && is_numeric($value) && $value < $props['min']) {
                print_failure("Error: PO " . $field_name . " is below minimum value.");
            }
            if (isset($props['validate'])) {
                if ($props['validate'] === 'date' && $value !== null && !strtotime($value)) {
                    print_failure("Error: Invalid date format for PO " . $field_name . ".");
                }
            }
            if (isset($props['enum']) && $value !== null && !in_array($value, $props['enum'])) {
                print_failure("Error: Invalid PO status for " . $field_name . ".");
            }
            
            $update_po_fields[] = $field_name . " = ?";
            $bind_po_types .= $props['type'];
            $bind_po_params[] = $value; // ✅ FIX: Store the actual value, not a reference.

            if ($props['type'] === 'd' && $value !== null && !is_float($value)) {
                 $bind_po_params[count($bind_po_params)-1] = (float)$value;
            }
            // Update effective values for balance adjustment logic
            if ($field_name === 'purchase_orders_supplier_id') $new_supplier_id_effective = (int)$value;
            if ($field_name === 'purchase_orders_status') $new_status_effective = $value;
        }
    }

    // Calculate new total amount based on items data (if provided)
    $items_data_provided = false;
    $processed_po_items = [];
    if (!empty($purchase_order_items_data) && is_array($purchase_order_items_data)) {
        $items_data_provided = true;
        $calculated_total_amount_for_update = 0.00;
        $all_variant_ids = [];
        $all_packaging_type_ids = [];

        foreach ($purchase_order_items_data as $index => $item) {
            $item_id = $item['purchase_order_items_id'] ?? null; // Item ID for existing items

            if (empty($item['variant_id']) || !is_numeric($item['variant_id']) || $item['variant_id'] <= 0 ||
                empty($item['quantity_ordered']) || !is_numeric($item['quantity_ordered']) || $item['quantity_ordered'] <= 0 ||
                empty($item['unit_cost']) || !is_numeric($item['unit_cost']) || $item['unit_cost'] < 0) {
                print_failure("Error: Invalid item data (variant ID, quantity, or unit cost) for item #" . ($index + 1) . ".");
            }
            
            // Process discount and tax fields (with defaults)
            $discount_amount = isset($item['discount_amount']) && is_numeric($item['discount_amount']) ? (float)$item['discount_amount'] : 0.00;
            $tax_rate = isset($item['tax_rate']) && is_numeric($item['tax_rate']) ? (float)$item['tax_rate'] : 0.00;
            $has_tax = isset($item['has_tax']) && ($item['has_tax'] === true || $item['has_tax'] === 1 || $item['has_tax'] === '1') ? 1 : 0;
            
            // Validate discount and tax values
            if ($discount_amount < 0) {
                print_failure("Error: Discount amount cannot be negative for item #" . ($index + 1) . ".");
            }
            if ($tax_rate < 0 || $tax_rate > 100) {
                print_failure("Error: Tax rate must be between 0 and 100 for item #" . ($index + 1) . ".");
            }
            
            // Calculate item total with discount and tax
            $base_total = (float)$item['quantity_ordered'] * (float)$item['unit_cost'];
            $discounted_total = $base_total - $discount_amount;
            $tax_amount = $has_tax ? ($discounted_total * $tax_rate / 100) : 0.00;
            $item_total_cost = $discounted_total + $tax_amount;
            
            $calculated_total_amount_for_update += $item_total_cost;

            $all_variant_ids[] = (int)$item['variant_id'];

            $packaging_type_id_val = $item['packaging_type_id'] ?? null;
            if ($packaging_type_id_val === "") {$packaging_type_id_val = null;}
            if ($packaging_type_id_val !== null) {
                $all_packaging_type_ids[] = (int)$packaging_type_id_val;
            }

            $processed_po_items[] = [
                'purchase_order_items_id' => $item_id,
                'variant_id' => (int)$item['variant_id'],
                'packaging_type_id' => $packaging_type_id_val,
                'quantity_ordered' => (float)$item['quantity_ordered'],
                'unit_cost' => (float)$item['unit_cost'],
                'discount_amount' => $discount_amount,
                'tax_rate' => $tax_rate,
                'has_tax' => $has_tax,
                'total_cost' => $item_total_cost,
                'notes' => $item['item_notes'] ?? $item['notes'] ?? null,
            ];
        }
        // Apply order-level discount if provided
        $order_level_discount_val = 0.00;
        if (isset($purchase_orders_order_discount) && is_numeric($purchase_orders_order_discount)) {
            $order_level_discount_val = (float)$purchase_orders_order_discount;
            if ($order_level_discount_val < 0) {
                print_failure("Error: Order discount cannot be negative.");
            }
        }
        $final_total_after_discount = max($calculated_total_amount_for_update - $order_level_discount_val, 0.00);
        $new_total_amount_effective = $final_total_after_discount; // Update effective total amount
        $update_po_fields[] = "purchase_orders_total_amount = ?";
        $bind_po_types .= "d";
        $bind_po_params[] = $final_total_after_discount; // store the discounted total
        // Also ensure discount column is updated if provided
        if (isset($purchase_orders_order_discount)) {
            $update_po_fields[] = "purchase_orders_order_discount = ?";
            $bind_po_types .= "d";
            $bind_po_params[] = (is_numeric($purchase_orders_order_discount) ? (float)$purchase_orders_order_discount : 0.00);
        }
    }

    // If no items provided but order-level discount is sent, adjust total based on previous total minus discount
    if (!$items_data_provided && isset($purchase_orders_order_discount)) {
        if (!is_numeric($purchase_orders_order_discount)) {
            print_failure("Error: Invalid order discount value.");
        }
        $discount_val_only = (float)$purchase_orders_order_discount;
        if ($discount_val_only < 0) print_failure("Error: Order discount cannot be negative.");
        // Recalculate new total as old total minus provided discount (best-effort)
        $new_total_amount_effective = max($old_total_amount - $discount_val_only, 0.00);
        $update_po_fields[] = "purchase_orders_total_amount = ?";
        $bind_po_types .= "d";
        $bind_po_params[] = $new_total_amount_effective;
        // Ensure discount column is updated
        $update_po_fields[] = "purchase_orders_order_discount = ?";
        $bind_po_types .= "d";
        $bind_po_params[] = $discount_val_only;
    }


    if (empty($update_po_fields) && !$items_data_provided) {
        print_failure("Error: No valid PO fields or items data provided for update.");
    }

    $conn->begin_transaction();

    try {
        // Check if supplier exists (if supplier_id is being updated)
        if (array_key_exists('purchase_orders_supplier_id', $_POST)) {
            $stmt_check_supplier = $conn->prepare("SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1");
            if (!$stmt_check_supplier) throw new Exception("Prepare failed for supplier check: " . $conn->error);
            $stmt_check_supplier->bind_param("i", $purchase_orders_supplier_id);
            $stmt_check_supplier->execute();
            if ($stmt_check_supplier->get_result()->num_rows === 0) {
                print_failure("Error: Supplier ID " . $purchase_orders_supplier_id . " does not exist.");
            }
            $stmt_check_supplier->close();
        }

        // Check if warehouse exists (if warehouse_id is being updated)
        if (array_key_exists('purchase_orders_warehouse_id', $_POST)) {
            $stmt_check_warehouse = $conn->prepare("SELECT warehouse_id FROM warehouse WHERE warehouse_id = ? LIMIT 1");
            if (!$stmt_check_warehouse) throw new Exception("Prepare failed for warehouse check: " . $conn->error);
            $stmt_check_warehouse->bind_param("i", $purchase_orders_warehouse_id);
            $stmt_check_warehouse->execute();
            if ($stmt_check_warehouse->get_result()->num_rows === 0) {
                print_failure("Error: Warehouse ID " . $purchase_orders_warehouse_id . " does not exist.");
            }
            $stmt_check_warehouse->close();
        }

        // Check if variant IDs for items exist
        if ($items_data_provided && !empty($all_variant_ids)) {
            $unique_variant_ids = array_unique($all_variant_ids);
            $placeholders = implode(',', array_fill(0, count($unique_variant_ids), '?'));
            $bind_types_variant = str_repeat('i', count($unique_variant_ids));

            $stmt_check_variants = $conn->prepare("SELECT COUNT(*) FROM product_variants WHERE variant_id IN (" . $placeholders . ")");
            if (!$stmt_check_variants) throw new Exception("Prepare failed for variant check: " . $conn->error);
            $stmt_check_variants->bind_param($bind_types_variant, ...$unique_variant_ids);
            $stmt_check_variants->execute();
            if ($stmt_check_variants->get_result()->fetch_row()[0] !== count($unique_variant_ids)) {
                print_failure("Error: One or more provided Variant IDs for items do not exist.");
            }
            $stmt_check_variants->close();
        }

        // Check if packaging type IDs for items exist
        if ($items_data_provided && !empty($all_packaging_type_ids)) {
            $unique_packaging_type_ids = array_unique($all_packaging_type_ids);
            $placeholders = implode(',', array_fill(0, count($unique_packaging_type_ids), '?'));
            $bind_types_pkg = str_repeat('i', count($unique_packaging_type_ids));

            $stmt_check_packaging_types = $conn->prepare("SELECT COUNT(*) FROM packaging_types WHERE packaging_types_id IN (" . $placeholders . ")");
            if (!$stmt_check_packaging_types) throw new Exception("Prepare failed for packaging type check: " . $conn->error);
            $stmt_check_packaging_types->bind_param($bind_types_pkg, ...$unique_packaging_type_ids);
            $stmt_check_packaging_types->execute();
            if ($stmt_check_packaging_types->get_result()->fetch_row()[0] !== count($unique_packaging_type_ids)) {
                print_failure("Error: One or more provided Packaging Type IDs for items do not exist.");
            }
            $stmt_check_packaging_types->close();
        }


        // ✅ FIX: This entire block is now simplified and correct.
        // 1. Update `purchase_orders` table
        if (!empty($update_po_fields)) {
            $sql_po_update = "UPDATE purchase_orders SET " . implode(", ", $update_po_fields) . ", purchase_orders_updated_at = NOW() WHERE purchase_orders_id = ?";
            
            // Add the type and value for the WHERE clause to our arrays
            $bind_po_types .= "i"; 
            $bind_po_params[] = $purchase_orders_id;

            $stmt_po_update = $conn->prepare($sql_po_update);
            if (!$stmt_po_update) throw new Exception("Prepare failed for PO update: " . $conn->error);
            
            // Use the splat operator (...) to bind the parameters from the array (requires PHP 5.6+).
            $stmt_po_update->bind_param($bind_po_types, ...$bind_po_params);
            
            if (!$stmt_po_update->execute()) {
                throw new Exception("Error updating purchase order: " . $stmt_po_update->error);
            }
            
            if ($stmt_po_update->affected_rows === 0) {
                $stmt_check_po_exists = $conn->prepare("SELECT purchase_orders_id FROM purchase_orders WHERE purchase_orders_id = ? LIMIT 1");
                if (!$stmt_check_po_exists) throw new Exception("Prepare failed to verify PO existence: " . $conn->error);
                $stmt_check_po_exists->bind_param("i", $purchase_orders_id);
                $stmt_check_po_exists->execute();
                if ($stmt_check_po_exists->get_result()->num_rows === 0) {
                    $conn->rollback();
                    print_failure("Error: Purchase Order with ID " . $purchase_orders_id . " not found for update.");
                }
                $stmt_check_po_exists->close();
            }
            $stmt_po_update->close();
        }

        // 2. Manage `purchase_order_items`
        if ($items_data_provided) {
            // Get current items for this PO to identify deletions
            $stmt_get_existing_po_items = $conn->prepare("SELECT purchase_order_items_id FROM purchase_order_items WHERE purchase_order_items_purchase_order_id = ?");
            if (!$stmt_get_existing_po_items) throw new Exception("Prepare failed to get existing PO items: " . $conn->error);
            $stmt_get_existing_po_items->bind_param("i", $purchase_orders_id);
            $stmt_get_existing_po_items->execute();
            $result_existing_po_items = $stmt_get_existing_po_items->get_result();
            $current_po_item_ids_in_db = [];
            while($row = $result_existing_po_items->fetch_assoc()) {
                $current_po_item_ids_in_db[] = $row['purchase_order_items_id'];
            }
            $stmt_get_existing_po_items->close();

            $po_items_to_keep_ids = [];
            foreach ($processed_po_items as $item) {
                if (isset($item['purchase_order_items_id'])) {
                    $po_items_to_keep_ids[] = (int)$item['purchase_order_items_id'];
                }
            }
            $po_items_to_delete = array_diff($current_po_item_ids_in_db, $po_items_to_keep_ids);

            // Delete PO items that are no longer in the request
            if (!empty($po_items_to_delete)) {
                $placeholders_delete = implode(',', array_fill(0, count($po_items_to_delete), '?'));
                $bind_types_delete = str_repeat('i', count($po_items_to_delete));
                $sql_delete_po_items = "DELETE FROM purchase_order_items WHERE purchase_order_items_id IN (" . $placeholders_delete . ")";
                $stmt_delete_po_items = $conn->prepare($sql_delete_po_items);
                if (!$stmt_delete_po_items) throw new Exception("Prepare failed for deleting PO items: " . $conn->error);
                $stmt_delete_po_items->bind_param($bind_types_delete, ...$po_items_to_delete);
                if (!$stmt_delete_po_items->execute()) throw new Exception("Error deleting PO items: " . $stmt_delete_po_items->error);
                $stmt_delete_po_items->close();
            }

            // Prepare statements for insert and update of PO items
            $stmt_po_item_insert = $conn->prepare("
                INSERT INTO purchase_order_items (
                    purchase_order_items_purchase_order_id, purchase_order_items_variant_id, 
                    purchase_order_items_packaging_type_id, purchase_order_items_quantity_ordered, 
                    purchase_order_items_quantity_received, purchase_order_items_unit_cost, 
                    purchase_order_items_discount_amount, purchase_order_items_tax_rate, purchase_order_items_has_tax,
                    purchase_order_items_total_cost, purchase_order_items_notes,
                    purchase_order_items_created_at, purchase_order_items_updated_at
                ) VALUES (?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            if (!$stmt_po_item_insert) throw new Exception("Prepare failed for PO item insert: " . $conn->error);

            $stmt_po_item_update = $conn->prepare("
                UPDATE purchase_order_items SET
                    purchase_order_items_variant_id = ?, 
                    purchase_order_items_packaging_type_id = ?, 
                    purchase_order_items_quantity_ordered = ?, 
                    purchase_order_items_unit_cost = ?, 
                    purchase_order_items_discount_amount = ?, 
                    purchase_order_items_tax_rate = ?, 
                    purchase_order_items_has_tax = ?, 
                    purchase_order_items_total_cost = ?, 
                    purchase_order_items_notes = ?,
                    purchase_order_items_updated_at = NOW()
                WHERE purchase_order_items_id = ? AND purchase_order_items_purchase_order_id = ?
            ");
            if (!$stmt_po_item_update) throw new Exception("Prepare failed for PO item update: " . $conn->error);

            foreach ($processed_po_items as $item) {
                $item_notes_val = $item['notes'] ?? null;
                if ($item_notes_val === "") {$item_notes_val = null;}

                if ($item['purchase_order_items_id'] === null) { // New item
                    $stmt_po_item_insert->bind_param("iiidddidds", 
                        $purchase_orders_id, 
                        $item['variant_id'], 
                        $item['packaging_type_id'], 
                        $item['quantity_ordered'], 
                        $item['unit_cost'], 
                        $item['discount_amount'],
                        $item['tax_rate'],
                        $item['has_tax'],
                        $item['total_cost'], 
                        $item_notes_val
                    );
                    if (!$stmt_po_item_insert->execute()) {
                        throw new Exception("Error inserting new PO item for variant ID " . $item['variant_id'] . ": " . $stmt_po_item_insert->error);
                    }
                } else { // Existing item
                    $stmt_po_item_update->bind_param("iidddidsii", 
                        $item['variant_id'], 
                        $item['packaging_type_id'], 
                        $item['quantity_ordered'], 
                        $item['unit_cost'], 
                        $item['discount_amount'],
                        $item['tax_rate'],
                        $item['has_tax'],
                        $item['total_cost'], 
                        $item_notes_val,
                        $item['purchase_order_items_id'],
                        $purchase_orders_id
                    );
                    if (!$stmt_po_item_update->execute()) {
                        throw new Exception("Error updating PO item ID " . $item['purchase_order_items_id'] . ": " . $stmt_po_item_update->error);
                    }
                }
            }
            $stmt_po_item_insert->close();
            $stmt_po_item_update->close();
        }

        // 3. Adjust supplier's balance based on status and amount changes
        $should_add_new = !in_array($new_status_effective, ['Draft', 'Cancelled']);
        $was_added_old = !in_array($old_status, ['Draft', 'Cancelled']);

        if ($should_add_new && !$was_added_old) {
            // Status changed to non-Draft/non-Cancelled: Add new total
            $stmt_update_supplier_balance = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance + ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance) throw new Exception("Prepare failed for supplier balance addition: " . $conn->error);
            $stmt_update_supplier_balance->bind_param("di", $new_total_amount_effective, $new_supplier_id_effective);
            if (!$stmt_update_supplier_balance->execute()) throw new Exception("Error adding supplier balance: " . $stmt_update_supplier_balance->error);
            $stmt_update_supplier_balance->close();

        } elseif (!$should_add_new && $was_added_old) {
            // Status changed to Draft/Cancelled: Subtract old total back
            $stmt_update_supplier_balance = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance - ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance) throw new Exception("Prepare failed for supplier balance deduction: " . $conn->error);
            $stmt_update_supplier_balance->bind_param("di", $old_total_amount, $old_supplier_id);
            if (!$stmt_update_supplier_balance->execute()) throw new Exception("Error deducting supplier balance back: " . $stmt_update_supplier_balance->error);
            $stmt_update_supplier_balance->close();

        } elseif ($should_add_new && $was_added_old && 
                  ($new_total_amount_effective != $old_total_amount || $new_supplier_id_effective != $old_supplier_id)) {
            // Status remains active, but total amount or supplier changed: Revert old, then add new
            $stmt_update_supplier_balance_revert = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance - ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance_revert) throw new Exception("Prepare failed for supplier balance revert: " . $conn->error);
            $stmt_update_supplier_balance_revert->bind_param("di", $old_total_amount, $old_supplier_id);
            if (!$stmt_update_supplier_balance_revert->execute()) throw new Exception("Error reverting old supplier balance: " . $stmt_update_supplier_balance_revert->error);
            $stmt_update_supplier_balance_revert->close();

            $stmt_update_supplier_balance_add = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance + ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance_add) throw new Exception("Prepare failed for supplier balance new addition: " . $conn->error);
            $stmt_update_supplier_balance_add->bind_param("di", $new_total_amount_effective, $new_supplier_id_effective);
            if (!$stmt_update_supplier_balance_add->execute()) throw new Exception("Error adding new supplier balance: " . $stmt_update_supplier_balance_add->error);
            $stmt_update_supplier_balance_add->close();
        }

        $conn->commit();
        print_success("Purchase Order updated successfully.", ['purchase_orders_id' => $purchase_orders_id, 'total_amount' => $new_total_amount_effective, 'items_count' => count($processed_po_items)]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    } finally {
        if (isset($conn) && $conn->thread_id) {
            $conn->close();
        }
    }

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn->thread_id) {
       $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn->thread_id) {
        $conn->close();
    }
}
?>