<?php
/**
 * API endpoint to fetch detailed information for a single stock transfer,
 * including all its associated items with full product and packaging details.
 *
 * --- EXPECTED GET PARAMETERS ---
 * - transfer_id: The ID of the transfer to retrieve.
 * - users_uuid: The UUID of the authenticated user (for authorization).
 * ------------------------------
 *
 * --- SUCCESSFUL JSON RESPONSE ---\
 * {
 * "status": "success",
 * "message": "Transfer details retrieved successfully.",
 * "data": {
 * "transfer_id": 1,
 * "transfer_source_warehouse_id": 1,
 * "transfer_destination_warehouse_id": 2,
 * "status": "Completed",
 * "transfer_initiated_by_user_id": 1,
 * "notes": "Weekly restock.",
 * "created_at": "2023-10-27 10:00:00",
 * "updated_at": "2023-10-27 10:05:00",
 * "items": [
 * {
 * "transfer_item_id": 1,
 * "inventory_id": 10,
 * "quantity": 5.00,
 * "variant_id": 101,
 * "product_name": "Product A",
 * "variant_name": "Red, Large",
 * "packaging_type_id": 2,
 * "packaging_type_name": "Box",
 * "base_unit_name": "pcs"
 * },
 * // ... more items
 * ]
 * }
 * }
 * --------------------------------
 */

require_once '../db_connect.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get transfer_id from GET parameters
    $transfer_id = isset($_GET['transfer_id']) ? (int)$_GET['transfer_id'] : 0;

    if ($transfer_id <= 0) {
        print_failure("Transfer ID is required.");
        exit();
    }

    $transfer_details = null;
    $items = [];

    // Fetch transfer header details
    $sql_transfer = "
        SELECT
            t.transfer_id,
            t.transfer_source_warehouse_id,
            t.transfer_destination_warehouse_id,
            t.transfer_status AS status,
            t.transfer_initiated_by_user_id,
            t.transfer_notes AS notes,
            t.transfer_created_at AS created_at,
            t.transfer_updated_at AS updated_at
        FROM
            transfers t
        WHERE
            t.transfer_id = ?
    ";
    $stmt_transfer = $conn->prepare($sql_transfer);
    $stmt_transfer->bind_param("i", $transfer_id);
    $stmt_transfer->execute();
    $result_transfer = $stmt_transfer->get_result();

    if ($result_transfer->num_rows > 0) {
        $transfer_details = $result_transfer->fetch_assoc();
        // Type cast main transfer IDs
        $transfer_details['transfer_id'] = (int)$transfer_details['transfer_id'];
        $transfer_details['transfer_source_warehouse_id'] = (int)$transfer_details['transfer_source_warehouse_id'];
        $transfer_details['transfer_destination_warehouse_id'] = (int)$transfer_details['transfer_destination_warehouse_id'];
        if ($transfer_details['transfer_initiated_by_user_id']) {
            $transfer_details['transfer_initiated_by_user_id'] = (int)$transfer_details['transfer_initiated_by_user_id'];
        }
    } else {
        print_failure("Transfer not found.");
        exit();
    }
    $stmt_transfer->close();

    // Fetch associated items with full product, variant, packaging, and base unit details
    $sql_items = "
        SELECT
            ti.transfer_item_id,
            ti.inventory_id,
            ti.transfer_item_quantity AS quantity,
            i.variant_id,
            pv.variant_products_id AS products_id,
            p.products_name AS product_name,
            pv.variant_name,
            pt.packaging_types_id AS packaging_type_id,
            pt.packaging_types_name AS packaging_type_name,
            bu.base_units_name AS base_unit_name
        FROM
            transfer_items ti
        JOIN
            inventory i ON ti.inventory_id = i.inventory_id
        JOIN
            product_variants pv ON i.variant_id = pv.variant_id
        LEFT JOIN
            products p ON p.products_id = pv.variant_products_id
        LEFT JOIN
            packaging_types pt ON i.packaging_type_id = pt.packaging_types_id
        LEFT JOIN
            base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
        WHERE
            ti.transfer_id = ?
    ";
    $stmt_items = $conn->prepare($sql_items);
    $stmt_items->bind_param("i", $transfer_id);
    $stmt_items->execute();
    $result_items = $stmt_items->get_result();

    while ($item_row = $result_items->fetch_assoc()) {
        // Type casting for consistency
        $item_row['transfer_item_id'] = (int)$item_row['transfer_item_id'];
        $item_row['inventory_id'] = (int)$item_row['inventory_id'];
        $item_row['quantity'] = (float)$item_row['quantity'];
        $item_row['variant_id'] = $item_row['variant_id'] ? (int)$item_row['variant_id'] : null;
        $item_row['products_id'] = $item_row['products_id'] ? (int)$item_row['products_id'] : null;
        $item_row['packaging_type_id'] = $item_row['packaging_type_id'] ? (int)$item_row['packaging_type_id'] : null;
        $items[] = $item_row;
    }
    $result_items->free();
    $stmt_items->close();

    $transfer_details['items'] = $items;

    print_success("Transfer details retrieved successfully.", $transfer_details);

} catch (Exception | TypeError $e) {
    print_failure("An unexpected error occurred: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
