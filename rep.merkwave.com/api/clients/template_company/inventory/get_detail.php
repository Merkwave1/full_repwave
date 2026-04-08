<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $inventory_id = $_GET['inventory_id'] ?? $_POST['inventory_id'] ?? null;

    if (empty($inventory_id) || !is_numeric($inventory_id) || $inventory_id <= 0) {
        print_failure("Error: Inventory ID is required.");
        exit;
    }

    $stmt = $conn->prepare("
        SELECT 
            inv.inventory_id, 
            inv.products_id, 
            p.products_name, 
            p.products_sku,
            inv.warehouse_id, 
            w.warehouse_name, 
            w.warehouse_code,
            inv.inventory_quantity, 
            inv.inventory_status,
            inv.inventory_last_movement_at,
            inv.inventory_created_at,
            inv.inventory_updated_at
        FROM inventory inv
        JOIN products p ON inv.products_id = p.products_id
        JOIN warehouse w ON inv.warehouse_id = w.warehouse_id
        WHERE inv.inventory_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->bind_param("i", $inventory_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: Inventory item not found.");
        exit;
    }

    $inventory_data = $result->fetch_assoc();
    print_success("Inventory details retrieved successfully.", $inventory_data);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
