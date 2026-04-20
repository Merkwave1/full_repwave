<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID from request (GET or POST)
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Validate user and get user ID
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $user = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();
    if (!$user) {
        print_failure('Error: Invalid user UUID.');
    }

    // --- Main Receipt Data ---
    $warehouse_id = $_POST['warehouse_id'] ?? null;
    // If receipt_date provided (YYYY-MM-DD or datetime), use it; otherwise let DB set current timestamp
    $receipt_date = isset($_POST['receipt_date']) && strlen(trim((string)$_POST['receipt_date'])) > 0 ? $_POST['receipt_date'] : null;
    $notes        = $_POST['notes'] ?? null;
    $items_json   = $_POST['items'] ?? '[]';
    $items        = json_decode($items_json, true);

    // --- User & Validation ---
    $received_by_user_id = $user['users_id'];

    if (empty($warehouse_id) || !is_numeric($warehouse_id)) {
        print_failure("Error: A valid Warehouse ID is required.");
    }
    if (empty($items) || !is_array($items)) {
        print_failure("Error: At least one item is required to process a goods receipt.");
    }
    if (empty($received_by_user_id)) {
        print_failure("Invalid session. Please login again.");
    }

    $conn->begin_transaction();

    try {
        // --- 1. Create the main Goods Receipt record ---
        $stmt_gr = $conn->prepare("
            INSERT INTO goods_receipts (goods_receipt_warehouse_id, goods_receipt_date, goods_receipt_received_by_user_id, goods_receipt_notes) VALUES (?, NOW(), ?, ?)
        ");
        if ($receipt_date === null) {
            if (!$stmt_gr) throw new Exception("Prepare failed for parent goods receipt (NOW): " . $conn->error);
            $stmt_gr->bind_param("iis", $warehouse_id, $received_by_user_id, $notes);
        } else {
            $stmt_gr = $conn->prepare("INSERT INTO goods_receipts (goods_receipt_warehouse_id, goods_receipt_date, goods_receipt_received_by_user_id, goods_receipt_notes) VALUES (?, ?, ?, ?)");
            if (!$stmt_gr) throw new Exception("Prepare failed for parent goods receipt: " . $conn->error);
            $stmt_gr->bind_param("isis", $warehouse_id, $receipt_date, $received_by_user_id, $notes);
        }
        if (!$stmt_gr->execute()) throw new Exception("Error creating parent goods receipt: " . $stmt_gr->error);
        $parent_receipt_id = $stmt_gr->insert_id;
        $stmt_gr->close();

        $affected_po_ids = [];

        // --- 2. Loop through each item and process it ---
        foreach ($items as $item) {
            $po_item_id = $item['po_item_id'] ?? null;
            $quantity_received = $item['quantity'] ?? null;

            if (empty($po_item_id) || !is_numeric($po_item_id) || empty($quantity_received) || !is_numeric($quantity_received) || $quantity_received <= 0) {
                throw new Exception("Invalid data for one of the items. Please check all item IDs and quantities.");
            }

            // --- Fetch PO Item details ---
            $stmt_po_item = $conn->prepare("
                SELECT poi.purchase_order_items_variant_id, poi.purchase_order_items_packaging_type_id,
                       poi.purchase_order_items_quantity_ordered, poi.purchase_order_items_quantity_received,
                       po.purchase_orders_id, po.purchase_orders_status
                FROM purchase_order_items poi JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
                WHERE poi.purchase_order_items_id = ? FOR UPDATE
            ");
            if (!$stmt_po_item) throw new Exception("Prepare failed for PO item fetch.");
            $stmt_po_item->bind_param("i", $po_item_id);
            $stmt_po_item->execute();
            $po_item_data = $stmt_po_item->get_result()->fetch_assoc();
            $stmt_po_item->close();

            if (!$po_item_data) throw new Exception("Purchase Order Item ID {$po_item_id} not found.");
            if (!in_array($po_item_data['purchase_orders_status'], ['Ordered', 'Shipped', 'Partially Received'])) {
                throw new Exception("Cannot receive item ID {$po_item_id} because its PO is in status '{$po_item_data['purchase_orders_status']}'.");
            }
            
            $affected_po_ids[] = (int)$po_item_data['purchase_orders_id'];

            // --- Validate quantity ---
            $new_total_received = (float)$po_item_data['purchase_order_items_quantity_received'] + (float)$quantity_received;
            if ($new_total_received > (float)$po_item_data['purchase_order_items_quantity_ordered']) {
                throw new Exception("Quantity for item ID {$po_item_id} exceeds amount ordered.");
            }

            // --- Create Goods Receipt Item record (include production date if provided) ---
            // Accept optional production_date per item (YYYY-MM-DD). If not provided, default to today's date.
            $production_date = isset($item['production_date']) && strlen(trim((string)$item['production_date'])) > 0 ? $item['production_date'] : date('Y-m-d');

            $stmt_gri = $conn->prepare("INSERT INTO goods_receipt_items (goods_receipt_id, purchase_order_item_id, quantity_received, goods_receipt_items_production_date) VALUES (?, ?, ?, ?)");
            if (!$stmt_gri) throw new Exception("Prepare failed for goods receipt item.");
            $stmt_gri->bind_param("iids", $parent_receipt_id, $po_item_id, $quantity_received, $production_date);
            if (!$stmt_gri->execute()) throw new Exception("Error creating goods receipt item for PO item {$po_item_id}.");
            $stmt_gri->close();

            // --- Update PO Item quantity ---
            $stmt_update_poi = $conn->prepare("UPDATE purchase_order_items SET purchase_order_items_quantity_received = ? WHERE purchase_order_items_id = ?");
            if (!$stmt_update_poi) throw new Exception("Prepare failed for PO item update.");
            $stmt_update_poi->bind_param("di", $new_total_received, $po_item_id);
            if (!$stmt_update_poi->execute()) throw new Exception("Error updating quantity for PO item {$po_item_id}.");
            $stmt_update_poi->close();
            
            // --- Update Inventory ---
            $variant_id = (int)$po_item_data['purchase_order_items_variant_id'];
            $packaging_id = $po_item_data['purchase_order_items_packaging_type_id'] ? (int)$po_item_data['purchase_order_items_packaging_type_id'] : null;
                // Accept optional production_date per item (YYYY-MM-DD). If not provided, default to today's date.
                $production_date = isset($item['production_date']) && strlen(trim((string)$item['production_date'])) > 0 ? $item['production_date'] : date('Y-m-d');

            $stmt_check_inv = $conn->prepare("SELECT inventory_id, inventory_quantity FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? AND inventory_production_date = ? LIMIT 1");
            $stmt_check_inv->bind_param("iiis", $variant_id, $warehouse_id, $packaging_id, $production_date);
            $stmt_check_inv->execute();
            $inv_row = $stmt_check_inv->get_result()->fetch_assoc();
            $stmt_check_inv->close();

            $qty_after_op = 0;
            if ($inv_row) {
                $qty_after_op = (float)$inv_row['inventory_quantity'] + (float)$quantity_received;
                $stmt_update_inv = $conn->prepare("UPDATE inventory SET inventory_quantity = ?, inventory_last_movement_at = NOW() WHERE inventory_id = ?");
                $stmt_update_inv->bind_param("di", $qty_after_op, $inv_row['inventory_id']);
                $stmt_update_inv->execute();
                $stmt_update_inv->close();
            } else {
                $qty_after_op = (float)$quantity_received;
                $stmt_insert_inv = $conn->prepare("INSERT INTO inventory (variant_id, warehouse_id, packaging_type_id, inventory_production_date, inventory_quantity, inventory_status) VALUES (?, ?, ?, ?, ?, 'In Stock')");
                $stmt_insert_inv->bind_param("iiisd", $variant_id, $warehouse_id, $packaging_id, $production_date, $qty_after_op);
                $stmt_insert_inv->execute();
                $stmt_insert_inv->close();
            }

            // --- Log Movement ---
            log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_id, 'goods_receipt', $quantity_received, $qty_after_op, $received_by_user_id, $parent_receipt_id, "Received from PO Item ID: {$po_item_id}", $conn);
        }

        // --- 3. Update status of all affected Purchase Orders ---
        $unique_po_ids = array_unique($affected_po_ids);
        foreach ($unique_po_ids as $po_id) {
            $stmt_check_po = $conn->prepare("SELECT SUM(purchase_order_items_quantity_ordered) AS total_ordered, SUM(purchase_order_items_quantity_received) AS total_received FROM purchase_order_items WHERE purchase_order_items_purchase_order_id = ?");
            $stmt_check_po->bind_param("i", $po_id);
            $stmt_check_po->execute();
            $po_totals = $stmt_check_po->get_result()->fetch_assoc();
            $stmt_check_po->close();

            $new_status = null;
            if ($po_totals['total_ordered'] > 0 && $po_totals['total_ordered'] <= $po_totals['total_received']) {
                $new_status = 'Received';
            } elseif ($po_totals['total_received'] > 0) {
                $new_status = 'Partially Received';
            }

            if ($new_status) {
                $delivery_date_sql = ($new_status === 'Received') ? ", purchase_orders_actual_delivery_date = NOW()" : "";
                $stmt_update_po_status = $conn->prepare("UPDATE purchase_orders SET purchase_orders_status = ? {$delivery_date_sql} WHERE purchase_orders_id = ?");
                $stmt_update_po_status->bind_param("si", $new_status, $po_id);
                $stmt_update_po_status->execute();
                $stmt_update_po_status->close();
            }
        }

        $conn->commit();
        print_success("Goods receipt created successfully.", ['goods_receipt_id' => $parent_receipt_id, 'items_processed' => count($items)]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    } finally {
        if (isset($conn) && $conn instanceof mysqli) {
            $conn->close();
        }
    }
} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn instanceof mysqli) {
       $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
