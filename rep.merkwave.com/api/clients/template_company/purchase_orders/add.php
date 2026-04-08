<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    // Get UUID from headers or POST data  
    $headers = getallheaders();
    $uuid = $headers['User-UUID'] ?? $headers['x-user-uuid'] ?? null;
    
    // If not in headers, try to get from POST data
    if (!$uuid) {
        $uuid = $_POST['users_uuid'] ?? null;
    }
    
    if (!$uuid) {
        echo json_encode(['status' => 'error', 'message' => 'UUID is required']);
        exit;
    }

    // Get user info by UUID
    $user_stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
    if (!$user_stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Database prepare failed']);
        exit;
    }
    
    $user_stmt->bind_param("s", $uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    $user_data = $user_result->fetch_assoc();
    $user_stmt->close();

    if (!$user_data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid user UUID']);
        exit;
    }

    $user_id = $user_data['users_id'];

    $purchase_orders_supplier_id          = $_POST['purchase_orders_supplier_id']          ?? null;
    $purchase_orders_warehouse_id         = $_POST['purchase_orders_warehouse_id']         ?? null; // New required field
    $purchase_orders_order_date           = $_POST['purchase_orders_order_date']           ?? date('Y-m-d H:i:s');
    $purchase_orders_expected_delivery_date = $_POST['purchase_orders_expected_delivery_date'] ?? null;
    $purchase_orders_status               = $_POST['purchase_orders_status']               ?? 'Draft';
    $purchase_orders_notes                = $_POST['purchase_orders_notes']                ?? null;
    $purchase_orders_order_discount       = isset($_POST['purchase_orders_order_discount']) && is_numeric($_POST['purchase_orders_order_discount']) ? (float)$_POST['purchase_orders_order_discount'] : 0.00;
    if ($purchase_orders_order_discount < 0) { $purchase_orders_order_discount = 0.00; }
    $purchase_order_items_data            = json_decode($_POST['purchase_order_items'] ?? '[]', true); // Array of items

    // Handle empty strings for nullable fields
    if ($purchase_orders_expected_delivery_date === "") {$purchase_orders_expected_delivery_date = null;}
    if ($purchase_orders_notes === "") {$purchase_orders_notes = null;}

    // Basic Validation
    if (empty($purchase_orders_supplier_id) || !is_numeric($purchase_orders_supplier_id) || $purchase_orders_supplier_id <= 0) {
        print_failure("Error: Valid Supplier ID is required.");
    }
    if (empty($purchase_orders_warehouse_id) || !is_numeric($purchase_orders_warehouse_id) || $purchase_orders_warehouse_id <= 0) {
        print_failure("Error: Valid Warehouse ID is required for the purchase order.");
    }
    if (!strtotime($purchase_orders_order_date)) {
        print_failure("Error: Invalid order date format.");
    }
    if ($purchase_orders_expected_delivery_date !== null && !strtotime($purchase_orders_expected_delivery_date)) {
        print_failure("Error: Invalid expected delivery date format.");
    }
    if (!in_array($purchase_orders_status, ['Draft', 'Ordered', 'Shipped', 'Received', 'Partially Received', 'Cancelled'])) {
        print_failure("Error: Invalid purchase order status.");
    }
    if (empty($purchase_order_items_data) || !is_array($purchase_order_items_data)) {
        print_failure("Error: At least one purchase order item is required.");
    }

    $calculated_total_amount = 0.00;
    $processed_po_items = [];

    foreach ($purchase_order_items_data as $index => $item) {
        // Removed warehouse_id from item validation as it's now on the PO level
        if (empty($item['variant_id']) || !is_numeric($item['variant_id']) || $item['variant_id'] <= 0 ||
            empty($item['quantity_ordered']) || !is_numeric($item['quantity_ordered']) || $item['quantity_ordered'] <= 0 ||
            empty($item['unit_cost']) || !is_numeric($item['unit_cost']) || $item['unit_cost'] < 0) {
            print_failure("Error: Invalid item data (variant ID, quantity, or unit cost) for item #" . ($index + 1) . ".");
        }
        
        // Simplified calculation: quantity * unit_cost (no item-level discount/tax)
        $item_total_cost = (float)$item['quantity_ordered'] * (float)$item['unit_cost'];
        $calculated_total_amount += $item_total_cost;

        // Fetch product_id and products_unit_of_measure_id for compatibility validation
        $stmt_check_variant = $conn->prepare("
            SELECT pv.variant_products_id, p.products_unit_of_measure_id
            FROM product_variants pv
            JOIN products p ON pv.variant_products_id = p.products_id
            WHERE pv.variant_id = ? LIMIT 1
        ");
        if (!$stmt_check_variant) throw new Exception("Prepare failed for variant check: " . $conn->error);
        $stmt_check_variant->bind_param("i", $item['variant_id']);
        $stmt_check_variant->execute();
        $variant_product_data = $stmt_check_variant->get_result()->fetch_assoc();
        $stmt_check_variant->close();

        if (!$variant_product_data) {
            print_failure("Error: Variant ID " . $item['variant_id'] . " for item #" . ($index + 1) . " is invalid or does not exist.");
        }
        $product_base_uom_id = (int)$variant_product_data['products_unit_of_measure_id'];

        // Validate packaging_type_id if provided
        $packaging_type_id_val = $item['packaging_type_id'] ?? null;
        if ($packaging_type_id_val === "") {$packaging_type_id_val = null;}

        if ($packaging_type_id_val !== null) {
            if (!is_numeric($packaging_type_id_val) || $packaging_type_id_val <= 0) {
                print_failure("Error: Invalid Packaging Type ID for item #" . ($index + 1) . ".");
            }
            $stmt_check_packaging_type = $conn->prepare("
                SELECT packaging_types_id, packaging_types_compatible_base_unit_id
                FROM packaging_types
                WHERE packaging_types_id = ? LIMIT 1
            ");
            if (!$stmt_check_packaging_type) throw new Exception("Prepare failed for packaging type check: " . $conn->error);
            $stmt_check_packaging_type->bind_param("i", $packaging_type_id_val);
            $stmt_check_packaging_type->execute();
            $pkg_data = $stmt_check_packaging_type->get_result()->fetch_assoc();
            $stmt_check_packaging_type->close();

            if (!$pkg_data) {
                print_failure("Error: Packaging Type ID " . $packaging_type_id_val . " for item #" . ($index + 1) . " does not exist.");
            }
            if ((int)$pkg_data['packaging_types_compatible_base_unit_id'] !== $product_base_uom_id) {
                print_failure("Error: Packaging type ID " . $packaging_type_id_val . " is not compatible with product's base unit of measure for item #" . ($index + 1) . ".");
            }
        }

        $processed_po_items[] = [
            'variant_id' => (int)$item['variant_id'],
            'packaging_type_id' => $packaging_type_id_val,
            'quantity_ordered' => (float)$item['quantity_ordered'],
            'unit_cost' => (float)$item['unit_cost'],
            'discount_amount' => 0.00, // Set to 0 as no item-level discount
            'tax_rate' => 0.00,        // Set to 0 as no item-level tax
            'has_tax' => 0,            // Set to 0 as no item-level tax
            'total_cost' => $item_total_cost,
            'notes' => $item['item_notes'] ?? $item['notes'] ?? null,
        ];
    }

    // Add discount note to order notes if discount exists
    if ($purchase_orders_order_discount > 0) {
        $discount_note_text = "Order Discount: " . number_format($purchase_orders_order_discount,2,'.','');
        if ($purchase_orders_notes) {
            $purchase_orders_notes .= "\n" . $discount_note_text;
        } else {
            $purchase_orders_notes = $discount_note_text;
        }
    }

    $conn->begin_transaction();

    try {
        // Check if supplier exists
        $stmt_check_supplier = $conn->prepare("SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1");
        if (!$stmt_check_supplier) throw new Exception("Prepare failed for supplier check: " . $conn->error);
        $stmt_check_supplier->bind_param("i", $purchase_orders_supplier_id);
        $stmt_check_supplier->execute();
        if ($stmt_check_supplier->get_result()->num_rows === 0) {
            print_failure("Error: Supplier ID " . $purchase_orders_supplier_id . " does not exist.");
        }
        $stmt_check_supplier->close();

        // Check if purchase_orders_warehouse_id exists
        $stmt_check_warehouse = $conn->prepare("SELECT warehouse_id FROM warehouse WHERE warehouse_id = ? LIMIT 1");
        if (!$stmt_check_warehouse) throw new Exception("Prepare failed for warehouse check: " . $conn->error);
        $stmt_check_warehouse->bind_param("i", $purchase_orders_warehouse_id);
        $stmt_check_warehouse->execute();
        if ($stmt_check_warehouse->get_result()->num_rows === 0) {
            print_failure("Error: Warehouse ID " . $purchase_orders_warehouse_id . " for the purchase order does not exist.");
        }
        $stmt_check_warehouse->close();

        // Apply order-level discount to the calculated total (apply once only)
        $final_total_amount = max(0.00, $calculated_total_amount - $purchase_orders_order_discount);

        // 1. Insert into `purchase_orders` table
        $stmt_po = $conn->prepare("
            INSERT INTO purchase_orders (
                purchase_orders_supplier_id, purchase_orders_warehouse_id, purchase_orders_order_date, purchase_orders_expected_delivery_date, 
                purchase_orders_total_amount, purchase_orders_order_discount, purchase_orders_status, purchase_orders_notes,
                purchase_orders_created_at, purchase_orders_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_po) {
            throw new Exception("Prepare failed for PO insert: " . $conn->error);
        }

        // Bind types: i i s s d d s s
        $stmt_po->bind_param("iissddss", 
            $purchase_orders_supplier_id, 
            $purchase_orders_warehouse_id, 
            $purchase_orders_order_date, 
            $purchase_orders_expected_delivery_date, 
            $final_total_amount, 
            $purchase_orders_order_discount,
            $purchase_orders_status, 
            $purchase_orders_notes
        );

        if (!$stmt_po->execute()) {
            throw new Exception("Error inserting purchase order: " . $stmt_po->error);
        }

        $new_po_id = $stmt_po->insert_id;
        $stmt_po->close();

        // 2. Insert into `purchase_order_items` table
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

        if (!$stmt_po_item_insert) {
            throw new Exception("Prepare failed for PO item insert: " . $conn->error);
        }

        foreach ($processed_po_items as $item) {
            $item_notes_val = $item['notes'] ?? null;
            if ($item_notes_val === "") {$item_notes_val = null;}

            $stmt_po_item_insert->bind_param("iiidddidds", 
                $new_po_id, 
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
                throw new Exception("Error inserting purchase order item for variant ID " . $item['variant_id'] . ": " . $stmt_po_item_insert->error);
            }
        }
        $stmt_po_item_insert->close();

        // 3. Update supplier's balance if PO status is not 'Draft' or 'Cancelled'
        if (!in_array($purchase_orders_status, ['Draft', 'Cancelled'])) {
            $stmt_update_supplier_balance = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance + ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance) throw new Exception("Prepare failed for supplier balance update: " . $conn->error);
            $stmt_update_supplier_balance->bind_param("di", $final_total_amount, $purchase_orders_supplier_id);
            if (!$stmt_update_supplier_balance->execute()) throw new Exception("Error updating supplier balance: " . $stmt_update_supplier_balance->error);
            $stmt_update_supplier_balance->close();
        }

        $conn->commit();
        print_success("Purchase Order created successfully.", ['purchase_orders_id' => $new_po_id, 'total_amount' => $final_total_amount, 'order_discount' => $purchase_orders_order_discount, 'items_count' => count($processed_po_items)]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    } finally {
        if (isset($conn) && $conn !== false) {
            $conn->close();
        }
    }
} catch (Exception | TypeError $e) {
    $conn->rollback();
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }

}
?>
