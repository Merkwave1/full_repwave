<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $returns_client_id      = $_POST['returns_client_id']      ?? null;
    $returns_invoice_id     = $_POST['returns_invoice_id']     ?? null; // Now required
    $returns_date           = $_POST['returns_date']           ?? date('Y-m-d H:i:s'); // Default to current time
    $returns_reason         = $_POST['returns_reason']         ?? null;
    $returns_status         = $_POST['returns_status']         ?? 'Pending';
    $returns_notes          = $_POST['returns_notes']          ?? null;
    $return_items           = json_decode($_POST['return_items'] ?? '[]', true); // Array of items

    // Handle empty strings for nullable fields
    if ($returns_reason === "") {$returns_reason = null;}
    if ($returns_notes === "") {$returns_notes = null;}

    // Basic Validation
    if (empty($returns_client_id) || !is_numeric($returns_client_id) || $returns_client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
        exit;
    }
    // Make returns_invoice_id required
    if (empty($returns_invoice_id) || !is_numeric($returns_invoice_id) || $returns_invoice_id <= 0) {
        print_failure("Error: Valid Invoice ID is required for a return.");
        exit;
    }
    if (!strtotime($returns_date)) {
        print_failure("Error: Invalid return date format.");
        exit;
    }
    if (!in_array($returns_status, ['Pending', 'Processed', 'Refunded', 'Cancelled'])) {
        print_failure("Error: Invalid return status. Must be 'Pending', 'Processed', 'Refunded', or 'Cancelled'.");
        exit;
    }
    if (empty($return_items) || !is_array($return_items)) {
        print_failure("Error: Return items are required.");
        exit;
    }

    $calculated_total_amount = 0.00;
    $processed_return_items = []; // To store items with fetched prices and validated quantities

    // --- Invoice and Item Quantity Validation ---
    $original_invoice_items = [];
    // Fetch invoice details and status
    $stmt_invoice_check = $conn->prepare("
        SELECT invoices_client_id, invoices_status
        FROM invoices
        WHERE invoices_id = ?
        LIMIT 1
    ");
    if (!$stmt_invoice_check) {
        throw new Exception("Prepare failed for invoice check: " . $conn->error);
    }
    $stmt_invoice_check->bind_param("i", $returns_invoice_id);
    $stmt_invoice_check->execute();
    $result_invoice_check = $stmt_invoice_check->get_result();
    $invoice_data = $result_invoice_check->fetch_assoc();
    $stmt_invoice_check->close();

    if (!$invoice_data) {
        print_failure("Error: Linked Invoice with ID " . $returns_invoice_id . " not found.");
        exit;
    }
    if ($invoice_data['invoices_client_id'] != $returns_client_id) {
        print_failure("Error: Linked Invoice does not belong to the specified client.");
        exit;
    }
    if ($invoice_data['invoices_status'] !== 'Confirmed') {
        print_failure("Error: Returns can only be linked to 'Confirmed' invoices.");
        exit;
    }

    // Fetch original invoice items quantities
    $stmt_original_items = $conn->prepare("
        SELECT invoice_items_products_id, invoice_items_quantity, invoice_items_unit_price
        FROM invoice_items
        WHERE invoice_items_invoice_id = ?
    ");
    if (!$stmt_original_items) {
        throw new Exception("Prepare failed for original invoice items fetch: " . $conn->error);
    }
    $stmt_original_items->bind_param("i", $returns_invoice_id);
    $stmt_original_items->execute();
    $result_original_items = $stmt_original_items->get_result();
    while ($row = $result_original_items->fetch_assoc()) {
        $original_invoice_items[$row['invoice_items_products_id']] = [
            'quantity' => (float)$row['invoice_items_quantity'],
            'unit_price' => (float)$row['invoice_items_unit_price']
        ];
    }
    $stmt_original_items->close();

    if (empty($original_invoice_items)) {
        print_failure("Error: Linked invoice has no items.");
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
        
        // Validate against original invoice item quantity
        if (!isset($original_invoice_items[$current_product_id])) {
            print_failure("Error: Product ID " . $current_product_id . " is not found in the linked invoice.");
            exit;
        }
        $original_qty = $original_invoice_items[$current_product_id]['quantity'];
        $fetched_unit_price = $original_invoice_items[$current_product_id]['unit_price'];

        // Calculate already returned quantity for this product on this invoice
        $stmt_already_returned = $conn->prepare("
            SELECT SUM(ri.return_items_quantity) AS total_returned
            FROM returns r
            JOIN return_items ri ON r.returns_id = ri.return_items_return_id
            WHERE r.returns_invoice_id = ? AND ri.return_items_products_id = ?
            AND r.returns_status IN ('Pending', 'Processed', 'Refunded') -- Consider only non-cancelled returns
        ");
        if (!$stmt_already_returned) {
            throw new Exception("Prepare failed for already returned quantity: " . $conn->error);
        }
        $stmt_already_returned->bind_param("ii", $returns_invoice_id, $current_product_id);
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

        $item_total = $returned_quantity * $fetched_unit_price;
        $calculated_total_amount += $item_total;

        // Store processed item data
        $processed_return_items[] = [
            'products_id' => $current_product_id,
            'quantity' => $returned_quantity,
            'unit_price' => $fetched_unit_price, 
            'total_price' => $item_total,
            'notes' => $item['notes'] ?? null 
        ];
    }

    $conn->begin_transaction();

    try {
        // Insert into returns table
        $stmt_return = $conn->prepare("
            INSERT INTO returns (
                returns_client_id, returns_invoice_id, returns_date, returns_reason, 
                returns_total_amount, returns_status, returns_notes, 
                returns_created_at, returns_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_return) {
            throw new Exception("Prepare failed for return insert: " . $conn->error);
        }

        $stmt_return->bind_param("iisdsss", 
            $returns_client_id, $returns_invoice_id, $returns_date, $returns_reason, 
            $calculated_total_amount, $returns_status, $returns_notes
        );

        if (!$stmt_return->execute()) {
            throw new Exception("Error inserting return: " . $stmt_return->error);
        }

        $new_return_id = $stmt_return->insert_id;
        $stmt_return->close();

        // Insert into return_items table
        $stmt_item = $conn->prepare("
            INSERT INTO return_items (
                return_items_return_id, return_items_products_id, return_items_quantity, 
                return_items_unit_price, return_items_total_price, return_items_notes,
                return_items_created_at, return_items_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_item) {
            throw new Exception("Prepare failed for return item insert: " . $conn->error);
        }

        foreach ($processed_return_items as $item) { 
            $stmt_item->bind_param("iiddds", 
                $new_return_id, $item['products_id'], $item['quantity'], 
                $item['unit_price'], $item['total_price'], $item['notes']
            );
            if (!$stmt_item->execute()) {
                throw new Exception("Error inserting return item for product ID " . $item['products_id'] . ": " . $stmt_item->error);
            }
        }
        $stmt_item->close();

        // Adjust client's credit balance if status is 'Refunded'
        if ($returns_status === 'Refunded') {
            $stmt_update_client_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance + ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_client_balance) {
                throw new Exception("Prepare failed for client balance update: " . $conn->error);
            }
            $stmt_update_client_balance->bind_param("di", $calculated_total_amount, $returns_client_id);
            if (!$stmt_update_client_balance->execute()) {
                throw new Exception("Error updating client credit balance: " . $stmt_update_client_balance->error);
            }
            $stmt_update_client_balance->close();
        }

        $conn->commit();
        print_success("Return created successfully.", ['returns_id' => $new_return_id, 'total_amount' => $calculated_total_amount]);

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