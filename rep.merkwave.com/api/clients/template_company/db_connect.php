<?php
// db_connect.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, User-UUID, X-User-UUID, x-user-uuid");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

date_default_timezone_set('Africa/Cairo');

// Replace these placeholder values in the target environment.
$servername = "your_mysql_host";
$username = "template_company_user";
$password = "CHANGE_ME";
$dbname = "template_company_db";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
} else {
    $conn->set_charset("utf8mb4");
    try {
        $offset = (new DateTime('now', new DateTimeZone('Africa/Cairo')))->format('P');
        $conn->query("SET time_zone = '" . $conn->real_escape_string($offset) . "'");
    } catch (Exception $e) {
        error_log('Failed to set MySQL session time_zone (mysqli): ' . $e->getMessage());
    }
}

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    try {
        $offset = (new DateTime('now', new DateTimeZone('Africa/Cairo')))->format('P');
        $pdo->exec("SET time_zone = '" . $offset . "'");
    } catch (Exception $e) {
        error_log('Failed to set MySQL session time_zone (PDO): ' . $e->getMessage());
    }
} catch(PDOException $e) {
    die("PDO Connection failed: " . $e->getMessage());
}

include "functions.php";
// validate_user_session();

?>
