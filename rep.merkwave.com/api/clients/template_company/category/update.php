<?php
require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $categories_id          = $_POST['categories_id']          ?? null;
    $categories_name        = $_POST['categories_name']        ?? null;
    $categories_description = $_POST['categories_description'] ?? null; // New field

    // Handle empty string for nullable description
    if (array_key_exists('categories_description', $_POST) && $_POST['categories_description'] === "") {$categories_description = null;}

    if (empty($categories_id) || !is_numeric($categories_id) || $categories_id <= 0) {
        print_failure("Error: Valid Category ID is required.");
        exit;
    }

    $update_fields = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($categories_name)) {
        $update_fields[] = "categories_name = ?";
        $bind_types .= "s";
        $bind_params[] = $categories_name;
    }

    if (array_key_exists('categories_description', $_POST)) { // Check if explicitly provided
        $update_fields[] = "categories_description = ?";
        $bind_types .= "s";
        $bind_params[] = $categories_description;
    }

    if (empty($update_fields)) {
        print_failure("Error: No valid fields provided for update.");
        exit;
    }

    $sql = "UPDATE categories SET " . implode(", ", $update_fields) . " WHERE categories_id = ?";
    $bind_types .= "i"; 
    $bind_params[] = $categories_id;

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for update: " . $conn->error);
    }

    $stmt->bind_param($bind_types, ...$bind_params);

    $conn->begin_transaction();

    try {
        if (!$stmt->execute()) {
            throw new Exception("Error updating category: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Category with ID " . $categories_id . " not found or no changes were made.");
        }

        $conn->commit();
        print_success("Category updated successfully.", ['categories_id' => $categories_id]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
