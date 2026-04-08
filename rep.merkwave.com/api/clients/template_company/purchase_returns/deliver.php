<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check authentication
    $users_uuid = $_POST['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    
    if (!$users_uuid) {
        print_failure("Error: User UUID is required.");
        exit;
    }
    
    // Get user details
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user check: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    
    if (!$user_data) {
        print_failure("Error: Invalid user session.");
        exit;
    }
    
    $user_id = $user_data['users_id'];
    $user_role = $user_data['users_role'];
    
    // Check permissions
    if (!in_array($user_role, ['admin', 'manager', 'cash'])) {
        print_failure("Error: Insufficient permissions to deliver purchase returns.");
        exit;
    }

    $purchase_return_id = $_POST['purchase_return_id'] ?? null;
    $delivery_date = $_POST['delivery_date'] ?? date('Y-m-d H:i:s');
    $delivery_notes = $_POST['delivery_notes'] ?? null;

    if (!$purchase_return_id) {
        print_failure("Error: Purchase return ID is required.");
        exit;
    }

    // Start transaction
    $conn->begin_transaction();

    // Get purchase return details
    $stmt_pr = $conn->prepare("
        SELECT pr.*, po.purchase_orders_warehouse_id 
        FROM purchase_returns pr 
        LEFT JOIN purchase_orders po ON pr.purchase_returns_purchase_order_id = po.purchase_orders_id 
        WHERE pr.purchase_returns_id = ? AND pr.purchase_returns_status = 'Approved'
    ");
    if (!$stmt_pr) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt_pr->bind_param("i", $purchase_return_id);
    $stmt_pr->execute();
    $pr_result = $stmt_pr->get_result();
    $purchase_return = $pr_result->fetch_assoc();
    $stmt_pr->close();

    if (!$purchase_return) {
        print_failure("Error: Purchase return not found or not approved.");
        exit;
    }

    $warehouse_id = $purchase_return['purchase_orders_warehouse_id'];

    // Get purchase return items
    $stmt_items = $conn->prepare("
        SELECT 
            pri.*,
            poi.purchase_order_items_variant_id,
            poi.purchase_order_items_packaging_type_id,
            poi.purchase_order_items_quantity_ordered,
            poi.purchase_order_items_quantity_received,
            po.purchase_orders_status
        FROM purchase_return_items pri
        JOIN purchase_order_items poi ON pri.purchase_return_items_purchase_order_item_id = poi.purchase_order_items_id
        JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
        WHERE pri.purchase_return_items_return_id = ?
    ");
    if (!$stmt_items) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt_items->bind_param("i", $purchase_return_id);
    $stmt_items->execute();
    $items_result = $stmt_items->get_result();

    // Process each returned item - Note: inventory was already adjusted when return was approved in add.php
    while ($item = $items_result->fetch_assoc()) {
        $variant_id = $item['purchase_order_items_variant_id'];
        $packaging_id = $item['purchase_order_items_packaging_type_id'];
        $return_quantity = (float)$item['purchase_return_items_quantity'];
        $qty_ordered = (float)$item['purchase_order_items_quantity_ordered'];
        $qty_received = (float)$item['purchase_order_items_quantity_received'];
        $po_status = $item['purchase_orders_status'];

        // Calculate warehouse return portion for logging purposes
        $qty_not_received = $qty_ordered - $qty_received;
        $warehouse_return_qty = max(0, $return_quantity - $qty_not_received);

        // Log the delivery without modifying inventory (inventory was already adjusted when return was created)
        if ($warehouse_return_qty > 0 && function_exists('log_inventory_movement_internal')) {
            log_inventory_movement_internal(
                $variant_id, 
                $packaging_id, 
                $warehouse_id, 
                'purchase_return_delivered', 
                0, // No quantity change as it was already deducted in add.php
                0, // Current quantity not relevant here
                $user_id, 
                $purchase_return_id, 
                "Purchase return delivered - warehouse portion ($warehouse_return_qty) was already deducted from inventory", 
                $conn
            );
        }

        // Log pending returns (no inventory impact)
        $pending_return_qty = $return_quantity - $warehouse_return_qty;
        if ($pending_return_qty > 0 && function_exists('log_inventory_movement_internal')) {
            log_inventory_movement_internal(
                $variant_id, 
                $packaging_id, 
                $warehouse_id, 
                'purchase_return_delivered', 
                0, 
                0, 
                $user_id, 
                $purchase_return_id, 
                "Purchase return delivered - pending items portion ($pending_return_qty) - no inventory impact", 
                $conn
            );
        }
    }
    $stmt_items->close();

    // Update purchase return status to "Delivered"
    $stmt_update_pr = $conn->prepare("
        UPDATE purchase_returns 
        SET purchase_returns_status = 'Delivered', 
            purchase_returns_updated_at = NOW() 
        WHERE purchase_returns_id = ?
    ");
    if (!$stmt_update_pr) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt_update_pr->bind_param("i", $purchase_return_id);
    $stmt_update_pr->execute();
    $stmt_update_pr->close();

    // Commit transaction
    $conn->commit();

    print_success("Purchase return delivered successfully. Inventory was already adjusted when return was created.", [
        'purchase_return_id' => $purchase_return_id,
        'delivery_date' => $delivery_date,
        'status' => 'Delivered'
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
