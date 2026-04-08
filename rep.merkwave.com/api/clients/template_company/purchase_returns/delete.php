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
    
    $user_role = $user_data['users_role'];
    
        // Check permissions - only admin, manager, and cash role can delete purchase returns
    if (!in_array($user_role, ['admin', 'manager', 'cash'])) {
        print_failure("Error: Insufficient permissions to delete purchase returns.");
        exit;
    }

    $purchase_returns_id = $_POST['purchase_returns_id'] ?? null;

    // Basic Validation
    if (empty($purchase_returns_id) || !is_numeric($purchase_returns_id) || $purchase_returns_id <= 0) {
        print_failure("Error: Valid Purchase Return ID is required.");
        exit;
    }

    $conn->begin_transaction();

    try {
        // 1. Check if purchase return exists and get details for supplier balance adjustment
        $stmt_check_pr = $conn->prepare("
            SELECT purchase_returns_id, purchase_returns_supplier_id, purchase_returns_total_amount, purchase_returns_status 
            FROM purchase_returns 
            WHERE purchase_returns_id = ? 
            LIMIT 1
        ");
        if (!$stmt_check_pr) throw new Exception("Prepare failed for purchase return check: " . $conn->error);
        
        $stmt_check_pr->bind_param("i", $purchase_returns_id);
        $stmt_check_pr->execute();
        $result_check = $stmt_check_pr->get_result();
        $existing_pr = $result_check->fetch_assoc();
        $stmt_check_pr->close();

        if (!$existing_pr) {
            print_failure("Error: Purchase Return with ID " . $purchase_returns_id . " does not exist.");
            exit;
        }

        $supplier_id = $existing_pr['purchase_returns_supplier_id'];
        $total_amount = (float)$existing_pr['purchase_returns_total_amount'];
        $current_status = $existing_pr['purchase_returns_status'];

        // 2. Check if purchase return can be deleted (not processed or has dependencies)
        if ($current_status === 'Processed') {
            print_failure("Error: Cannot delete a processed purchase return. Please cancel it first.");
            exit;
        }

        // 3. Check for related records that might prevent deletion
        // Note: We allow deletion of purchase returns even with items, as they should be cascade deleted
        
        // 4. Delete purchase return items first (cascade delete)
        $stmt_delete_items = $conn->prepare("DELETE FROM purchase_return_items WHERE purchase_return_items_return_id = ?");
        if (!$stmt_delete_items) throw new Exception("Prepare failed for purchase return items delete: " . $conn->error);
        
        $stmt_delete_items->bind_param("i", $purchase_returns_id);
        if (!$stmt_delete_items->execute()) throw new Exception("Error deleting purchase return items: " . $stmt_delete_items->error);
        
        $deleted_items_count = $stmt_delete_items->affected_rows;
        $stmt_delete_items->close();

        // 5. Delete the purchase return record
        $stmt_delete_pr = $conn->prepare("DELETE FROM purchase_returns WHERE purchase_returns_id = ?");
        if (!$stmt_delete_pr) throw new Exception("Prepare failed for purchase return delete: " . $conn->error);
        
        $stmt_delete_pr->bind_param("i", $purchase_returns_id);
        if (!$stmt_delete_pr->execute()) throw new Exception("Error deleting purchase return: " . $stmt_delete_pr->error);
        
        if ($stmt_delete_pr->affected_rows === 0) {
            throw new Exception("No purchase return was deleted. It may have been deleted by another user.");
        }
        $stmt_delete_pr->close();

        // 6. Update supplier balance if the purchase return was affecting it
        // If the return was approved or processed, we need to reverse the balance adjustment
        if (in_array($current_status, ['Approved', 'Processed'])) {
            $stmt_update_supplier_balance = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance + ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance) throw new Exception("Prepare failed for supplier balance update: " . $conn->error);
            
            $stmt_update_supplier_balance->bind_param("di", $total_amount, $supplier_id);
            if (!$stmt_update_supplier_balance->execute()) throw new Exception("Error updating supplier balance: " . $stmt_update_supplier_balance->error);
            $stmt_update_supplier_balance->close();
        }

        $conn->commit();
        print_success("Purchase Return deleted successfully.", [
            'purchase_returns_id' => $purchase_returns_id,
            'supplier_id' => $supplier_id,
            'deleted_items_count' => $deleted_items_count,
            'total_amount' => $total_amount,
            'previous_status' => $current_status,
            'balance_adjusted' => in_array($current_status, ['Approved', 'Processed'])
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
