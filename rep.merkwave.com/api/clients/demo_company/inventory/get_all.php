<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $warehouse_id = $_GET['warehouse_id'] ?? $_POST['warehouse_id'] ?? null; 
    $variant_id   = $_GET['variant_id']   ?? $_POST['variant_id']   ?? null; 
    $packaging_type_id = $_GET['packaging_type_id'] ?? $_POST['packaging_type_id'] ?? null;
    $production_date = $_GET['production_date'] ?? $_POST['production_date'] ?? null; 

    $sql_select = "
        SELECT 
            inv.inventory_id,
            pv.variant_products_id AS products_id,
            p.products_unit_of_measure_id,
            inv.variant_id,
            -- pv.variant_name, -- Removed as requested
            inv.packaging_type_id,
            inv.warehouse_id,
            inv.inventory_production_date,
            inv.inventory_quantity,
            inv.inventory_status
        FROM inventory inv
        JOIN product_variants pv ON inv.variant_id = pv.variant_id
        JOIN products p ON pv.variant_products_id = p.products_id
    ";

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($warehouse_id) && is_numeric($warehouse_id)) { 
        $where_clauses[] = "inv.warehouse_id = ?"; 
        $bind_types .= "i";
        $bind_params[] = $warehouse_id; 
    } else if (!empty($warehouse_id)) { 
        print_failure("Error: Invalid Warehouse ID provided.");
        exit;
    }

    if (!empty($variant_id) && is_numeric($variant_id)) { 
        $where_clauses[] = "inv.variant_id = ?"; 
        $bind_types .= "i";
        $bind_params[] = $variant_id; 
    } else if (!empty($variant_id)) { 
        print_failure("Error: Invalid Variant ID provided.");
        exit;
    }

    if (!empty($packaging_type_id) && is_numeric($packaging_type_id)) {
        $where_clauses[] = "inv.packaging_type_id = ?";
        $bind_types .= "i";
        $bind_params[] = $packaging_type_id;
    } else if (!empty($packaging_type_id)) {
        print_failure("Error: Invalid Packaging Type ID provided.");
        exit;
    }

    if (!empty($production_date)) {
        if (!strtotime($production_date)) {
            print_failure("Error: Invalid Production Date format.");
            exit;
        }
        $where_clauses[] = "inv.inventory_production_date = ?";
        $bind_types .= "s";
        $bind_params[] = $production_date;
    }

    // By default, exclude inventory rows that were soft-removed (status = 'Removed')
    $where_clauses[] = "inv.inventory_status <> 'Removed'";

    if (!empty($where_clauses)) {
        $sql_select .= " WHERE " . implode(" AND ", $where_clauses);
    }

    $sql_select .= " ORDER BY p.products_name ASC, pv.variant_name ASC, inv.warehouse_id ASC, inv.inventory_production_date DESC"; 

    $stmt = $conn->prepare($sql_select);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $inventory_items = [];
    while ($row = $result->fetch_assoc()) {
        $inventory_items[] = $row;
    }

    print_success("Inventory items retrieved successfully.", ['inventory_items' => $inventory_items]);

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
