<?php
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed']);
    exit;
}

try {
    $code = $_POST['code'] ?? '';
    $name = $_POST['name'] ?? '';
    $type = $_POST['type'] ?? '';
    $sortid = isset($_POST['sortid']) ? intval($_POST['sortid']) : 0;

    if (empty($code) || empty($name) || empty($type)) {
        echo json_encode(['status' => 'error', 'message' => 'Code, Name, and Type are required']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO accounts (code, name, type, sortid) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sssi", $code, $name, $type, $sortid);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Account added successfully', 'id' => $stmt->insert_id]);
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
