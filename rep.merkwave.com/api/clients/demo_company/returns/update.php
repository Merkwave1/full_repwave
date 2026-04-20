<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $returns_id             = $_POST['returns_id']             ?? null;
    $returns_client_id      = $_POST['returns_client_id']      ?? null;
    $returns_invoice_id     = $_POST['returns_invoice_id']     ?? null;
    $returns_date           = $_POST['returns_date']           ?? null;
    $returns_reason         = $_POST['returns_reason']         ?? null;
    $returns_status         = $_POST['returns_status']         ?? null;
    $returns_notes          = $_POST['returns_notes']          ?? null;
    $return_items           = json_decode($_POST['return_items'] ?? '[]', true); 

    // Handle empty strings for nullable fields
    if (array_key_exists('returns_invoice_id', $_POST) && $_POST['returns_invoice_id'] === "") {$returns_invoice_id = null;}
    if (array_key_exists('returns_reason', $_POST) && $_POST['returns_reason'] === "") {$returns_reason = null;}
    if (array_key_exists('returns_notes', $_POST) && $_POST['returns_notes'] === "") {$returns_notes = null;}

    // Basic Validation
    if (empty($returns_id) || !is_numeric($returns_id) || $returns_id <= 0) {
        print_failure("Error: Valid Return ID is required for update.");
        exit;
    }

    $conn->begin_transaction();

    try {
        // Fetch current return data for comparison and balance adjustment
        $stmt_fetch_current = $conn->prepare("
            SELECT returns_client_id, returns_invoice_id, returns_total_amount, returns_status
            FROM returns
            WHERE returns_id = ?
        ");
        if (!$stmt_fetch_current) {
            throw new Exception("Prepare failed to fetch current return: " . $conn->error);
        }
        $stmt_fetch_current->bind_param("i", $returns_id);
        $stmt_fetch_current->execute();
        $result_current = $stmt_fetch_current->get_result();
        $current_return_data = $result_current->fetch_assoc();
        $stmt_fetch_current->close();

        if (!$current_return_data) {
            $conn->rollback();
            print_failure("Error: Return with ID " . $returns_id . " not found.");
            exit;
        }

        $old_client_id = (int)$current_return_data['returns_client_id'];
        $old_invoice_id = (int)$current_return_data['returns_invoice_id'];
        $old_total_amount = (float)$current_return_data['returns_total_amount'];
        $old_status = $current_return_data['returns_status'];

        $update_return_fields = [];
        $bind_return_types = "";
        $bind_return_params = [];

        $new_client_id_for_balance = $old_client_id; 
        $new_total_amount_for_balance = $old_total_amount; 
        $new_status_for_balance = $old_status; 
        $new_invoice_id_for_validation = $old_invoice_id; // For item validation below

        if (!empty($returns_client_id) && is_numeric($returns_client_id) && $returns_client_id > 0) {
            $update_return_fields[] = "returns_client_id = ?";
            $bind_return_types .= "i";
            $bind_return_params[] = $returns_client_id;
            $new_client_id_for_balance = (int)$returns_client_id;
        } else if (isset($_POST['returns_client_id']) && ($returns_client_id === '' || $returns_client_id <= 0)) {
            print_failure("Error: Invalid client ID.");
            exit;
        }

        if (array_key_exists('returns_invoice_id', $_POST)) {
            if ($returns_invoice_id !== null && (!is_numeric($returns_invoice_id) || $returns_invoice_id <= 0)) {
                print_failure("Error: Invalid Invoice ID.");
                exit;
            }
            $update_return_fields[] = "returns_invoice_id = ?";
            $bind_return_types .= "i";
            $bind_return_params[] = $returns_invoice_id;
            $new_invoice_id_for_validation = (int)$returns_invoice_id; // Update for item validation
        }

        if (!empty($returns_date) && strtotime($returns_date)) {
            $update_return_fields[] = "returns_date = ?";
            $bind_return_types .= "s";
            $bind_return_params[] = $returns_date;
        } else if (isset($_POST['returns_date']) && $returns_date === '') {
            print_failure("Error: Invalid return date format.");
            exit;
        }

        if (array_key_exists('returns_reason', $_POST)) {
            $update_return_fields[] = "returns_reason = ?";
            $bind_return_types .= "s";
            $bind_return_params[] = $returns_reason;
        }

        if (!empty($returns_status) && in_array($returns_status, ['Pending', 'Processed', 'Refunded', 'Cancelled'])) {
            $update_return_fields[] = "returns_status = ?";
            $bind_return_types .= "s";
            $bind_return_params[] = $returns_status;
            $new_status_for_balance = $returns_status; 
        } else if (isset($_POST['returns_status']) && $returns_status === '') {
            print_failure("Error: Invalid return status.");
            exit;
        }

        if (array_key_exists('returns_notes', $_POST)) {
            $update_return_fields[] = "returns_notes = ?";
            $bind_return_types .= "s";
            $bind_return_params[] = $returns_notes;
        }

        $items_provided = false;
        $processed_return_items = []; // To store items with fetched prices and validated quantities

        if (array_key_exists('return_items', $_POST)) { // Check if return_items was even sent
            $items_provided = true;
            if (!is_array($return_items)) {
                print_failure("Error: return_items must be an array.");
                exit;
            }

            $calculated_total_amount = 0.00;
            $original_invoice_items = [];

            // Re-fetch original invoice items if invoice ID changed or if not fetched before
            if ($new_invoice_id_for_validation !== null) {
                $stmt_invoice_check = $conn->prepare("
                    SELECT invoices_client_id, invoices_status
                    FROM invoices
                    WHERE invoices_id = ?
                    LIMIT 1
                ");
                if (!$stmt_invoice_check) throw new Exception("Prepare failed for invoice check: " . $conn->error);
                $stmt_invoice_check->bind_param("i", $new_invoice_id_for_validation);
                $stmt_invoice_check->execute();
                $result_invoice_check = $stmt_invoice_check->get_result();
                $invoice_data = $result_invoice_check->fetch_assoc();
                $stmt_invoice_check->close();

                if (!$invoice_data) {
                    print_failure("Error: Linked Invoice with ID " . $new_invoice_id_for_validation . " not found.");
                    exit;
                }
                if ($invoice_data['invoices_client_id'] != $new_client_id_for_balance) {
                    print_failure("Error: Linked Invoice does not belong to the specified client.");
                    exit;
                }
                if ($invoice_data['invoices_status'] !== 'Confirmed') {
                    print_failure("Error: Returns can only be linked to 'Confirmed' invoices.");
                    exit;
                }

                $stmt_original_items = $conn->prepare("
                    SELECT invoice_items_products_id, invoice_items_quantity, invoice_items_unit_price
                    FROM invoice_items
                    WHERE invoice_items_invoice_id = ?
                ");
                if (!$stmt_original_items) throw new Exception("Prepare failed for original invoice items fetch: " . $conn->error);
                $stmt_original_items->bind_param("i", $new_invoice_id_for_validation);
                $stmt_original_items->execute();
                $result_original_items = $stmt_original_items->get_result();
                while ($row = $result_original_items->fetch_assoc()) {
                    $original_invoice_items[$row['invoice_items_products_id']] = [
                        'quantity' => (float)$row['invoice_items_quantity'],
                        'unit_price' => (float)$row['invoice_items_unit_price']
                    ];
                }
                $stmt_original_items->close();

                if (empty($original_invoice_items) && !empty($return_items)) { // If items are provided but invoice has none
                    print_failure("Error: Linked invoice has no items, but return items were provided.");
                    exit;
                }
            } else if (!empty($return_items)) { // Items provided but no invoice linked
                 print_failure("Error: Return items provided but no invoice ID linked.");
                 exit;
            }


            foreach ($return_items as $item) {
                if (empty($item['products_id']) || !is_numeric($item['products_id']) || $item['products_id'] <= 0 ||
                    empty($item['quantity']) || !is_numeric($item['quantity']) || $item['quantity'] <= 0) {
                    print_failure("Error: Invalid item data (product ID or quantity).");
                    exit;
                }

                $current_product_id = $item['products_id'];
                $returned_quantity = (float)$item['quantity'];
                $fetched_unit_price = 0.00; 

                // Validate against original invoice item quantity if an invoice is linked
                if ($new_invoice_id_for_validation !== null) {
                    if (!isset($original_invoice_items[$current_product_id])) {
                        print_failure("Error: Product ID " . $current_product_id . " is not found in the linked invoice.");
                        exit;
                    }
                    $original_qty = $original_invoice_items[$current_product_id]['quantity'];
                    $fetched_unit_price = $original_invoice_items[$current_product_id]['unit_price'];

                    // Calculate already returned quantity for this product on this invoice, EXCLUDING current return's items
                    $stmt_already_returned = $conn->prepare("
                        SELECT SUM(ri.return_items_quantity) AS total_returned
                        FROM returns r
                        JOIN return_items ri ON r.returns_id = ri.return_items_return_id
                        WHERE r.returns_invoice_id = ? AND ri.return_items_products_id = ?
                        AND r.returns_id != ? -- Exclude the current return being updated
                        AND r.returns_status IN ('Pending', 'Processed', 'Refunded') 
                    ");
                    if (!$stmt_already_returned) throw new Exception("Prepare failed for already returned quantity: " . $conn->error);
                    $stmt_already_returned->bind_param("iii", $new_invoice_id_for_validation, $current_product_id, $returns_id);
                    $stmt_already_returned->execute();
                    $result_already_returned = $stmt_already_returned->get_result();
                    $row_already_returned = $result_already_returned->fetch_assoc();
                    $already_returned_qty = (float)$row_already_returned['total_returned'];
                    $stmt_already_returned->close();

                    $available_for_return = $original_qty - $already_returned_qty;

                    if ($returned_quantity > $available_for_return) {
                        print_failure("Error: Quantity for product ID " . $current_product_id . " exceeds available quantity from invoice (Available: " . $available_for_return . ").");
                        exit;
                    }
                } else {
                    // If no invoice linked, fetch price directly from products table
                    $stmt_product_price = $conn->prepare("
                        SELECT products_unit_price
                        FROM products
                        WHERE products_id = ?
                        LIMIT 1
                    ");
                    if (!$stmt_product_price) throw new Exception("Prepare failed for product price fetch: " . $conn->error);
                    $stmt_product_price->bind_param("i", $current_product_id);
                    $stmt_product_price->execute();
                    $result_product_price = $stmt_product_price->get_result();

                    if ($result_product_price->num_rows === 0) {
                        print_failure("Error: Product with ID " . $current_product_id . " not found.");
                        exit;
                    }
                    $product_data = $result_product_price->fetch_assoc();
                    $fetched_unit_price = (float)$product_data['products_unit_price'];
                    $stmt_product_price->close();
                }

                $item_total = $returned_quantity * $fetched_unit_price;
                $calculated_total_amount += $item_total;

                $processed_return_items[] = [
                    'products_id' => $current_product_id,
                    'quantity' => $returned_quantity,
                    'unit_price' => $fetched_unit_price, 
                    'total_price' => $item_total,
                    'notes' => $item['notes'] ?? null 
                ];
            }
            $update_return_fields[] = "returns_total_amount = ?";
            $bind_return_types .= "d";
            $bind_return_params[] = $calculated_total_amount;
            $new_total_amount_for_balance = $calculated_total_amount; 

        } else if (!array_key_exists('return_items', $_POST) && empty($update_return_fields)) {
            print_failure("Error: No valid fields or return items provided for update.");
            exit;
        }

        // Update main return details
        if (!empty($update_return_fields)) {
            $sql_return = "UPDATE returns SET " . implode(", ", $update_return_fields) . ", returns_updated_at = NOW() WHERE returns_id = ?";
            $bind_return_types .= "i"; 
            $bind_return_params[] = $returns_id;

            $stmt_return_update = $conn->prepare($sql_return);
            if (!$stmt_return_update) {
                throw new Exception("Prepare failed for return update: " . $conn->error);
            }
            $stmt_return_update->bind_param($bind_return_types, ...$bind_return_params);
            if (!$stmt_return_update->execute()) {
                throw new Exception("Error updating return: " . $stmt_return_update->error);
            }
            $stmt_return_update->close();
        }

        // Update return items if provided
        if ($items_provided) {
            // 1. Delete all existing items for this return
            $stmt_delete_items = $conn->prepare("DELETE FROM return_items WHERE return_items_return_id = ?");
            if (!$stmt_delete_items) {
                throw new Exception("Prepare failed for deleting old return items: " . $conn->error);
            }
            $stmt_delete_items->bind_param("i", $returns_id);
            if (!$stmt_delete_items->execute()) {
                throw new Exception("Error deleting old return items: " . $stmt_delete_items->error);
            }
            $stmt_delete_items->close();

            // 2. Insert new items
            if (!empty($processed_return_items)) {
                $stmt_item_insert = $conn->prepare("
                    INSERT INTO return_items (
                        return_items_return_id, return_items_products_id, return_items_quantity, 
                        return_items_unit_price, return_items_total_price, return_items_notes,
                        return_items_created_at, return_items_updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                ");

                if (!$stmt_item_insert) {
                    throw new Exception("Prepare failed for new return item insert: " . $conn->error);
                }

                foreach ($processed_return_items as $item) {
                    $stmt_item_insert->bind_param("iiddds", 
                        $returns_id, $item['products_id'], $item['quantity'], 
                        $item['unit_price'], $item['total_price'], $item['notes']
                    );
                    if (!$stmt_item_insert->execute()) {
                        throw new Exception("Error inserting new return item for product ID " . $item['products_id'] . ": " . $stmt_item_insert->error);
                    }
                }
                $stmt_item_insert->close();
            }
        }

        // Adjust client credit balance based on status and amount changes
        $should_add_new = ($new_status_for_balance === 'Refunded');
        $was_added_old = ($old_status === 'Refunded');

        // Case 1: Status changed to Refunded (and wasn't before)
        if ($should_add_new && !$was_added_old) {
            $stmt_update_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance + ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance) throw new Exception("Prepare failed for balance addition: " . $conn->error);
            $stmt_update_balance->bind_param("di", $new_total_amount_for_balance, $new_client_id_for_balance);
            if (!$stmt_update_balance->execute()) throw new Exception("Error adding balance: " . $stmt_update_balance->error);
            $stmt_update_balance->close();

        // Case 2: Status changed from Refunded (and was before)
        } elseif (!$should_add_new && $was_added_old) {
            $stmt_update_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance - ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance) throw new Exception("Prepare failed for balance deduction: " . $conn->error);
            $stmt_update_balance->bind_param("di", $old_total_amount, $old_client_id);
            if (!$stmt_update_balance->execute()) throw new Exception("Error deducting balance back: " . $stmt_update_balance->error);
            $stmt_update_balance->close();

        // Case 3: Status remains Refunded, but total amount or client changed
        } elseif ($should_add_new && $was_added_old && 
                  ($new_total_amount_for_balance != $old_total_amount || $new_client_id_for_balance != $old_client_id)) {
            
            // Revert old amount from old client's balance
            $stmt_update_balance_revert = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance - ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance_revert) throw new Exception("Prepare failed for balance revert: " . $conn->error);
            $stmt_update_balance_revert->bind_param("di", $old_total_amount, $old_client_id);
            if (!$stmt_update_balance_revert->execute()) throw new Exception("Error reverting old balance: " . $stmt_update_balance_revert->error);
            $stmt_update_balance_revert->close();

            // Apply new amount to new/same client's balance
            $stmt_update_balance_add = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance + ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance_add) throw new Exception("Prepare failed for balance new addition: " . $conn->error);
            $stmt_update_balance_add->bind_param("di", $new_total_amount_for_balance, $new_client_id_for_balance);
            if (!$stmt_update_balance_add->execute()) throw new Exception("Error adding new balance: " . $stmt_update_balance_add->error);
            $stmt_update_balance_add->close();
        }

        $conn->commit();
        print_success("Return updated successfully.", ['returns_id' => $returns_id, 'total_amount' => $new_total_amount_for_balance]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>