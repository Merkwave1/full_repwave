<?php
/**
 * transfers\add.php
 * API endpoint to create a new stock transfer.
 *
 * This script handles the creation of a transfer and its items.
 * It DOES NOT update inventory directly upon creation. Inventory adjustments
 * are handled by the 'update.php' script based on status transitions.
 * All database operations are performed within a transaction to ensure data integrity.
 *
 * --- EXPECTED POST DATA ---
 * source_warehouse_id: 1
 * destination_warehouse_id: 2
 * status: "Completed" // Or "In Transit", "Pending"
 * uuid:
 * notes: "Transferring items to main branch."
 * items: '[{"inventory_id": 45, "quantity": 10.00}, {"inventory_id": 48, "quantity": 5.00}]'
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
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    // --- Main Transfer Data ---
    $source_warehouse_id      = $_POST['source_warehouse_id'] ?? null;
    $destination_warehouse_id = $_POST['destination_warehouse_id'] ?? null;
    $status                   = $_POST['status'] ?? 'Pending';
    $notes                    = $_POST['notes'] ?? null;
    $items_json               = $_POST['items'] ?? '[]';
    $items                    = json_decode($items_json, true);

    // --- Validation ---
    if (empty($source_warehouse_id) || !is_numeric($source_warehouse_id) || empty($destination_warehouse_id) || !is_numeric($destination_warehouse_id)) {
        print_failure("Error: Valid 'Source' and 'Destination' Warehouse IDs are required.");
    }
    if ($source_warehouse_id == $destination_warehouse_id) {
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
            INSERT INTO transfers (transfer_source_warehouse_id, transfer_destination_warehouse_id, transfer_status, transfer_notes, transfer_initiated_by_user_id)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt_transfer->bind_param("iissi", $source_warehouse_id, $destination_warehouse_id, $status, $notes, $user_id);
        $stmt_transfer->execute();
        $transfer_id = $stmt_transfer->insert_id;
        $stmt_transfer->close();

        // --- 2. Loop through each item and create the Transfer Item record ---
        foreach ($items as $item) {
            $inventory_id     = $item['inventory_id'] ?? null;
            $quantity_to_move = $item['quantity'] ?? null;

            if (empty($inventory_id) || !is_numeric($inventory_id) || !is_numeric($quantity_to_move) || $quantity_to_move <= 0) {
                throw new Exception("Invalid data for one of the items. Please check all inventory IDs and quantities.");
            }
            $quantity_to_move = (float)$quantity_to_move;

            // --- Get details of the source inventory batch (for transfer_items record) ---
            // We don't need to lock or update inventory here, as that's handled by update.php
            $stmt_find_source = $conn->prepare("
                SELECT variant_id, packaging_type_id, inventory_production_date, inventory_quantity, warehouse_id
                FROM inventory
                WHERE inventory_id = ?
            ");
            $stmt_find_source->bind_param("i", $inventory_id);
            $stmt_find_source->execute();
            $source_inv_row = $stmt_find_source->get_result()->fetch_assoc();
            $stmt_find_source->close();

            if (!$source_inv_row) {
                throw new Exception("Inventory batch with ID {$inventory_id} not found.");
            }
            if ($source_inv_row['warehouse_id'] != $source_warehouse_id) {
                throw new Exception("Inventory batch ID {$inventory_id} does not belong to the source warehouse.");
            }
            // No need to check for sufficient stock here, as stock isn't decremented yet.
            // This check will be done in update.php when stock is actually moved.

            // --- Create Transfer Item record ---
            $stmt_ti = $conn->prepare("INSERT INTO transfer_items (transfer_id, inventory_id, transfer_item_quantity) VALUES (?, ?, ?)");
            $stmt_ti->bind_param("iid", $transfer_id, $inventory_id, $quantity_to_move);
            $stmt_ti->execute();
            $stmt_ti->close();

            // IMPORTANT: Inventory quantities are NOT adjusted here.
            // They will be adjusted by 'update.php' when the transfer status changes.

        }

        // --- 3. Commit Transaction ---
        $conn->commit();
        
        // --- 4. Sync to Odoo (after successful commit) if status is In Transit or Completed ---
        $odoo_sync_result = null;
        if (in_array($status, ['In Transit', 'Completed']) && 
            function_exists('syncTransferToOdoo') && 
            function_exists('isOdooIntegrationEnabled') && 
            isOdooIntegrationEnabled()) {
            try {
                $odoo_picking_id = syncTransferToOdoo($transfer_id);
                if ($odoo_picking_id) {
                    $odoo_sync_result = ['odoo_picking_id' => $odoo_picking_id, 'sync_status' => 'success'];
                    error_log("Transfer $transfer_id synced to Odoo: Picking ID $odoo_picking_id");
                } else {
                    $odoo_sync_result = ['sync_status' => 'failed', 'message' => 'Sync failed'];
                }
            } catch (Exception $sync_e) {
                error_log("Odoo sync error for transfer $transfer_id: " . $sync_e->getMessage());
                $odoo_sync_result = ['sync_status' => 'failed', 'message' => $sync_e->getMessage()];
            }
        }
        
        print_success("Transfer (ID: {$transfer_id}) created successfully. Inventory will be adjusted upon status change.", [
            'transfer_id' => $transfer_id, 
            'items_processed' => count($items),
            'odoo_sync' => $odoo_sync_result
        ]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        // Provide a more user-friendly error message
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    }

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn->connect_errno === 0) {
        $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
