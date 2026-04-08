<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check if user is authenticated using UUID
    $users_uuid = $_POST['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    
    if (!$users_uuid) {
        print_failure("Error: User UUID is required. Please log in first.");
        exit;
    }
    
    // Get user ID and role using UUID
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
        print_failure("Error: Invalid user session. Please log in again.");
        exit;
    }
    
    $purchase_returns_updated_by_user_id = $user_data['users_id'];
    $user_role = $user_data['users_role'];
    
        // Check permissions - only admin, manager, employee, and cash role can update purchase returns
    if (!in_array($user_role, ['admin', 'manager', 'employee', 'cash'])) {
        print_failure("Error: Insufficient permissions to update purchase returns.");
        exit;
    }

    $purchase_returns_id                   = $_POST['purchase_returns_id']                   ?? null;
    $purchase_returns_supplier_id          = $_POST['purchase_returns_supplier_id']          ?? null;
    $purchase_returns_purchase_order_id    = $_POST['purchase_returns_purchase_order_id']    ?? null; // Optional
    $purchase_returns_date                 = $_POST['purchase_returns_date']                 ?? null;
    $purchase_returns_reason               = $_POST['purchase_returns_reason']               ?? null;
    $purchase_returns_status               = 'Approved'; // Always set to Approved
    $purchase_returns_notes                = $_POST['purchase_returns_notes']                ?? null;
    $purchase_return_items_data            = json_decode($_POST['purchase_return_items'] ?? '[]', true); // Array of items

    // Handle empty strings for nullable fields
    if ($purchase_returns_purchase_order_id === "") {$purchase_returns_purchase_order_id = null;}
    if ($purchase_returns_reason === "") {$purchase_returns_reason = null;}
    if ($purchase_returns_notes === "") {$purchase_returns_notes = null;}

    // Basic Validation
    if (empty($purchase_returns_id) || !is_numeric($purchase_returns_id) || $purchase_returns_id <= 0) {
        print_failure("Error: Valid Purchase Return ID is required.");
        exit;
    }
    if (empty($purchase_returns_supplier_id) || !is_numeric($purchase_returns_supplier_id) || $purchase_returns_supplier_id <= 0) {
        print_failure("Error: Valid Supplier ID is required.");
        exit;
    }
    if ($purchase_returns_purchase_order_id !== null && (!is_numeric($purchase_returns_purchase_order_id) || $purchase_returns_purchase_order_id <= 0)) {
        print_failure("Error: Invalid Purchase Order ID provided.");
        exit;
    }
    if (empty($purchase_returns_date) || !strtotime($purchase_returns_date)) {
        print_failure("Error: Valid return date is required.");
        exit;
    }
    if (empty($purchase_return_items_data) || !is_array($purchase_return_items_data)) {
        print_failure("Error: At least one purchase return item is required.");
        exit;
    }

    $conn->begin_transaction();

    try {
        // Check if purchase return exists
        $stmt_check_pr = $conn->prepare("SELECT purchase_returns_id, purchase_returns_status FROM purchase_returns WHERE purchase_returns_id = ? LIMIT 1");
        if (!$stmt_check_pr) throw new Exception("Prepare failed for purchase return check: " . $conn->error);
        $stmt_check_pr->bind_param("i", $purchase_returns_id);
        $stmt_check_pr->execute();
        $result_check = $stmt_check_pr->get_result();
        $existing_pr = $result_check->fetch_assoc();
        $stmt_check_pr->close();

        if (!$existing_pr) {
            print_failure("Error: Purchase Return with ID " . $purchase_returns_id . " does not exist.");
        }

        $old_status = $existing_pr['purchase_returns_status'];

        // Check if supplier exists
        $stmt_check_supplier = $conn->prepare("SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1");
        if (!$stmt_check_supplier) throw new Exception("Prepare failed for supplier check: " . $conn->error);
        $stmt_check_supplier->bind_param("i", $purchase_returns_supplier_id);
        $stmt_check_supplier->execute();
        if ($stmt_check_supplier->get_result()->num_rows === 0) {
            print_failure("Error: Supplier ID " . $purchase_returns_supplier_id . " does not exist.");
        }
        $stmt_check_supplier->close();

        // Calculate new total amount from items
        $calculated_total_amount = 0.00;
        foreach ($purchase_return_items_data as $item) {
            if (empty($item['purchase_order_item_id']) || !is_numeric($item['purchase_order_item_id']) || $item['purchase_order_item_id'] <= 0 ||
                empty($item['quantity']) || !is_numeric($item['quantity']) || $item['quantity'] <= 0 ||
                empty($item['unit_cost']) || !is_numeric($item['unit_cost']) || $item['unit_cost'] < 0) {
                print_failure("Error: Invalid item data (purchase order item ID, quantity, or unit cost).");
                exit;
            }
            $calculated_total_amount += (float)$item['quantity'] * (float)$item['unit_cost'];
        }

        // Calculate old total amount for supplier balance adjustment
        $stmt_old_total = $conn->prepare("SELECT purchase_returns_total_amount FROM purchase_returns WHERE purchase_returns_id = ? LIMIT 1");
        if (!$stmt_old_total) throw new Exception("Prepare failed for old total fetch: " . $conn->error);
        $stmt_old_total->bind_param("i", $purchase_returns_id);
        $stmt_old_total->execute();
        $result_old_total = $stmt_old_total->get_result();
        $old_total_data = $result_old_total->fetch_assoc();
        $old_total_amount = (float)$old_total_data['purchase_returns_total_amount'];
        $stmt_old_total->close();

        // 1. Update the purchase_returns table
        $stmt_update_pr = $conn->prepare("
            UPDATE purchase_returns SET 
                purchase_returns_supplier_id = ?, 
                purchase_returns_purchase_order_id = ?, 
                purchase_returns_date = ?, 
                purchase_returns_reason = ?, 
                purchase_returns_total_amount = ?, 
                purchase_returns_status = ?, 
                purchase_returns_notes = ?,
                purchase_returns_updated_at = NOW()
            WHERE purchase_returns_id = ?
        ");

        if (!$stmt_update_pr) {
            throw new Exception("Prepare failed for purchase return update: " . $conn->error);
        }

        $stmt_update_pr->bind_param("iissdssi", 
            $purchase_returns_supplier_id, 
            $purchase_returns_purchase_order_id, 
            $purchase_returns_date, 
            $purchase_returns_reason, 
            $calculated_total_amount, 
            $purchase_returns_status, 
            $purchase_returns_notes,
            $purchase_returns_id
        );

        if (!$stmt_update_pr->execute()) {
            throw new Exception("Error updating purchase return: " . $stmt_update_pr->error);
        }
        $stmt_update_pr->close();

        // 2. Delete existing purchase return items
        $stmt_delete_items = $conn->prepare("DELETE FROM purchase_return_items WHERE purchase_return_items_return_id = ?");
        if (!$stmt_delete_items) throw new Exception("Prepare failed for purchase return items delete: " . $conn->error);
        $stmt_delete_items->bind_param("i", $purchase_returns_id);
        if (!$stmt_delete_items->execute()) throw new Exception("Error deleting existing purchase return items: " . $stmt_delete_items->error);
        $stmt_delete_items->close();

        // 3. Insert new purchase return items
        $stmt_pr_item_insert = $conn->prepare("
            INSERT INTO purchase_return_items (
                purchase_return_items_return_id, purchase_return_items_purchase_order_item_id, 
                purchase_return_items_quantity, purchase_return_items_unit_cost, 
                purchase_return_items_total_cost, purchase_return_items_notes
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");

        if (!$stmt_pr_item_insert) {
            throw new Exception("Prepare failed for purchase return item insert: " . $conn->error);
        }

        foreach ($purchase_return_items_data as $item) {
            $item_total = (float)$item['quantity'] * (float)$item['unit_cost'];
            $item_notes = $item['notes'] ?? null;
            if ($item_notes === "") {$item_notes = null;}

            $stmt_pr_item_insert->bind_param("iiddds", 
                $purchase_returns_id, 
                $item['purchase_order_item_id'], 
                $item['quantity'], 
                $item['unit_cost'], 
                $item_total, 
                $item_notes
            );
            if (!$stmt_pr_item_insert->execute()) {
                throw new Exception("Error inserting purchase return item for PO item ID " . $item['purchase_order_item_id'] . ": " . $stmt_pr_item_insert->error);
            }
        }
        $stmt_pr_item_insert->close();

        // 4. Update supplier balance based on status changes
        $balance_adjustment = 0.00;
        
        // If old status was affecting balance, reverse it
        if (in_array($old_status, ['Approved', 'Processed'])) {
            $balance_adjustment += $old_total_amount; // Add back old amount
        }
        
        // If new status affects balance, apply it
        if (in_array($purchase_returns_status, ['Approved', 'Processed'])) {
            $balance_adjustment -= $calculated_total_amount; // Subtract new amount
        }

        if ($balance_adjustment != 0.00) {
            $stmt_update_supplier_balance = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance + ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance) throw new Exception("Prepare failed for supplier balance update: " . $conn->error);
            $stmt_update_supplier_balance->bind_param("di", $balance_adjustment, $purchase_returns_supplier_id);
            if (!$stmt_update_supplier_balance->execute()) throw new Exception("Error updating supplier balance: " . $stmt_update_supplier_balance->error);
            $stmt_update_supplier_balance->close();
        }

        $conn->commit();
        print_success("Purchase Return updated successfully.", [
            'purchase_returns_id' => $purchase_returns_id, 
            'total_amount' => $calculated_total_amount, 
            'items_count' => count($purchase_return_items_data),
            'status_changed' => ($old_status !== $purchase_returns_status)
        ]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    }

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn !== false) {
        $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
