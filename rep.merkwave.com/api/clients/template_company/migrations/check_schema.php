<?php
require_once __DIR__ . '/../db_connect.php';
$result = $conn->query("DESCRIBE clients");
while ($row = $result->fetch_assoc()) {
    echo $row['Field'] . "\n";
}
?>