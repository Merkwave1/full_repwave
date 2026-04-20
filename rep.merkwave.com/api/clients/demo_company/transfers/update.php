<?php
/**
 * API endpoint to update the status of a stock transfer.
 *
 * This script handles the logic for different status transitions:
 * - Pending -> In Transit: Decrements stock from the source warehouse.
 * - In Transit -> Completed: Increments stock in the destination warehouse.
 * - Pending -> Completed: Directly moves stock from source to destination.
 * - Pending/In Transit -> Cancelled: Reverts stock changes if necessary.
 *
 * All operations are wrapped in a database transaction.
 *
 * transfers\update.php
 * --- EXPECTED POST DATA ---
 * transfer_id: 1
 * status: "In Transit" // or enum('Pending', 'In Transit', 'Completed', 'Cancelled')
 * --------------------------
 */

// Require necessary files and set error reporting
require_once '../db_connect.php'; // Make sure this path is correct

// Include Odoo inventory sync (optional - won't fail if not available)
if (file_exists(__DIR__ . '/../odoo/sync_inventory.php')) {
    require_once __DIR__ . '/../odoo/sync_inventory.php';
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authenticate and get user ID
    
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    // --- Input Data ---
    $transfer_id = $_POST['transfer_id'] ?? null;
    $new_status  = $_POST['status'] ?? null;

    // --- Validation ---
    if (empty($transfer_id) || !is_numeric($transfer_id)) {
        print_failure("Error: A valid 'transfer_id' is required.");
    }
    $valid_statuses = ['Pending', 'In Transit', 'Completed', 'Cancelled'];
    if (empty($new_status) || !in_array($new_status, $valid_statuses)) {
        print_failure("Error: A valid 'status' is required. Must be one of: " . implode(', ', $valid_statuses));
    }
    if (empty($user_id)) {
        print_failure("Invalid session. Please login again.");
    }

    // Start the database transaction
    $conn->begin_transaction();

    try {
        // --- 1. Fetch the current transfer and lock the row ---
        $stmt_get_transfer = $conn->prepare("SELECT * FROM transfers WHERE transfer_id = ? FOR UPDATE");
        $stmt_get_transfer->bind_param("i", $transfer_id);
        $stmt_get_transfer->execute();
        $transfer = $stmt_get_transfer->get_result()->fetch_assoc();
        $stmt_get_transfer->close();

        if (!$transfer) {
            throw new Exception("Transfer with ID {$transfer_id} not found.");
        }

        $current_status = $transfer['transfer_status'];
        if ($current_status === $new_status) {
            throw new Exception("Transfer is already in the '{$new_status}' status.");
        }

        // --- 2. Fetch all items related to this transfer ---
        $stmt_get_items = $conn->prepare("
            SELECT ti.inventory_id, ti.transfer_item_quantity, i.variant_id, i.packaging_type_id, i.inventory_production_date
            FROM transfer_items ti
            JOIN inventory i ON ti.inventory_id = i.inventory_id
            WHERE ti.transfer_id = ?
        ");
        $stmt_get_items->bind_param("i", $transfer_id);
        $stmt_get_items->execute();
        $items = $stmt_get_items->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_get_items->close();

        if (empty($items)) {
            throw new Exception("No items found for this transfer. Cannot process status change.");
        }

        // --- 3. Process Logic Based on Status Transition ---
        
        // A) DISPATCHING: From Pending to In Transit
        if ($current_status === 'Pending' && $new_status === 'In Transit') {
            // Decrement stock from source warehouse
            foreach ($items as $item) {
                $quantity_to_deduct = (float)$item['transfer_item_quantity'];

                $stmt_get_source_inv = $conn->prepare("SELECT inventory_quantity FROM inventory WHERE inventory_id = ? FOR UPDATE");
                $stmt_get_source_inv->bind_param("i", $item['inventory_id']);
                $stmt_get_source_inv->execute();
                $source_inv = $stmt_get_source_inv->get_result()->fetch_assoc();
                $stmt_get_source_inv->close();

                if (!$source_inv || (float)$source_inv['inventory_quantity'] < $quantity_to_deduct) {
                    throw new Exception("Insufficient stock for variant ID {$item['variant_id']} at source warehouse for transfer.");
                }

                $new_source_qty = (float)$source_inv['inventory_quantity'] - $quantity_to_deduct;
                $stmt_update_source = $conn->prepare("UPDATE inventory SET inventory_quantity = ? WHERE inventory_id = ?");
                $stmt_update_source->bind_param("di", $new_source_qty, $item['inventory_id']);
                $stmt_update_source->execute();
                $stmt_update_source->close();

                // Log 'transfer_out' movement
                $log_notes = "Transfer Out (ID: {$transfer_id}) to Warehouse ID: {$transfer['transfer_destination_warehouse_id']}";
                $stmt_log = $conn->prepare("INSERT INTO inventory_logs (inventory_log_variant_id, inventory_log_packaging_type_id, inventory_log_warehouse_id, inventory_log_type, inventory_log_quantity_change, inventory_log_current_quantity, inventory_log_user_id, inventory_log_reference_id, inventory_log_notes) VALUES (?, ?, ?, 'transfer_out', ?, ?, ?, ?, ?)");
                $stmt_log->bind_param("iiiddiis", $item['variant_id'], $item['packaging_type_id'], $transfer['transfer_source_warehouse_id'], $quantity_to_deduct, $new_source_qty, $user_id, $transfer_id, $log_notes);
                $stmt_log->execute();
                $stmt_log->close();
            }
        }
        // B) RECEIVING: From In Transit to Completed
        else if ($current_status === 'In Transit' && $new_status === 'Completed') {
            foreach ($items as $item) {
                // Find or create inventory slot at destination and increment quantity
                $stmt_find_dest = $conn->prepare("SELECT inventory_id, inventory_quantity FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? AND inventory_production_date <=> ? LIMIT 1 FOR UPDATE");
                $stmt_find_dest->bind_param("iiss", $item['variant_id'], $transfer['transfer_destination_warehouse_id'], $item['packaging_type_id'], $item['inventory_production_date']);
                $stmt_find_dest->execute();
                $dest_inv = $stmt_find_dest->get_result()->fetch_assoc();
                $stmt_find_dest->close();

                $quantity_to_add = (float)$item['transfer_item_quantity'];
                $new_dest_qty = 0;

                if ($dest_inv) { // If batch exists, update it
                    $new_dest_qty = (float)$dest_inv['inventory_quantity'] + $quantity_to_add;
                    $stmt_update = $conn->prepare("UPDATE inventory SET inventory_quantity = ? WHERE inventory_id = ?");
                    $stmt_update->bind_param("di", $new_dest_qty, $dest_inv['inventory_id']);
                    $stmt_update->execute();
                    $stmt_update->close();
                } else { // Otherwise, create new inventory record
                    $new_dest_qty = $quantity_to_add;
                    $stmt_insert = $conn->prepare("INSERT INTO inventory (variant_id, warehouse_id, packaging_type_id, inventory_production_date, inventory_quantity) VALUES (?, ?, ?, ?, ?)");
                    $stmt_insert->bind_param("iiisd", $item['variant_id'], $transfer['transfer_destination_warehouse_id'], $item['packaging_type_id'], $item['inventory_production_date'], $new_dest_qty);
                    $stmt_insert->execute();
                    $stmt_insert->close();
                }

                // Log 'transfer_in' movement
                $log_notes = "Transfer In (ID: {$transfer_id}) from Warehouse ID: {$transfer['transfer_source_warehouse_id']}";
                $stmt_log = $conn->prepare("INSERT INTO inventory_logs (inventory_log_variant_id, inventory_log_packaging_type_id, inventory_log_warehouse_id, inventory_log_type, inventory_log_quantity_change, inventory_log_current_quantity, inventory_log_user_id, inventory_log_reference_id, inventory_log_notes) VALUES (?, ?, ?, 'transfer_in', ?, ?, ?, ?, ?)");
                $stmt_log->bind_param("iiiddiis", $item['variant_id'], $item['packaging_type_id'], $transfer['transfer_destination_warehouse_id'], $quantity_to_add, $new_dest_qty, $user_id, $transfer_id, $log_notes);
                $stmt_log->execute();
                $stmt_log->close();
            }
        }
        // C) DIRECT COMPLETION: From Pending to Completed (NEW BLOCK)
        else if ($current_status === 'Pending' && $new_status === 'Completed') {
            foreach ($items as $item) {
                $quantity_to_move = (float)$item['transfer_item_quantity'];

                // 1. Decrement from source warehouse
                $stmt_get_source_inv = $conn->prepare("SELECT inventory_quantity FROM inventory WHERE inventory_id = ? FOR UPDATE");
                $stmt_get_source_inv->bind_param("i", $item['inventory_id']);
                $stmt_get_source_inv->execute();
                $source_inv = $stmt_get_source_inv->get_result()->fetch_assoc();
                $stmt_get_source_inv->close();

                if (!$source_inv || (float)$source_inv['inventory_quantity'] < $quantity_to_move) {
                    throw new Exception("Insufficient stock for variant ID {$item['variant_id']} at source warehouse for direct completion.");
                }

                $new_source_qty = (float)$source_inv['inventory_quantity'] - $quantity_to_move;
                $stmt_update_source = $conn->prepare("UPDATE inventory SET inventory_quantity = ? WHERE inventory_id = ?");
                $stmt_update_source->bind_param("di", $new_source_qty, $item['inventory_id']);
                $stmt_update_source->execute();
                $stmt_update_source->close();

                // Log 'transfer_out' from source
                $log_notes_out = "Direct Transfer Out (ID: {$transfer_id}) to Warehouse ID: {$transfer['transfer_destination_warehouse_id']}";
                $stmt_log_out = $conn->prepare("INSERT INTO inventory_logs (inventory_log_variant_id, inventory_log_packaging_type_id, inventory_log_warehouse_id, inventory_log_type, inventory_log_quantity_change, inventory_log_current_quantity, inventory_log_user_id, inventory_log_reference_id, inventory_log_notes) VALUES (?, ?, ?, 'transfer_out', ?, ?, ?, ?, ?)");
                $stmt_log_out->bind_param("iiiddiis", $item['variant_id'], $item['packaging_type_id'], $transfer['transfer_source_warehouse_id'], $quantity_to_move, $new_source_qty, $user_id, $transfer_id, $log_notes_out);
                $stmt_log_out->execute();
                $stmt_log_out->close();

                // 2. Increment in destination warehouse
                $stmt_find_dest = $conn->prepare("SELECT inventory_id, inventory_quantity FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? AND inventory_production_date <=> ? LIMIT 1 FOR UPDATE");
                $stmt_find_dest->bind_param("iiss", $item['variant_id'], $transfer['transfer_destination_warehouse_id'], $item['packaging_type_id'], $item['inventory_production_date']);
                $stmt_find_dest->execute();
                $dest_inv = $stmt_find_dest->get_result()->fetch_assoc();
                $stmt_find_dest->close();

                $new_dest_qty = 0;
                if ($dest_inv) {
                    $new_dest_qty = (float)$dest_inv['inventory_quantity'] + $quantity_to_move;
                    $stmt_update_dest = $conn->prepare("UPDATE inventory SET inventory_quantity = ? WHERE inventory_id = ?");
                    $stmt_update_dest->bind_param("di", $new_dest_qty, $dest_inv['inventory_id']);
                    $stmt_update_dest->execute();
                    $stmt_update_dest->close();
                } else {
                    $new_dest_qty = $quantity_to_move;
                    $stmt_insert_dest = $conn->prepare("INSERT INTO inventory (variant_id, warehouse_id, packaging_type_id, inventory_production_date, inventory_quantity) VALUES (?, ?, ?, ?, ?)");
                    $stmt_insert_dest->bind_param("iiisd", $item['variant_id'], $transfer['transfer_destination_warehouse_id'], $item['packaging_type_id'], $item['inventory_production_date'], $new_dest_qty);
                    $stmt_insert_dest->execute();
                    $stmt_insert_dest->close();
                }

                // Log 'transfer_in' to destination
                $log_notes_in = "Direct Transfer In (ID: {$transfer_id}) from Warehouse ID: {$transfer['transfer_source_warehouse_id']}";
                $stmt_log_in = $conn->prepare("INSERT INTO inventory_logs (inventory_log_variant_id, inventory_log_packaging_type_id, inventory_log_warehouse_id, inventory_log_type, inventory_log_quantity_change, inventory_log_current_quantity, inventory_log_user_id, inventory_log_reference_id, inventory_log_notes) VALUES (?, ?, ?, 'transfer_in', ?, ?, ?, ?, ?)");
                $stmt_log_in->bind_param("iiiddiis", $item['variant_id'], $item['packaging_type_id'], $transfer['transfer_destination_warehouse_id'], $quantity_to_move, $new_dest_qty, $user_id, $transfer_id, $log_notes_in);
                $stmt_log_in->execute();
                $stmt_log_in->close();
            }
        }
        // D) CANCELLING
        else if ($new_status === 'Cancelled') {
            // This logic assumes stock was moved when the transfer was created (the 'add.php' workflow).
            // If the transfer was 'In Transit', we must return the stock.
            if ($current_status === 'In Transit' || $current_status === 'Completed') {
                // Items were already dispatched, so we need to return them to the source warehouse.
                foreach ($items as $item) {
                    $quantity_to_return = (float)$item['transfer_item_quantity'];
                    
                    $stmt_get_source = $conn->prepare("SELECT inventory_quantity FROM inventory WHERE inventory_id = ? FOR UPDATE");
                    $stmt_get_source->bind_param("i", $item['inventory_id']);
                    $stmt_get_source->execute();
                    $source_inv = $stmt_get_source->get_result()->fetch_assoc();
                    $stmt_get_source->close();

                    $new_source_qty = (float)$source_inv['inventory_quantity'] + $quantity_to_return;

                    $stmt_return = $conn->prepare("UPDATE inventory SET inventory_quantity = ? WHERE inventory_id = ?");
                    $stmt_return->bind_param("di", $new_source_qty, $item['inventory_id']);
                    $stmt_return->execute();
                    $stmt_return->close();

                    // Log the return/cancellation
                    $stmt_log = $conn->prepare("INSERT INTO inventory_logs (inventory_log_variant_id, inventory_log_packaging_type_id, inventory_log_warehouse_id, inventory_log_type, inventory_log_quantity_change, inventory_log_current_quantity, inventory_log_user_id, inventory_log_reference_id, inventory_log_notes) VALUES (?, ?, ?, 'adjustment_in', ?, ?, ?, ?, ?)");
                    $log_notes = "Return from cancelled Transfer ID: {$transfer_id}";
                    $stmt_log->bind_param("iiiddiis", $item['variant_id'], $item['packaging_type_id'], $transfer['transfer_source_warehouse_id'], $quantity_to_return, $new_source_qty, $user_id, $transfer_id, $log_notes);
                    $stmt_log->execute();
                    $stmt_log->close();
                }
            }
            // If status is 'Pending', no inventory has moved, so no stock logic is needed.
        }
        else {
            throw new Exception("Invalid status transition from '{$current_status}' to '{$new_status}'.");
        }

        // --- 4. Update the transfer status ---
        $stmt_update_transfer = $conn->prepare("UPDATE transfers SET transfer_status = ? WHERE transfer_id = ?");
        $stmt_update_transfer->bind_param("si", $new_status, $transfer_id);
        $stmt_update_transfer->execute();
        $stmt_update_transfer->close();

        // --- 5. Commit Transaction ---
        $conn->commit();
        
        // --- 6. Sync to Odoo (after successful commit) if status is In Transit or Completed ---
        $odoo_sync_result = null;
        if (in_array($new_status, ['In Transit', 'Completed']) && 
            function_exists('syncTransferToOdoo') && 
            function_exists('isOdooIntegrationEnabled') && 
            isOdooIntegrationEnabled()) {
            try {
                $odoo_picking_id = syncTransferToOdoo($transfer_id);
                if ($odoo_picking_id) {
                    $odoo_sync_result = ['odoo_picking_id' => $odoo_picking_id, 'sync_status' => 'success'];
                    error_log("Transfer $transfer_id synced to Odoo on status update: Picking ID $odoo_picking_id");
                } else {
                    $odoo_sync_result = ['sync_status' => 'failed', 'message' => 'Sync failed'];
                }
            } catch (Exception $sync_e) {
                error_log("Odoo sync error for transfer $transfer_id: " . $sync_e->getMessage());
                $odoo_sync_result = ['sync_status' => 'failed', 'message' => $sync_e->getMessage()];
            }
        }
        
        print_success("Transfer status successfully updated to '{$new_status}'.", [
            'transfer_id' => (int)$transfer_id,
            'odoo_sync' => $odoo_sync_result
        ]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure("Transaction Failed: " . $e->getMessage());
    }

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn->connect_errno === 0) {
        $conn->rollback();
    }
    print_failure("An unexpected error occurred: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
