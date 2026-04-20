<?php
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed']);
    exit;
}

try {
    $id = isset($_POST['accounts_id']) ? intval($_POST['accounts_id']) : 0;

    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Valid ID is required']);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM accounts WHERE accounts_id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Account deleted successfully']);
    } else {
        throw new Exception($stmt->error);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
?>
