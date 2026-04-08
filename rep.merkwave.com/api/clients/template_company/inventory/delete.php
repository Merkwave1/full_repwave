<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Call the centralized authorization function
    

    $inventory_id = $_POST['inventory_id'] ?? null;

    if (empty($inventory_id) || !is_numeric($inventory_id) || $inventory_id <= 0) {
        print_failure("Error: Valid Inventory ID is required.");
    }

    $conn->begin_transaction(); // Start transaction

    try {
        // Retrieve current inventory details for logging before deletion
        // Note: inventory table is variant-based and does not contain products_id.
        $stmt_get_inventory = $conn->prepare("
            SELECT variant_id, warehouse_id, packaging_type_id, inventory_quantity
            FROM inventory
            WHERE inventory_id = ?
        ");
        if (!$stmt_get_inventory) {
            throw new Exception("Prepare failed to get inventory for logging: " . $conn->error);
        }
        $stmt_get_inventory->bind_param("i", $inventory_id);
        $stmt_get_inventory->execute();
        $result_get_inventory = $stmt_get_inventory->get_result();
        $inventory_data = $result_get_inventory->fetch_assoc();
        $stmt_get_inventory->close();

        if (!$inventory_data) {
            $conn->rollback(); // No item to delete/log
            print_failure("Error: Inventory item with ID " . $inventory_id . " not found.");
        }

        // Ensure only zero-quantity (or negative) inventory entries can be deleted
        $currentQty = (float)$inventory_data['inventory_quantity'];
        if ($currentQty > 0) {
            $conn->rollback();
            print_failure("Cannot delete inventory item: quantity must be 0. Current quantity is " . $currentQty . ".");
        }

        // Perform the deletion
        $stmt = $conn->prepare("
            DELETE FROM inventory
            WHERE inventory_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("i", $inventory_id);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting inventory: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback(); // No row affected, probably not found
            print_failure("Error: Inventory item with ID " . $inventory_id . " not found.");
        }

        // Log the inventory deletion directly (variant-based logging per schema)
        $stmt_log = $conn->prepare("
            INSERT INTO inventory_logs (
                inventory_log_variant_id,
                inventory_log_packaging_type_id,
                inventory_log_warehouse_id,
                inventory_log_type,
                inventory_log_quantity_change,
                inventory_log_current_quantity,
                inventory_log_user_id,
                inventory_log_reference_id,
                inventory_log_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt_log) {
            throw new Exception("Prepare failed for inventory log insert: " . $conn->error);
        }

        // Get the user ID using the centralized function
        $uuid = $_POST['uuid'] ?? null;
        $log_user_id = get_user_id_from_uuid_local($uuid);

        $log_type = 'adjustment_out';
        $log_quantity_change = -$inventory_data['inventory_quantity']; // Negative value for removal
        $log_current_quantity = 0; // After deletion, quantity is 0
        $log_notes = 'Inventory item deleted';

        $stmt_log->bind_param("iiisddiis",
            $inventory_data['variant_id'],
            $inventory_data['packaging_type_id'],
            $inventory_data['warehouse_id'],
            $log_type,
            $log_quantity_change,
            $log_current_quantity,
            $log_user_id,
            $inventory_id, // Reference to the deleted inventory item
            $log_notes
        );

        if (!$stmt_log->execute()) {
            throw new Exception("Error inserting inventory log: " . $stmt_log->error);
        }

        $conn->commit(); // Commit transaction if all successful
        print_success("Inventory deleted successfully.");
        exit ;

    } catch (Exception $e) {
        $conn->rollback(); // Rollback on error
        throw $e; // Re-throw to be caught by outer catch block
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($stmt_get_inventory) && $stmt_get_inventory !== false) {
        $stmt_get_inventory->close();
    }
    if (isset($stmt_log) && $stmt_log !== false) {
        $stmt_log->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
