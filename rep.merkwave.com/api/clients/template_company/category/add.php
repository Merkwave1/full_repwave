<?php
require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $categories_name        = $_POST['categories_name']        ?? null;
    $categories_description = $_POST['categories_description'] ?? null; // New field

    // Handle empty string for nullable description
    if ($categories_description === "") {$categories_description = null;}

    if (empty($categories_name)) {
        print_failure("Error: Category name is required.");
        exit;
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO categories (categories_name, categories_description)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ss", $categories_name, $categories_description);

        if (!$stmt->execute()) {
            throw new Exception("Error inserting category: " . $stmt->error);
        }

        $new_category_id = $stmt->insert_id;
        $conn->commit();
        print_success("Category created successfully.", ['categories_id' => $new_category_id, 'categories_name' => $categories_name]);

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
