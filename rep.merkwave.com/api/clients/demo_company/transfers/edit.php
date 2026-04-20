<?php
/**
 * API endpoint to edit an existing stock transfer (notes and items).
 *
 * This script allows modifications to a transfer's notes and its associated items
 * (quantities, adding new items, removing existing items).
 *
 * IMPORTANT: This endpoint ONLY allows editing of transfers that are in 'Pending' status.
 * For 'In Transit' or 'Completed' transfers, direct item editing is not supported
 * to avoid complex inventory reversal logic. Such changes would typically require
 * creating new adjustment transfers or a separate return/adjustment process.
 *
 * transfers/edit.php
 * --- EXPECTED POST DATA ---
 * transfer_id: 1
 * notes: "Updated transfer notes." (optional)
 * items: '[{"inventory_id": 45, "quantity": 12.00}, {"inventory_id": 48, "quantity": 7.00}, {"inventory_id": 101, "quantity": 3.00}]'
 * (This should be the full, new list of items for the transfer)
 * --------------------------
 */

// Require necessary files and set error reporting
require_once '../db_connect.php'; // Make sure this path is correct
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authenticate and get user ID
     // Or appropriate authorization for editing transfers
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    // --- Input Data ---
    $transfer_id = $_POST['transfer_id'] ?? null;
    $new_notes   = $_POST['notes'] ?? null; // Optional: new notes
    $items_json  = $_POST['items'] ?? '[]';
    $new_items   = json_decode($items_json, true);

    // --- Validation ---
    if (empty($transfer_id) || !is_numeric($transfer_id)) {
        print_failure("Error: A valid 'transfer_id' is required.");
    }
    if (!is_array($new_items)) {
        print_failure("Error: 'items' must be a valid JSON array.");
    }
    if (empty($user_id)) {
        print_failure("Invalid session. Please login again.");
    }

    // Start the database transaction
    $conn->begin_transaction();

    try {
        // --- 1. Fetch the current transfer and lock the row ---
        $stmt_get_transfer = $conn->prepare("SELECT transfer_status, transfer_notes FROM transfers WHERE transfer_id = ? FOR UPDATE");
        $stmt_get_transfer->bind_param("i", $transfer_id);
        $stmt_get_transfer->execute();
        $transfer = $stmt_get_transfer->get_result()->fetch_assoc();
        $stmt_get_transfer->close();

        if (!$transfer) {
            throw new Exception("Transfer with ID {$transfer_id} not found.");
        }

        $current_status = $transfer['transfer_status'];

        // IMPORTANT: Only allow editing if the transfer is Pending
        if ($current_status !== 'Pending') {
            throw new Exception("Cannot edit transfer items. Transfer is in '{$current_status}' status. Only 'Pending' transfers can be edited.");
        }

        // --- 2. Fetch existing items for this transfer ---
        $stmt_get_existing_items = $conn->prepare("SELECT inventory_id, transfer_item_quantity FROM transfer_items WHERE transfer_id = ? FOR UPDATE");
        $stmt_get_existing_items->bind_param("i", $transfer_id);
        $stmt_get_existing_items->execute();
        $existing_items_result = $stmt_get_existing_items->get_result();
        $existing_items_map = [];
        while ($row = $existing_items_result->fetch_assoc()) {
            $existing_items_map[$row['inventory_id']] = (float)$row['transfer_item_quantity'];
        }
        $stmt_get_existing_items->close();

        $processed_inventory_ids = []; // To track which inventory_ids have been processed

        // --- 3. Process new_items (updates and additions) ---
        foreach ($new_items as $item) {
            $inventory_id = $item['inventory_id'] ?? null;
            $quantity     = $item['quantity'] ?? null;

            if (empty($inventory_id) || !is_numeric($inventory_id) || !is_numeric($quantity) || (float)$quantity <= 0) {
                throw new Exception("Invalid data for one of the items. Please check all inventory IDs and quantities. Quantity must be positive.");
            }
            $quantity = (float)$quantity;

            // Check if inventory_id actually exists in the inventory table
            $stmt_check_inv = $conn->prepare("SELECT inventory_id FROM inventory WHERE inventory_id = ?");
            $stmt_check_inv->bind_param("i", $inventory_id);
            $stmt_check_inv->execute();
            if ($stmt_check_inv->get_result()->num_rows === 0) {
                $stmt_check_inv->close();
                throw new Exception("Inventory batch with ID {$inventory_id} not found. Cannot add/update.");
            }
            $stmt_check_inv->close();

            if (isset($existing_items_map[$inventory_id])) {
                // Item exists, update quantity if changed
                if ($existing_items_map[$inventory_id] !== $quantity) {
                    $stmt_update_item = $conn->prepare("UPDATE transfer_items SET transfer_item_quantity = ? WHERE transfer_id = ? AND inventory_id = ?");
                    $stmt_update_item->bind_param("dii", $quantity, $transfer_id, $inventory_id);
                    $stmt_update_item->execute();
                    $stmt_update_item->close();
                }
                unset($existing_items_map[$inventory_id]); // Mark as processed
            } else {
                // Item is new, insert it
                $stmt_insert_item = $conn->prepare("INSERT INTO transfer_items (transfer_id, inventory_id, transfer_item_quantity) VALUES (?, ?, ?)");
                $stmt_insert_item->bind_param("iid", $transfer_id, $inventory_id, $quantity);
                $stmt_insert_item->execute();
                $stmt_insert_item->close();
            }
            $processed_inventory_ids[] = $inventory_id;
        }

        // --- 4. Process removed items (items remaining in existing_items_map) ---
        foreach ($existing_items_map as $inventory_id => $old_quantity) {
            // If an item is in existing_items_map but not in new_items, it means it was removed
            $stmt_delete_item = $conn->prepare("DELETE FROM transfer_items WHERE transfer_id = ? AND inventory_id = ?");
            $stmt_delete_item->bind_param("ii", $transfer_id, $inventory_id);
            $stmt_delete_item->execute();
            $stmt_delete_item->close();
        }

        // --- 5. Update transfer notes if provided ---
        if ($new_notes !== null) { // Only update if notes are explicitly sent
            $stmt_update_notes = $conn->prepare("UPDATE transfers SET transfer_notes = ? WHERE transfer_id = ?");
            $stmt_update_notes->bind_param("si", $new_notes, $transfer_id);
            $stmt_update_notes->execute();
            $stmt_update_notes->close();
        }

        // --- 6. Commit Transaction ---
        $conn->commit();
        print_success("Transfer (ID: {$transfer_id}) updated successfully.", ['transfer_id' => (int)$transfer_id]);

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
