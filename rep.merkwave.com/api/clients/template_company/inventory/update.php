<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Call the centralized authorization function
    

    $inventory_id       = $_POST['inventory_id']       ?? null;
    $inventory_quantity = $_POST['inventory_quantity'] ?? null; 
    $inventory_status   = $_POST['inventory_status']   ?? null;

    if (empty($inventory_id) || !is_numeric($inventory_id) || $inventory_id <= 0) {
        print_failure("Error: Valid Inventory ID is required for update.");
    }

    $conn->begin_transaction(); // Start transaction

    try {
        // Fetch current inventory data for logging purposes and validation
            // Fetch current inventory data for logging purposes and validation
            // Note: inventory is variant-based (no products_id). Select variant_id and packaging_type_id.
            $stmt_fetch_current = $conn->prepare(
                "SELECT variant_id, warehouse_id, packaging_type_id, inventory_quantity, inventory_status FROM inventory WHERE inventory_id = ?"
            );
        if (!$stmt_fetch_current) {
            throw new Exception("Prepare failed to fetch current inventory: " . $conn->error);
        }
        $stmt_fetch_current->bind_param("i", $inventory_id);
        $stmt_fetch_current->execute();
        $result_current = $stmt_fetch_current->get_result();
        $current_inventory_data = $result_current->fetch_assoc();
        $stmt_fetch_current->close();

        if (!$current_inventory_data) {
            $conn->rollback(); // No item to update
            print_failure("Error: Inventory item with ID " . $inventory_id . " not found.");
        }

        $old_quantity = $current_inventory_data['inventory_quantity'];
        $variant_id_for_log = $current_inventory_data['variant_id'];
        $packaging_type_id_for_log = $current_inventory_data['packaging_type_id'];
        $warehouse_id_for_log = $current_inventory_data['warehouse_id'];

        $update_fields = [];
        $bind_types = "";
        $bind_params = [];
        $quantity_updated = false;

        if (isset($inventory_quantity) && is_numeric($inventory_quantity) && $inventory_quantity >= 0) {
            $update_fields[] = "inventory_quantity = ?";
            $bind_types .= "d";
            $bind_params[] = $inventory_quantity;
            if ($inventory_quantity != $old_quantity) {
                $quantity_updated = true;
            }
        } else if (isset($_POST['inventory_quantity']) && ($inventory_quantity === '' || $inventory_quantity < 0)) {
            print_failure("Error: Invalid inventory quantity.");
        }

        if (!empty($inventory_status)) {
                // Allow the Removed status so frontend can mark rows as removed instead of deleting them
                if (!in_array($inventory_status, ['In Stock', 'Low Stock', 'Out of Stock', 'Removed'])) {
                    print_failure("Error: Invalid inventory status. Allowed: 'In Stock', 'Low Stock', 'Out of Stock', 'Removed'.");
                }
            $update_fields[] = "inventory_status = ?";
            $bind_types .= "s";
            $bind_params[] = $inventory_status;
        }

            // Support updating production/batch date (accept '0000-00-00' or valid date string)
            $inventory_production_date = $_POST['inventory_production_date'] ?? null;
            if ($inventory_production_date !== null) {
                $update_fields[] = "inventory_production_date = ?";
                $bind_types .= "s";
                $bind_params[] = $inventory_production_date;
            }

        if (empty($update_fields)) {
            print_failure("Error: No valid fields provided for update.");
        }

        $sql = "UPDATE inventory SET " . implode(", ", $update_fields) . ", inventory_updated_at = NOW() WHERE inventory_id = ?";
        $bind_types .= "i"; 
        $bind_params[] = $inventory_id;

        $stmt = $conn->prepare($sql);

        if (!$stmt) {
            throw new Exception("Prepare failed for update: " . $conn->error);
        }

        $stmt->bind_param($bind_types, ...$bind_params);

        if (!$stmt->execute()) {
            throw new Exception("Error updating inventory: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback(); // No row affected
            print_failure("Error: Inventory item with ID " . $inventory_id . " not found or no changes were made.");
        }

        // Log quantity change if it occurred
        if ($quantity_updated) {
            $quantity_diff = $inventory_quantity - $old_quantity;
            $log_type = ($quantity_diff > 0) ? 'adjustment_in' : 'adjustment_out';
            
            $stmt_log = $conn->prepare("
                INSERT INTO inventory_logs (
                    inventory_log_products_id,
                    inventory_log_warehouse_id,
                    inventory_log_type,
                    inventory_log_quantity_change,
                    inventory_log_current_quantity,
                    inventory_log_user_id,
                    inventory_log_reference_id,
                    inventory_log_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
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
            $log_user_id = get_user_id_from_uuid_local(); 

            $log_notes = 'Manual quantity adjustment';

            $stmt_log->bind_param("iisddiis", 
                    $variant_id_for_log,
                    $packaging_type_id_for_log,
                $warehouse_id_for_log, 
                $log_type, 
                $quantity_diff, // Log the difference
                $inventory_quantity, // Log the new current quantity
                $log_user_id, 
                $inventory_id, 
                $log_notes
            );
                $stmt_log->bind_param("iiisddiis",
                    $variant_id_for_log,
                    $packaging_type_id_for_log,
                    $warehouse_id_for_log,
                    $log_type,
                    $quantity_diff, // Log the difference
                    $inventory_quantity, // Log the new current quantity
                    $log_user_id,
                    $inventory_id,
                    $log_notes
                );

            if (!$stmt_log->execute()) {
                throw new Exception("Error inserting inventory log for quantity change: " . $stmt_log->error);
            }
        }

        $conn->commit(); // Commit transaction if all successful
        print_success("Inventory updated successfully.", ['inventory_id' => $inventory_id]);
        exit;

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
    if (isset($stmt_fetch_current) && $stmt_fetch_current !== false) {
        $stmt_fetch_current->close();
    }
    if (isset($stmt_log) && $stmt_log !== false) {
        $stmt_log->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
