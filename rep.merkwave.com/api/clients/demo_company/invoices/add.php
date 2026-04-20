<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $invoices_client_id      = $_POST['invoices_client_id']      ?? null;
    $invoices_date           = $_POST['invoices_date']           ?? date('Y-m-d H:i:s'); // Default to current time
    $invoices_due_date       = $_POST['invoices_due_date']       ?? null;
    $invoices_expiration_date = $_POST['invoices_expiration_date'] ?? null; // New field
    $invoices_status         = $_POST['invoices_status']         ?? 'Draft';
    $invoices_notes          = $_POST['invoices_notes']          ?? null;
    $invoice_items           = json_decode($_POST['invoice_items'] ?? '[]', true); // Array of items

    // Handle empty strings for nullable fields
    if ($invoices_notes === "") {$invoices_notes = null;}
    if ($invoices_expiration_date === "") {$invoices_expiration_date = null;}

    // Basic Validation
    if (empty($invoices_client_id) || !is_numeric($invoices_client_id) || $invoices_client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }
    if (empty($invoices_due_date)) {
        print_failure("Error: Due date is required.");
    }
    if (!strtotime($invoices_date)) {
        print_failure("Error: Invalid invoice date format.");
    }
    if (!strtotime($invoices_due_date)) {
        print_failure("Error: Invalid due date format.");
    }
    if ($invoices_expiration_date !== null && !strtotime($invoices_expiration_date)) {
        print_failure("Error: Invalid expiration date format.");
    }
    // Updated ENUM validation for invoices_status
    if (!in_array($invoices_status, ['Draft', 'Quotation', 'Confirmed', 'Cancelled'])) {
        print_failure("Error: Invalid invoice status. Must be 'Draft', 'Quotation', 'Confirmed', or 'Cancelled'.");
    }
    if (empty($invoice_items) || !is_array($invoice_items)) {
        print_failure("Error: Invoice items are required.");
    }

    $calculated_total_amount = 0.00;
    $processed_invoice_items = []; // To store items with fetched prices

    foreach ($invoice_items as $item) {
        if (empty($item['products_id']) || !is_numeric($item['products_id']) || $item['products_id'] <= 0 ||
            empty($item['quantity']) || !is_numeric($item['quantity']) || $item['quantity'] <= 0) {
            print_failure("Error: Invalid item data (product ID or quantity).");
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

        // Store processed item data
        $processed_invoice_items[] = [
            'products_id' => $item['products_id'],
            'quantity' => $item['quantity'],
            'unit_price' => $fetched_unit_price, // Use fetched price
            'total_price' => $item_total
        ];
    }

    $conn->begin_transaction();

    try {
        // Insert into invoices table
        $stmt_invoice = $conn->prepare("
            INSERT INTO invoices (
                invoices_client_id, invoices_date, invoices_due_date, invoices_expiration_date,
                invoices_total_amount, invoices_status, invoices_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        if (!$stmt_invoice) {
            throw new Exception("Prepare failed for invoice insert: " . $conn->error);
        }

        $stmt_invoice->bind_param("isssdss", 
            $invoices_client_id, $invoices_date, $invoices_due_date, $invoices_expiration_date,
            $calculated_total_amount, $invoices_status, $invoices_notes
        );

        if (!$stmt_invoice->execute()) {
            throw new Exception("Error inserting invoice: " . $stmt_invoice->error);
        }

        $new_invoice_id = $stmt_invoice->insert_id;
        $stmt_invoice->close();

        // Insert into invoice_items table using processed items
        $stmt_item = $conn->prepare("
            INSERT INTO invoice_items (
                invoice_items_invoice_id, invoice_items_products_id, invoice_items_quantity, 
                invoice_items_unit_price, invoice_items_total_price, 
                invoice_items_created_at, invoice_items_updated_at
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_item) {
            throw new Exception("Prepare failed for invoice item insert: " . $conn->error);
        }

        foreach ($processed_invoice_items as $item) { // Use processed_invoice_items
            $stmt_item->bind_param("iiddd", 
                $new_invoice_id, $item['products_id'], $item['quantity'], 
                $item['unit_price'], $item['total_price'] 
            );
            if (!$stmt_item->execute()) {
                throw new Exception("Error inserting invoice item for product ID " . $item['products_id'] . ": " . $stmt_item->error);
            }
        }
        $stmt_item->close();

        // Deduct from client's credit balance if status is 'Confirmed'
        if ($invoices_status === 'Confirmed') {
            $stmt_update_client_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance - ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_client_balance) {
                throw new Exception("Prepare failed for client balance update: " . $conn->error);
            }
            $stmt_update_client_balance->bind_param("di", $calculated_total_amount, $invoices_client_id);
            if (!$stmt_update_client_balance->execute()) {
                throw new Exception("Error updating client credit balance: " . $stmt_update_client_balance->error);
            }
            $stmt_update_client_balance->close();
        }

        $conn->commit();
        print_success("Invoice created successfully.", ['invoices_id' => $new_invoice_id, 'total_amount' => $calculated_total_amount]);

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
