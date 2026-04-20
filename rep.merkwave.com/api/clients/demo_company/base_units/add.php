<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $base_units_name        = $_POST['base_units_name']        ?? null;
    $base_units_description = $_POST['base_units_description'] ?? null;

    if ($base_units_description === "") {$base_units_description = null;}

    if (empty($base_units_name)) {
        print_failure("Error: Base unit name is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO base_units (base_units_name, base_units_description)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ss", 
            $base_units_name, 
            $base_units_description
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting base unit: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Base unit added successfully.", ['base_units_id' => $new_id, 'base_units_name' => $base_units_name]);

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
