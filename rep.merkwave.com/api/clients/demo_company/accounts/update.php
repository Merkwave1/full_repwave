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
    $code = $_POST['code'] ?? '';
    $name = $_POST['name'] ?? '';
    $type = $_POST['type'] ?? '';
    $sortid = isset($_POST['sortid']) ? intval($_POST['sortid']) : 0;

    if ($id <= 0 || empty($code) || empty($name) || empty($type)) {
        echo json_encode(['status' => 'error', 'message' => 'ID, Code, Name, and Type are required']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE accounts SET code = ?, name = ?, type = ?, sortid = ? WHERE accounts_id = ?");
    $stmt->bind_param("sssii", $code, $name, $type, $sortid, $id);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Account updated successfully']);
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
