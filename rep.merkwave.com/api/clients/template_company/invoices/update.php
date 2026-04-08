<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $invoices_id             = $_POST['invoices_id']             ?? null;
    $invoices_client_id      = $_POST['invoices_client_id']      ?? null; // Optional update
    $invoices_date           = $_POST['invoices_date']           ?? null; // Optional update
    $invoices_due_date       = $_POST['invoices_due_date']       ?? null; // Optional update
    $invoices_expiration_date = $_POST['invoices_expiration_date'] ?? null; // Optional update
    $invoices_status         = $_POST['invoices_status']         ?? null; // Optional update
    $invoices_notes          = $_POST['invoices_notes']          ?? null; // Optional update
    $invoice_items           = json_decode($_POST['invoice_items'] ?? '[]', true); // Array of items

    // Handle empty strings for nullable fields
    if (array_key_exists('invoices_notes', $_POST) && $_POST['invoices_notes'] === "") {$invoices_notes = null;}
    if (array_key_exists('invoices_expiration_date', $_POST) && $_POST['invoices_expiration_date'] === "") {$invoices_expiration_date = null;}

    // Basic Validation
    if (empty($invoices_id) || !is_numeric($invoices_id) || $invoices_id <= 0) {
        print_failure("Error: Valid Invoice ID is required for update.");
    }

    $conn->begin_transaction();

    try {
        // Fetch current invoice data for comparison and balance adjustment
        $stmt_fetch_current = $conn->prepare("
            SELECT invoices_client_id, invoices_total_amount, invoices_status
            FROM invoices
            WHERE invoices_id = ?
        ");
        if (!$stmt_fetch_current) {
            throw new Exception("Prepare failed to fetch current invoice: " . $conn->error);
        }
        $stmt_fetch_current->bind_param("i", $invoices_id);
        $stmt_fetch_current->execute();
        $result_current = $stmt_fetch_current->get_result();
        $current_invoice_data = $result_current->fetch_assoc();
        $stmt_fetch_current->close();

        if (!$current_invoice_data) {
            $conn->rollback();
            print_failure("Error: Invoice with ID " . $invoices_id . " not found.");
        }

        $old_client_id = (int)$current_invoice_data['invoices_client_id'];
        $old_total_amount = (float)$current_invoice_data['invoices_total_amount'];
        $old_status = $current_invoice_data['invoices_status'];

        $update_invoice_fields = [];
        $bind_invoice_types = "";
        $bind_invoice_params = [];

        $new_client_id_for_balance = $old_client_id; // Default to old client ID
        $new_total_amount_for_balance = $old_total_amount; // Default to old total amount
        $new_status_for_balance = $old_status; // Default to old status

        if (!empty($invoices_client_id) && is_numeric($invoices_client_id) && $invoices_client_id > 0) {
            $update_invoice_fields[] = "invoices_client_id = ?";
            $bind_invoice_types .= "i";
            $bind_invoice_params[] = $invoices_client_id;
            $new_client_id_for_balance = (int)$invoices_client_id;
        } else if (isset($_POST['invoices_client_id']) && ($invoices_client_id === '' || $invoices_client_id <= 0)) {
            print_failure("Error: Invalid client ID.");
        }

        if (!empty($invoices_date) && strtotime($invoices_date)) {
            $update_invoice_fields[] = "invoices_date = ?";
            $bind_invoice_types .= "s";
            $bind_invoice_params[] = $invoices_date;
        } else if (isset($_POST['invoices_date']) && $invoices_date === '') {
            print_failure("Error: Invalid invoice date format.");
        }

        if (!empty($invoices_due_date) && strtotime($invoices_due_date)) {
            $update_invoice_fields[] = "invoices_due_date = ?";
            $bind_invoice_types .= "s";
            $bind_invoice_params[] = $invoices_due_date;
        } else if (isset($_POST['invoices_due_date']) && $invoices_due_date === '') {
            print_failure("Error: Due date cannot be empty.");
        }

        if (array_key_exists('invoices_expiration_date', $_POST)) {
            if ($invoices_expiration_date !== null && !strtotime($invoices_expiration_date)) {
                print_failure("Error: Invalid expiration date format.");
            }
            $update_invoice_fields[] = "invoices_expiration_date = ?";
            $bind_invoice_types .= "s";
            $bind_invoice_params[] = $invoices_expiration_date;
        }

        // Updated ENUM validation for invoices_status
        if (!empty($invoices_status) && in_array($invoices_status, ['Draft', 'Quotation', 'Confirmed', 'Cancelled'])) {
            $update_invoice_fields[] = "invoices_status = ?";
            $bind_invoice_types .= "s";
            $bind_invoice_params[] = $invoices_status;
            $new_status_for_balance = $invoices_status;
        } else if (isset($_POST['invoices_status']) && $invoices_status === '') {
            print_failure("Error: Invalid invoice status.");
        }

        if (array_key_exists('invoices_notes', $_POST)) {
            $update_invoice_fields[] = "invoices_notes = ?";
            $bind_invoice_types .= "s";
            $bind_invoice_params[] = $invoices_notes;
        }

        $items_provided = false;
        if (!empty($invoice_items) && is_array($invoice_items)) {
            $items_provided = true;
            $calculated_total_amount = 0.00;
            $processed_invoice_items = []; // To store items with fetched prices

            foreach ($invoice_items as $item) {
                if (empty($item['products_id']) || !is_numeric($item['products_id']) || $item['products_id'] <= 0 ||
                    empty($item['quantity']) || !is_numeric($item['quantity']) || $item['quantity'] <= 0) {
                    print_failure("Error: Invalid item data (product ID or quantity) in items array.");
                }
                // Fetch unit price from products table
                $stmt_product_price = $conn->prepare("
                    SELECT products_unit_price
                    FROM products
                    WHERE products_id = ?
                    LIMIT 1
                ");
                if (!$stmt_product_price) {
                    throw new Exception("Prepare failed for product price fetch: " . $conn->error);
                }
                $stmt_product_price->bind_param("i", $item['products_id']);
                $stmt_product_price->execute();
                $result_product_price = $stmt_product_price->get_result();

                if ($result_product_price->num_rows === 0) {
                    print_failure("Error: Product with ID " . $item['products_id'] . " not found.");
                }
                $product_data = $result_product_price->fetch_assoc();
                $fetched_unit_price = (float)$product_data['products_unit_price'];
                $stmt_product_price->close();

                $item_total = (float)$item['quantity'] * $fetched_unit_price;
                $calculated_total_amount += $item_total;

                $processed_invoice_items[] = [
                    'products_id' => $item['products_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $fetched_unit_price,
                    'total_price' => $item_total
                ];
            }
            $update_invoice_fields[] = "invoices_total_amount = ?";
            $bind_invoice_types .= "d";
            $bind_invoice_params[] = $calculated_total_amount;
            $new_total_amount_for_balance = $calculated_total_amount;
        } else if (array_key_exists('invoice_items', $_POST) && $_POST['invoice_items'] === '[]') {
            $items_provided = true;
            $calculated_total_amount = 0.00;
            $processed_invoice_items = [];
            $update_invoice_fields[] = "invoices_total_amount = ?";
            $bind_invoice_types .= "d";
            $bind_invoice_params[] = $calculated_total_amount;
            $new_total_amount_for_balance = $calculated_total_amount;
        }


        if (empty($update_invoice_fields) && !$items_provided) {
            print_failure("Error: No valid fields or invoice items provided for update.");
        }

        // Update main invoice details
        if (!empty($update_invoice_fields)) {
            $sql_invoice = "UPDATE invoices SET " . implode(", ", $update_invoice_fields) . ", invoices_updated_at = NOW() WHERE invoices_id = ?";
            $bind_invoice_types .= "i"; 
            $bind_invoice_params[] = $invoices_id;

            $stmt_invoice_update = $conn->prepare($sql_invoice);
            if (!$stmt_invoice_update) {
                throw new Exception("Prepare failed for invoice update: " . $conn->error);
            }
            $stmt_invoice_update->bind_param($bind_invoice_types, ...$bind_invoice_params);
            if (!$stmt_invoice_update->execute()) {
                throw new Exception("Error updating invoice: " . $stmt_invoice_update->error);
            }
            $stmt_invoice_update->close();
        }

        // Update invoice items if provided
        if ($items_provided) {
            // 1. Delete all existing items for this invoice
            $stmt_delete_items = $conn->prepare("DELETE FROM invoice_items WHERE invoice_items_invoice_id = ?");
            if (!$stmt_delete_items) {
                throw new Exception("Prepare failed for deleting old invoice items: " . $conn->error);
            }
            $stmt_delete_items->bind_param("i", $invoices_id);
            if (!$stmt_delete_items->execute()) {
                throw new Exception("Error deleting old invoice items: " . $stmt_delete_items->error);
            }
            $stmt_delete_items->close();

            // 2. Insert new items
            if (!empty($processed_invoice_items)) {
                $stmt_item_insert = $conn->prepare("
                    INSERT INTO invoice_items (
                        invoice_items_invoice_id, invoice_items_products_id, invoice_items_quantity, 
                        invoice_items_unit_price, invoice_items_total_price, 
                        invoice_items_created_at, invoice_items_updated_at
                    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ");

                if (!$stmt_item_insert) {
                    throw new Exception("Prepare failed for new invoice item insert: " . $conn->error);
                }

                foreach ($processed_invoice_items as $item) {
                    $stmt_item_insert->bind_param("iiddd", 
                        $invoices_id, $item['products_id'], $item['quantity'], 
                        $item['unit_price'], $item['total_price']
                    );
                    if (!$stmt_item_insert->execute()) {
                        throw new Exception("Error inserting new invoice item for product ID " . $item['products_id'] . ": " . $stmt_item_insert->error);
                    }
                }
                $stmt_item_insert->close();
            }
        }

        // Adjust client credit balance based on status and amount changes
        $should_deduct_new = ($new_status_for_balance === 'Confirmed');
        $was_deducted_old = ($old_status === 'Confirmed');

        if ($should_deduct_new && !$was_deducted_old) {
            // Status changed to Confirmed: Deduct new total
            $stmt_update_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance - ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance) throw new Exception("Prepare failed for balance deduction: " . $conn->error);
            $stmt_update_balance->bind_param("di", $new_total_amount_for_balance, $new_client_id_for_balance);
            if (!$stmt_update_balance->execute()) throw new Exception("Error deducting balance: " . $stmt_update_balance->error);
            $stmt_update_balance->close();

        } elseif (!$should_deduct_new && $was_deducted_old) {
            // Status changed from Confirmed: Add old total back
            $stmt_update_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance + ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance) throw new Exception("Prepare failed for balance addition: " . $conn->error);
            $stmt_update_balance->bind_param("di", $old_total_amount, $old_client_id);
            if (!$stmt_update_balance->execute()) throw new Exception("Error adding balance back: " . $stmt_update_balance->error);
            $stmt_update_balance->close();

        } elseif ($should_deduct_new && $was_deducted_old && $new_total_amount_for_balance != $old_total_amount) {
            // Status remains Confirmed, but total amount changed: Revert old, then deduct new
            $stmt_update_balance_revert = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance + ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance_revert) throw new Exception("Prepare failed for balance revert: " . $conn->error);
            $stmt_update_balance_revert->bind_param("di", $old_total_amount, $old_client_id);
            if (!$stmt_update_balance_revert->execute()) throw new Exception("Error reverting old balance: " . $stmt_update_balance_revert->error);
            $stmt_update_balance_revert->close();

            $stmt_update_balance_deduct = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance - ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_balance_deduct) throw new Exception("Prepare failed for balance new deduction: " . $conn->error);
            $stmt_update_balance_deduct->bind_param("di", $new_total_amount_for_balance, $new_client_id_for_balance);
            if (!$stmt_update_balance_deduct->execute()) throw new Exception("Error deducting new balance: " . $stmt_update_balance_deduct->error);
            $stmt_update_balance_deduct->close();
        }
        // Note: If client_id changes while status is Confirmed, this logic needs to be enhanced
        // to handle balance transfer between clients. For now, it handles amount/status changes.

        $conn->commit();
        print_success("Invoice updated successfully.", ['invoices_id' => $invoices_id, 'total_amount' => $new_total_amount_for_balance]);

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
