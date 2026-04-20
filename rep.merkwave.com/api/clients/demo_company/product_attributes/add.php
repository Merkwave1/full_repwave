<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $attribute_name        = $_POST['attribute_name']        ?? null;
    $attribute_description = $_POST['attribute_description'] ?? null;

    if ($attribute_description === "") {$attribute_description = null;}

    if (empty($attribute_name)) {
        print_failure("Error: Attribute name is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO product_attributes (attribute_name, attribute_description)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ss", 
            $attribute_name, 
            $attribute_description
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting product attribute: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Product attribute added successfully.", ['attribute_id' => $new_id, 'attribute_name' => $attribute_name]);

    } catch (Exception $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage());
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
