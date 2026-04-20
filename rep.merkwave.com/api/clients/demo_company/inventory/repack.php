<?php
/**
 * API endpoint to assemble or disassemble inventory from one packaging type to another.
 *
 * This script converts a specified quantity of an inventory item from its original
 * packaging to a new packaging type. It calculates the resulting quantity based on
 * the conversion factors defined in the `packaging_types` table.
 * All operations are wrapped in a database transaction.
 *
 * --- EXPECTED POST DATA ---
 * inventory_id: 45          // The specific inventory batch to convert from.
 * to_packaging_type_id: 2   // The packaging type to convert to.
 * quantity_to_convert: 10.00 // The number of original packages to convert.
 * --------------------------
 */

// Require necessary files and set error reporting
require_once '../db_connect.php'; // Make sure this path is correct
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authenticate and get user ID
    
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    // --- Input Data ---
    $inventory_id        = $_POST['inventory_id'] ?? null;
    $to_packaging_type_id = $_POST['to_packaging_type_id'] ?? null;
    $quantity_to_convert = $_POST['quantity_to_convert'] ?? null;

    // --- Validation ---
    if (empty($inventory_id) || !is_numeric($inventory_id)) {
        print_failure("Error: A valid 'inventory_id' is required.");
    }
    if (empty($to_packaging_type_id) || !is_numeric($to_packaging_type_id)) {
        print_failure("Error: A valid 'to_packaging_type_id' is required.");
    }
    if (!is_numeric($quantity_to_convert) || (float)$quantity_to_convert <= 0) {
        print_failure("Error: 'quantity_to_convert' must be a positive number.");
    }
    if (empty($user_id)) {
        print_failure("Invalid session. Please login again.");
    }
    $quantity_to_convert = (float)$quantity_to_convert;

    // Start the database transaction
    $conn->begin_transaction();

    try {
        // --- 1. Fetch source inventory and lock the row for update ---
        $stmt_find_source = $conn->prepare("
            SELECT variant_id, warehouse_id, packaging_type_id, inventory_production_date, inventory_quantity
            FROM inventory
            WHERE inventory_id = ? FOR UPDATE
        ");
        $stmt_find_source->bind_param("i", $inventory_id);
        $stmt_find_source->execute();
        $source_inv = $stmt_find_source->get_result()->fetch_assoc();
        $stmt_find_source->close();

        if (!$source_inv) {
            throw new Exception("Source inventory batch with ID {$inventory_id} not found.");
        }
        if ($source_inv['packaging_type_id'] == $to_packaging_type_id) {
            throw new Exception("Cannot convert to the same packaging type.");
        }
        if ((float)$source_inv['inventory_quantity'] < $quantity_to_convert) {
            throw new Exception("Insufficient stock for inventory batch ID {$inventory_id}. Available: {$source_inv['inventory_quantity']}, Requested: {$quantity_to_convert}.");
        }

        // --- 2. Get conversion factors and base units for both packaging types ---
        $from_packaging_type_id = $source_inv['packaging_type_id'];
        $stmt_factors = $conn->prepare("
            SELECT packaging_types_id, packaging_types_default_conversion_factor as factor, packaging_types_compatible_base_unit_id as base_unit_id
            FROM packaging_types
            WHERE packaging_types_id IN (?, ?)
        ");
        $stmt_factors->bind_param("ii", $from_packaging_type_id, $to_packaging_type_id);
        $stmt_factors->execute();
        $factors_result = $stmt_factors->get_result();
        $packages_data = [];
        while ($row = $factors_result->fetch_assoc()) {
            $packages_data[$row['packaging_types_id']] = [
                'factor' => (float)$row['factor'],
                'base_unit_id' => (int)$row['base_unit_id']
            ];
        }
        $stmt_factors->close();

        if (!isset($packages_data[$from_packaging_type_id]) || !isset($packages_data[$to_packaging_type_id])) {
            throw new Exception("Could not find conversion factors for one or both packaging types.");
        }
        
        // ✅ New Validation: Check if base units are compatible
        if ($packages_data[$from_packaging_type_id]['base_unit_id'] !== $packages_data[$to_packaging_type_id]['base_unit_id']) {
            throw new Exception("Packaging types do not share the same base unit and cannot be converted.");
        }

        // --- 3. Calculate the resulting quantity ---
        $from_factor = $packages_data[$from_packaging_type_id]['factor'];
        $to_factor   = $packages_data[$to_packaging_type_id]['factor'];
        if ($to_factor == 0) {
            throw new Exception("Destination packaging conversion factor cannot be zero.");
        }
        
        $quantity_in_base_units = $quantity_to_convert * $from_factor;
        $quantity_to_increase   = $quantity_in_base_units / $to_factor;

        // ✅ New Validation: Check for whole numbers when assembling (packing small to big)
        if ($to_factor > $from_factor) { // This is an assembly operation
            // Use a small epsilon for float comparison to handle precision issues
            $epsilon = 0.00001;
            if (fmod($quantity_in_base_units, $to_factor) > $epsilon) {
                throw new Exception("Invalid quantity. The amount of smaller units must be a perfect multiple to form the larger package. Please adjust the quantity to convert.");
            }
        }


        // --- 4. Prepare reusable statement for logging ---
        $stmt_log = $conn->prepare("
            INSERT INTO inventory_logs (inventory_log_variant_id, inventory_log_packaging_type_id, inventory_log_warehouse_id, inventory_log_type, inventory_log_quantity_change, inventory_log_current_quantity, inventory_log_user_id, inventory_log_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        // --- 5. Decrease source inventory (Repack Out) ---
        $new_source_qty = (float)$source_inv['inventory_quantity'] - $quantity_to_convert;
        $stmt_decr = $conn->prepare("UPDATE inventory SET inventory_quantity = ? WHERE inventory_id = ?");
        $stmt_decr->bind_param("di", $new_source_qty, $inventory_id);
        $stmt_decr->execute();
        $stmt_decr->close();

        // Log 'repack_out'
        $log_type_out = 'repack_out';
        $log_notes_out = "Repacked from packaging ID {$from_packaging_type_id} to {$to_packaging_type_id}";
        $stmt_log->bind_param("iiisddis", $source_inv['variant_id'], $from_packaging_type_id, $source_inv['warehouse_id'], $log_type_out, $quantity_to_convert, $new_source_qty, $user_id, $log_notes_out);
        $stmt_log->execute();


        // --- 6. Increase destination inventory (Repack In) ---
        // Find if a matching batch already exists for the destination packaging type
        $stmt_find_dest = $conn->prepare("
            SELECT inventory_id, inventory_quantity FROM inventory
            WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? AND inventory_production_date <=> ?
            LIMIT 1 FOR UPDATE
        ");
        $stmt_find_dest->bind_param("iiss", $source_inv['variant_id'], $source_inv['warehouse_id'], $to_packaging_type_id, $source_inv['inventory_production_date']);
        $stmt_find_dest->execute();
        $dest_inv = $stmt_find_dest->get_result()->fetch_assoc();
        $stmt_find_dest->close();

        $new_dest_qty = 0;
        if ($dest_inv) { // If destination batch exists, update it
            $new_dest_qty = (float)$dest_inv['inventory_quantity'] + $quantity_to_increase;
            $stmt_incr = $conn->prepare("UPDATE inventory SET inventory_quantity = ? WHERE inventory_id = ?");
            $stmt_incr->bind_param("di", $new_dest_qty, $dest_inv['inventory_id']);
            $stmt_incr->execute();
            $stmt_incr->close();
        } else { // Otherwise, create a new inventory record
            $new_dest_qty = $quantity_to_increase;
            $stmt_insert = $conn->prepare("
                INSERT INTO inventory (variant_id, warehouse_id, packaging_type_id, inventory_production_date, inventory_quantity)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt_insert->bind_param("iiisd", $source_inv['variant_id'], $source_inv['warehouse_id'], $to_packaging_type_id, $source_inv['inventory_production_date'], $new_dest_qty);
            $stmt_insert->execute();
            $stmt_insert->close();
        }

        // Log 'repack_in'
        $log_type_in = 'repack_in';
        $log_notes_in = "Repacked from packaging ID {$from_packaging_type_id} to {$to_packaging_type_id}";
        $stmt_log->bind_param("iiisddis", $source_inv['variant_id'], $to_packaging_type_id, $source_inv['warehouse_id'], $log_type_in, $quantity_to_increase, $new_dest_qty, $user_id, $log_notes_in);
        $stmt_log->execute();
        $stmt_log->close();


        // --- 7. Commit Transaction ---
        $conn->commit();
        print_success("Inventory repack completed successfully.", ['decreased_inventory_id' => $inventory_id, 'increased_quantity' => round($quantity_to_increase, 4)]);

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
