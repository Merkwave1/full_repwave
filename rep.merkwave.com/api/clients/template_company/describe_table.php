<?php
include "db_connect.php";
$result = $conn->query("DESCRIBE safe_transactions");
$columns = [];
while($row = $result->fetch_assoc()) {
    $columns[] = $row;
}
echo json_encode($columns, JSON_PRETTY_PRINT);
?>