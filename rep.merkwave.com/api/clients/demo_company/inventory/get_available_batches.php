<?php
require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get parameters
    $variant_id = isset($_GET['variant_id']) ? (int)$_GET['variant_id'] : null;
    $warehouse_id = isset($_GET['warehouse_id']) ? (int)$_GET['warehouse_id'] : null;
    $packaging_type_id = isset($_GET['packaging_type_id']) ? (int)$_GET['packaging_type_id'] : null;

    if (!$variant_id || !$warehouse_id) {
        print_failure("Error: Missing required parameters: variant_id and warehouse_id are required");
        exit;
    }

    // Build query with optional packaging type filter
    $query = "
        SELECT 
            inv.inventory_id,
            inv.inventory_production_date,
            inv.inventory_quantity,
            inv.inventory_status,
            inv.packaging_type_id,
            pt.packaging_types_name,
            inv.inventory_created_at,
            inv.inventory_last_movement_at
        FROM inventory inv
        LEFT JOIN packaging_types pt ON inv.packaging_type_id = pt.packaging_types_id
        WHERE inv.variant_id = ? 
        AND inv.warehouse_id = ?
        AND inv.inventory_quantity > 0
    ";

    $params = [$variant_id, $warehouse_id];
    $types = "ii";

    // Add packaging type filter if provided
    if ($packaging_type_id) {
        $query .= " AND inv.packaging_type_id = ?";
        $params[] = $packaging_type_id;
        $types .= "i";
    }

    // Order by production date (oldest first for FIFO)
    $query .= " ORDER BY inv.inventory_production_date ASC, inv.inventory_created_at ASC";

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $batches = [];
    $total_quantity = 0;

    while ($row = $result->fetch_assoc()) {
        $batch = [
            'inventory_id' => (int)$row['inventory_id'],
            'production_date' => $row['inventory_production_date'],
            'quantity' => (float)$row['inventory_quantity'],
            'status' => $row['inventory_status'],
            'packaging_type_id' => (int)$row['packaging_type_id'],
            'packaging_type_name' => $row['packaging_types_name'],
            'created_at' => $row['inventory_created_at'],
            'last_movement_at' => $row['inventory_last_movement_at'],
            'display_name' => $row['inventory_production_date'] 
                ? date('Y-m-d', strtotime($row['inventory_production_date'])) . ' (الكمية: ' . number_format($row['inventory_quantity'], 2) . ')'
                : 'بدون تاريخ إنتاج (الكمية: ' . number_format($row['inventory_quantity'], 2) . ')'
        ];
        
        $batches[] = $batch;
        $total_quantity += (float)$row['inventory_quantity'];
    }

    $stmt->close();
    $conn->close();

    print_success("Available batches retrieved successfully.", [
        'variant_id' => $variant_id,
        'warehouse_id' => $warehouse_id,
        'batches' => $batches,
        'total_quantity' => $total_quantity,
        'total_batches' => count($batches)
    ]);

} catch (Exception $e) {
    print_failure("Error fetching available batches: " . $e->getMessage());
}

?>

$conn->close();
?>
