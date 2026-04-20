<?php
require_once '../db_connect.php';
require_once '../functions.php';

// Test inventory lookup for debugging
if (isset($_GET['variant_id']) && isset($_GET['warehouse_id'])) {
    $variant_id = (int)$_GET['variant_id'];
    $warehouse_id = (int)$_GET['warehouse_id'];
    $packaging_id = isset($_GET['packaging_id']) ? (int)$_GET['packaging_id'] : null;

    echo "<h3>Debug Inventory Lookup</h3>";
    echo "<p>Variant ID: $variant_id</p>";
    echo "<p>Warehouse ID: $warehouse_id</p>";
    echo "<p>Packaging ID: " . ($packaging_id ?? 'NULL') . "</p>";

    // Check inventory records
    $stmt = $conn->prepare("
        SELECT * FROM inventory 
        WHERE variant_id = ? AND warehouse_id = ? 
        AND (packaging_type_id = ? OR (packaging_type_id IS NULL AND ? IS NULL))
        ORDER BY inventory_created_at DESC
    ");
    $stmt->bind_param("iiii", $variant_id, $warehouse_id, $packaging_id, $packaging_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo "<h4>Inventory Records Found: " . count($rows) . "</h4>";
    if (!empty($rows)) {
        echo "<table border='1'>";
        echo "<tr><th>inventory_id</th><th>variant_id</th><th>warehouse_id</th><th>packaging_type_id</th><th>inventory_quantity</th><th>inventory_status</th><th>inventory_production_date</th></tr>";
        foreach ($rows as $row) {
            echo "<tr>";
            foreach ($row as $key => $value) {
                echo "<td>" . htmlspecialchars($value ?? 'NULL') . "</td>";
            }
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>No inventory records found!</p>";
    }

    // Also check all inventory records for this variant
    echo "<h4>All Inventory Records for Variant $variant_id:</h4>";
    $stmt_all = $conn->prepare("SELECT * FROM inventory WHERE variant_id = ?");
    $stmt_all->bind_param("i", $variant_id);
    $stmt_all->execute();
    $all_result = $stmt_all->get_result();
    $all_rows = $all_result->fetch_all(MYSQLI_ASSOC);
    $stmt_all->close();

    if (!empty($all_rows)) {
        echo "<table border='1'>";
        echo "<tr><th>inventory_id</th><th>variant_id</th><th>warehouse_id</th><th>packaging_type_id</th><th>inventory_quantity</th><th>inventory_status</th><th>inventory_production_date</th></tr>";
        foreach ($all_rows as $row) {
            echo "<tr>";
            foreach ($row as $key => $value) {
                echo "<td>" . htmlspecialchars($value ?? 'NULL') . "</td>";
            }
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>No inventory records found for this variant at all!</p>";
    }

    // Check purchase order items
    echo "<h4>Purchase Order Items for this Variant:</h4>";
    $stmt_po = $conn->prepare("
        SELECT poi.*, po.purchase_orders_warehouse_id, po.purchase_orders_status
        FROM purchase_order_items poi 
        JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id 
        WHERE poi.purchase_order_items_variant_id = ? 
        ORDER BY poi.purchase_order_items_id DESC
    ");
    $stmt_po->bind_param("i", $variant_id);
    $stmt_po->execute();
    $po_result = $stmt_po->get_result();
    $po_rows = $po_result->fetch_all(MYSQLI_ASSOC);
    $stmt_po->close();

    if (!empty($po_rows)) {
        echo "<table border='1' style='font-size: 12px;'>";
        echo "<tr>";
        foreach (array_keys($po_rows[0]) as $key) {
            echo "<th>$key</th>";
        }
        echo "</tr>";
        foreach ($po_rows as $row) {
            echo "<tr>";
            foreach ($row as $value) {
                echo "<td>" . htmlspecialchars($value ?? 'NULL') . "</td>";
            }
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>No purchase order items found for this variant!</p>";
    }

} else {
    echo "<h3>Inventory Debug Tool</h3>";
    echo "<p>Usage: debug_inventory.php?variant_id=X&warehouse_id=Y&packaging_id=Z</p>";
    echo "<p>packaging_id is optional</p>";
}

$conn->close();
?>
