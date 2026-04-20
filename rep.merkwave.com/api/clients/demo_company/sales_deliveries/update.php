<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $delivery_id = $_POST['delivery_id'] ?? null;
    $delivery_status = $_POST['delivery_status'] ?? null;
    $delivery_notes = $_POST['delivery_notes'] ?? null;
    $delivery_address = $_POST['delivery_address'] ?? null;

    if (empty($delivery_id) || !is_numeric($delivery_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Valid delivery ID is required']);
        exit;
    }

    if (!in_array($delivery_status, ['Preparing', 'Shipped', 'Delivered', 'Failed'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid delivery status']);
        exit;
    }

    $conn->begin_transaction();

    try {
        // Update delivery record
        $stmt = $conn->prepare("
            UPDATE sales_deliveries 
            SET 
                sales_deliveries_delivery_status = ?,
                sales_deliveries_delivery_notes = ?,
                sales_deliveries_delivery_address = ?,
                sales_deliveries_updated_at = NOW()
            WHERE sales_deliveries_id = ?
        ");

        $stmt->bind_param("sssi", $delivery_status, $delivery_notes, $delivery_address, $delivery_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to update delivery");
        }

        $affected_rows = $stmt->affected_rows;
        $stmt->close();

        if ($affected_rows === 0) {
            throw new Exception("Delivery not found or no changes made");
        }

        $conn->commit();

        echo json_encode([
            'status' => 'success',
            'message' => 'Delivery updated successfully',
            'delivery_id' => (int)$delivery_id
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to update delivery: ' . $e->getMessage()
        ]);
    }

} catch (Exception | TypeError $e) {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'line' => $e->getLine()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

?>
