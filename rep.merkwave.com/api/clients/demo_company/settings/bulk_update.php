<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Only admin can bulk update settings

    // Check if request has file uploads (FormData) or JSON
    $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
    $is_multipart = strpos($content_type, 'multipart/form-data') !== false;
    
    $data = [];
    
    if ($is_multipart) {
        // Handle FormData (with possible file uploads)
        $data = $_POST;
        
        // Handle file upload for company_logo if present
        if (isset($_FILES['company_logo']) && $_FILES['company_logo']['error'] === UPLOAD_ERR_OK) {
            $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $max_size = 5 * 1024 * 1024; // 5MB
            
            try {
                // Get the old logo URL to delete it later
                $old_logo_stmt = $conn->prepare("SELECT settings_value FROM settings WHERE settings_key = 'company_logo'");
                $old_logo_stmt->execute();
                $old_logo_result = $old_logo_stmt->get_result();
                $old_logo_url = null;
                
                if ($old_logo_result->num_rows > 0) {
                    $old_logo_data = $old_logo_result->fetch_assoc();
                    $old_logo_url = $old_logo_data['settings_value'];
                }
                $old_logo_stmt->close();
                
                // Use the existing handle_image_upload function
                $uploaded_image_db_path = handle_image_upload($_FILES['company_logo'], 'company/', $allowed_types, $max_size);
                
                if ($uploaded_image_db_path) {
                    // Prepend the full domain URL like client images
                    $uploaded_image_url = "https://your-domain.example/{$uploaded_image_db_path}";
                    $data['company_logo'] = $uploaded_image_url;
                    
                    // Delete old logo file if it exists and is not a base64 image
                    if ($old_logo_url && !str_starts_with($old_logo_url, 'data:image')) {
                        // Extract the file path from URL
                        $url_parts = parse_url($old_logo_url);
                        $path = $url_parts['path'] ?? $old_logo_url;
                        
                        // Convert URL path to server file path
                        if (strpos($path, 'uploads/images/') !== false) {
                            $relative_path = substr($path, strpos($path, 'uploads/images/'));
                            $old_file_path = __DIR__ . '/../' . $relative_path;
                            
                            if (file_exists($old_file_path)) {
                                @unlink($old_file_path); // Delete old file silently
                            }
                        }
                    }
                } else {
                    print_failure("Error: Company logo upload failed.");
                }
            } catch (Exception $e) {
                print_failure("Error uploading company logo: " . $e->getMessage());
            }
        }
    } else {
        // Handle JSON data
        $json_data = file_get_contents('php://input');
        $data = json_decode($json_data, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            print_failure("Error: Invalid JSON data provided.");
        }
    }
    
    if (empty($data) || !is_array($data)) {
        print_failure("Error: Settings data is required as an array.");
    }
    
    $valid_types = ['string', 'integer', 'decimal', 'boolean', 'datetime', 'json'];
    $updated_settings = [];
    $errors = [];
    
    $conn->begin_transaction();
    
    try {
        // Prepare the update statement
        $stmt = $conn->prepare("
            UPDATE settings 
            SET settings_value = ?, settings_updated_at = NOW() 
            WHERE settings_key = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare failed for bulk update: " . $conn->error);
        }
        
        foreach ($data as $setting_key => $setting_value) {
            // First, get the current setting to validate type
            $check_stmt = $conn->prepare("SELECT settings_type FROM settings WHERE settings_key = ?");
            if (!$check_stmt) {
                throw new Exception("Prepare failed for type check: " . $conn->error);
            }
            
            $check_stmt->bind_param("s", $setting_key);
            $check_stmt->execute();
            $result = $check_stmt->get_result();
            
            if ($result->num_rows === 0) {
                $errors[] = "Setting key '$setting_key' not found.";
                $check_stmt->close();
                continue;
            }
            
            $setting_data = $result->fetch_assoc();
            $setting_type = $setting_data['settings_type'];
            $check_stmt->close();
            
            // Validate value based on type (skip validation for company_logo as it's already uploaded)
            if ($setting_value !== null && $setting_key !== 'company_logo') {
                $validation_error = null;
                
                switch ($setting_type) {
                    case 'integer':
                        if (!is_numeric($setting_value) || floor($setting_value) != $setting_value) {
                            $validation_error = "Setting '$setting_key' must be a valid integer.";
                        }
                        break;
                    case 'decimal':
                        if (!is_numeric($setting_value)) {
                            $validation_error = "Setting '$setting_key' must be a valid decimal number.";
                        }
                        break;
                    case 'boolean':
                        if (!in_array(strtolower($setting_value), ['true', 'false', '1', '0'])) {
                            $validation_error = "Setting '$setting_key' must be 'true', 'false', '1', or '0'.";
                        }
                        break;
                    case 'datetime':
                        if (!strtotime($setting_value)) {
                            $validation_error = "Setting '$setting_key' must be a valid datetime.";
                        }
                        break;
                    case 'json':
                        if (json_decode($setting_value) === null && json_last_error() !== JSON_ERROR_NONE) {
                            $validation_error = "Setting '$setting_key' must be valid JSON.";
                        }
                        break;
                }
                
                if ($validation_error) {
                    $errors[] = $validation_error;
                    continue;
                }
            }
            
            // Update the setting
            $stmt->bind_param("ss", $setting_value, $setting_key);
            
            if (!$stmt->execute()) {
                throw new Exception("Error updating setting '$setting_key': " . $stmt->error);
            }
            
            if ($stmt->affected_rows > 0) {
                $updated_settings[] = $setting_key;
            }
        }
        
        $stmt->close();
        
        if (!empty($errors)) {
            $conn->rollback();
            print_failure("Validation errors occurred: " . implode('; ', $errors));
        }
        
        $conn->commit();
        
        print_success("Settings updated successfully.", [
            'updated_count' => count($updated_settings),
            'updated_settings' => $updated_settings,
            'errors' => $errors
        ]);
        
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
    if (isset($check_stmt) && $check_stmt !== false) {
        $check_stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
