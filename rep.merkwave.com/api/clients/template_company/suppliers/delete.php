<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $supplier_id = $_POST['supplier_id'] ?? null;

    if (empty($supplier_id) || !is_numeric($supplier_id) || $supplier_id <= 0) {
        print_failure("Error: Valid Supplier ID is required.");
    }

    $conn->begin_transaction();

    try {
        // Optional: Check for related purchase orders or invoices to give clearer message
        $relatedCounts = [];
        try {
            $checkStmt = $conn->prepare("SELECT COUNT(*) as c FROM purchase_orders WHERE supplier_id = ?");
            if ($checkStmt) {
                $checkStmt->bind_param('i', $supplier_id);
                $checkStmt->execute();
                $res = $checkStmt->get_result();
                $row = $res->fetch_assoc();
                $relatedCounts['purchase_orders'] = (int)($row['c'] ?? 0);
                $checkStmt->close();
            }
        } catch (Exception $inner) {
            // Ignore related check failure, continue delete
        }

        $stmt = $conn->prepare("DELETE FROM suppliers WHERE supplier_id = ?");
        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }
        $stmt->bind_param('i', $supplier_id);
        if (!$stmt->execute()) {
            throw new Exception("Error deleting supplier: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Supplier with ID " . $supplier_id . " not found.");
        }

    // If there are related purchase orders, we already deleted supplier only if allowed by schema;
    // If constraint prevents it, exception would have been thrown earlier.
    $conn->commit();
        if (!empty($relatedCounts) && ($relatedCounts['purchase_orders'] ?? 0) > 0) {
            print_success("Supplier deleted successfully. Note: It had " . $relatedCounts['purchase_orders'] . " related purchase orders (records remain referencing removed supplier ID)." );
        } else {
            print_success("Supplier deleted successfully.");
        }
        exit;

    } catch (Exception $e) {
        $conn->rollback();
        // Provide friendlier foreign key message
        $msg = $e->getMessage();
        if (stripos($msg, 'foreign key') !== false || stripos($msg, 'constraint') !== false) {
            print_failure("Cannot delete supplier: related records exist (purchase orders, invoices, or transactions). Delete/adjust them first.");
        } else {
            throw $e;
        }
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
