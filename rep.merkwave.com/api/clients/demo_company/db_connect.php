<?php
// demo_company/db_connect.php — Isolated database for demo tenant

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, User-UUID, X-User-UUID, x-user-uuid");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

date_default_timezone_set('Africa/Cairo');

// ── Demo tenant DB credentials (isolated from production) ───────
$servername = "mysql";                    // Docker service name
$username   = "demo_company_user";
$password   = "demo_company_secure_pass"; // Change to a strong password in production
$dbname     = "demo_company_db";
// ────────────────────────────────────────────────────────────────

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(["status" => "failure", "message" => "Database connection failed."]));
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
    die(json_encode(["status" => "failure", "message" => "PDO connection failed."]));
}

include "functions.php";
?>
