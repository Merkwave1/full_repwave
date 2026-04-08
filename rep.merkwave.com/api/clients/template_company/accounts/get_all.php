<?php
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../functions.php';

try {
    $type = isset($_GET['type']) ? $_GET['type'] : null;
    
    if ($type) {
        $stmt = $conn->prepare("SELECT * FROM accounts WHERE type = ? ORDER BY sortid ASC, name ASC");
        $stmt->bind_param("s", $type);
    } else {
        $stmt = $conn->prepare("SELECT * FROM accounts ORDER BY sortid ASC, name ASC");
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        $accounts[] = $row;
    }
    
    echo json_encode(['status' => 'success', 'data' => $accounts]);
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
?>
