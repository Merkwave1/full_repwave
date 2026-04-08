<?php
/**
 * API endpoint to create a new stock transfer, styled after goods_receipts/add.php.
 *
 * This script handles the creation of a transfer record, its associated items,
 * and updates inventory levels for both the source and destination warehouses.
 * It performs all database operations within a transaction to ensure data integrity.
 * It assumes inventory is moved based on the oldest production date first (FIFO).
 *
 * --- EXPECTED POST DATA ---
 * from_warehouse_id: 1
 * to_warehouse_id: 2
 * transfer_date: "2025-07-15"
 * notes: "Transferring items to main branch."
 * items: '[{"variant_id": 101, "packaging_type_id": 1, "quantity": 10.00}, {"variant_id": 102, "packaging_type_id": 1, "quantity": 5.00}]'
 * ---------------------------
 */

// Require necessary files and set error reporting
require_once '../db_connect.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check user authorization
    

    // --- Main Transfer Data ---
    $from_warehouse_id = $_POST['from_warehouse_id'] ?? null;
    $to_warehouse_id   = $_POST['to_warehouse_id'] ?? null;
    $transfer_date     = $_POST['transfer_date'] ?? date('Y-m-d H:i:s');
    $notes             = $_POST['notes'] ?? null;
    $status            = $_POST['status'] ?? 'completed';
    $items_json        = $_POST['items'] ?? '[]';
    $items             = json_decode($items_json, true);

    // --- User & Validation ---
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    if (empty($from_warehouse_id) || !is_numeric($from_warehouse_id) || empty($to_warehouse_id) || !is_numeric($to_warehouse_id)) {
        print_failure("Error: Valid 'From' and 'To' Warehouse IDs are required.");
    }
    if ($from_warehouse_id == $to_warehouse_id) {
        print_failure("Error: Source and destination warehouses cannot be the same.");
    }
    if (empty($items) || !is_array($items)) {
        print_failure("Error: At least one item is required to create a transfer.");
    }
    if (empty($user_id)) {
        print_failure("Invalid session. Please login again.");
    }

    // Start the database transaction
    $conn->begin_transaction();

    try {
        // --- 1. Create the main Transfer record ---
        $stmt_transfer = $conn->prepare("
            INSERT INTO transfers (transfers_from_warehouse_id, transfers_to_warehouse_id, transfers_date, transfers_status, transfers_notes, transfers_user_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt_transfer) throw new Exception("Prepare failed for parent transfer: " . $conn->error);
        $stmt_transfer->bind_param("iisssi", $from_warehouse_id, $to_warehouse_id, $transfer_date, $status, $notes, $user_id);
        if (!$stmt_transfer->execute()) throw new Exception("Error creating parent transfer record: " . $stmt_transfer->error);
        $transfer_id = $stmt_transfer->insert_id;
        $stmt_transfer->close();

        // --- Prepare statement for inventory movement logging ---
        $stmt_movement = $conn->prepare("
            INSERT INTO inventory_movements (product_variant_id, warehouse_id, quantity, movement_type, reference_id, movement_date, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt_movement) throw new Exception("Prepare failed for inventory movement log: " . $conn->error);


        // --- 2. Loop through each item and process the transfer ---
        foreach ($items as $item) {
            $variant_id        = $item['variant_id'] ?? null;
            $packaging_type_id = $item['packaging_type_id'] ?? null;
            $quantity_to_move  = $item['quantity'] ?? null;

            if (empty($variant_id) || !is_numeric($variant_id) || empty($quantity_to_move) || !is_numeric($quantity_to_move) || $quantity_to_move <= 0) {
                throw new Exception("Invalid data for one of the items. Please check all variant IDs and quantities.");
            }
            
            // --- Find the oldest available inventory batch in the source warehouse ---
            $stmt_find_source_inv = $conn->prepare("
                SELECT inventory_id, inventory_quantity, inventory_production_date 
                FROM inventory 
                WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? AND inventory_quantity >= ?
                ORDER BY inventory_production_date ASC 
                LIMIT 1 FOR UPDATE
            ");
            if (!$stmt_find_source_inv) throw new Exception("Prepare failed for source inventory check.");
            $stmt_find_source_inv->bind_param("iiid", $variant_id, $from_warehouse_id, $packaging_type_id, $quantity_to_move);
            $stmt_find_source_inv->execute();
            $source_inv_row = $stmt_find_source_inv->get_result()->fetch_assoc();
            $stmt_find_source_inv->close();

            if (!$source_inv_row) {
                throw new Exception("Insufficient stock or no matching batch found for variant ID {$variant_id} in the source warehouse.");
            }
            
            $source_inventory_id = $source_inv_row['inventory_id'];
            $source_production_date = $source_inv_row['inventory_production_date'];
            
            // --- Create Transfer Item record ---
            $stmt_ti = $conn->prepare("INSERT INTO transfer_items (transfer_items_transfer_id, transfer_items_variant_id, transfer_items_packaging_type_id, transfer_items_quantity) VALUES (?, ?, ?, ?)");
            if (!$stmt_ti) throw new Exception("Prepare failed for transfer item.");
            $stmt_ti->bind_param("iiid", $transfer_id, $variant_id, $packaging_type_id, $quantity_to_move);
            if (!$stmt_ti->execute()) throw new Exception("Error creating transfer item for variant {$variant_id}.");
            $stmt_ti->close();

            // --- Decrement Source Inventory ---
            $qty_after_decrement = (float)$source_inv_row['inventory_quantity'] - (float)$quantity_to_move;
            $stmt_decr_inv = $conn->prepare("UPDATE inventory SET inventory_quantity = ?, inventory_last_movement_at = NOW() WHERE inventory_id = ?");
            $stmt_decr_inv->bind_param("di", $qty_after_decrement, $source_inventory_id);
            $stmt_decr_inv->execute();
            $stmt_decr_inv->close();
            
            // Log 'transfer_out' movement
            $movement_type_out = 'transfer_out';
            $notes_out = "Transfer Out to Warehouse ID: {$to_warehouse_id}";
            $stmt_movement->bind_param("iidsiss", $variant_id, $from_warehouse_id, $quantity_to_move, $movement_type_out, $transfer_id, $transfer_date, $notes_out);
            $stmt_movement->execute();

            // --- Increment Destination Inventory ---
            // Find if a matching batch already exists in the destination warehouse
            $stmt_check_dest_inv = $conn->prepare("SELECT inventory_id, inventory_quantity FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? AND inventory_production_date = ? LIMIT 1 FOR UPDATE");
            $stmt_check_dest_inv->bind_param("iiis", $variant_id, $to_warehouse_id, $packaging_type_id, $source_production_date);
            $stmt_check_dest_inv->execute();
            $dest_inv_row = $stmt_check_dest_inv->get_result()->fetch_assoc();
            $stmt_check_dest_inv->close();
            
            $qty_after_increment = 0;
            if ($dest_inv_row) {
                // Batch exists, update it
                $qty_after_increment = (float)$dest_inv_row['inventory_quantity'] + (float)$quantity_to_move;
                $stmt_update_inv = $conn->prepare("UPDATE inventory SET inventory_quantity = ?, inventory_last_movement_at = NOW() WHERE inventory_id = ?");
                $stmt_update_inv->bind_param("di", $qty_after_increment, $dest_inv_row['inventory_id']);
                $stmt_update_inv->execute();
                $stmt_update_inv->close();
            } else {
                // Batch doesn't exist, create it
                $qty_after_increment = (float)$quantity_to_move;
                $stmt_insert_inv = $conn->prepare("INSERT INTO inventory (variant_id, warehouse_id, packaging_type_id, inventory_production_date, inventory_quantity, inventory_status) VALUES (?, ?, ?, ?, ?, 'In Stock')");
                $stmt_insert_inv->bind_param("iiisd", $variant_id, $to_warehouse_id, $packaging_type_id, $source_production_date, $qty_after_increment);
                $stmt_insert_inv->execute();
                $stmt_insert_inv->close();
            }
            
            // Log 'transfer_in' movement
            $movement_type_in = 'transfer_in';
            $notes_in = "Transfer In from Warehouse ID: {$from_warehouse_id}";
            $stmt_movement->bind_param("iidsiss", $variant_id, $to_warehouse_id, $quantity_to_move, $movement_type_in, $transfer_id, $transfer_date, $notes_in);
            $stmt_movement->execute();
        }

        $stmt_movement->close();

        // --- 3. Commit Transaction ---
        $conn->commit();
        print_success("Transfer created successfully.", ['transfer_id' => $transfer_id, 'items_processed' => count($items)]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure("Transaction Failed: " . $e->getMessage() . " At line " . $e->getLine());
    }

} catch (Exception | TypeError $e) {
    // This catches errors from before the transaction starts (e.g., connection, validation)
    if (isset($conn) && $conn->connect_errno == 0) { // Check if connection object exists and is valid
       $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
