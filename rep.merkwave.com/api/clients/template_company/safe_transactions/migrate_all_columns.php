<?php
/**
 * Add missing columns to safe_transactions table
 * Run this script to add receipt_image and status columns if they don't exist
 */

// Include database connection
require_once '../db_connect.php';

// Set response header
header('Content-Type: application/json');

try {
    $operations = [];
    
    // Check if receipt_image column exists
    $check_receipt = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_receipt_image'";
    $receipt_result = $conn->query($check_receipt);
    
    if ($receipt_result->num_rows == 0) {
        // Add receipt_image column
        $add_receipt = "ALTER TABLE `safe_transactions` 
                      ADD COLUMN `safe_transactions_receipt_image` VARCHAR(500) DEFAULT NULL 
                      AFTER `safe_transactions_reference`";
        
        if ($conn->query($add_receipt) === TRUE) {
            $operations[] = "✓ Added receipt_image column";
        } else {
            throw new Exception("Failed to add receipt_image column: " . $conn->error);
        }
    } else {
        $operations[] = "- Receipt_image column already exists";
    }
    
    // Check if status column exists
    $check_status = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_status'";
    $status_result = $conn->query($check_status);
    
    if ($status_result->num_rows == 0) {
        // Add status column
        $add_status = "ALTER TABLE `safe_transactions` 
                      ADD COLUMN `safe_transactions_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' 
                      AFTER `safe_transactions_receipt_image`";
        
        if ($conn->query($add_status) === TRUE) {
            $operations[] = "✓ Added status column";
        } else {
            $operations[] = "! Status column creation failed: " . $conn->error;
        }
    } else {
        $operations[] = "- Status column already exists";
    }
    
    // Check if approved_by column exists
    $check_approved_by = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_approved_by'";
    $approved_by_result = $conn->query($check_approved_by);
    
    if ($approved_by_result->num_rows == 0) {
        // Add approved_by column
        $add_approved_by = "ALTER TABLE `safe_transactions` 
                          ADD COLUMN `safe_transactions_approved_by` INT DEFAULT NULL 
                          AFTER `safe_transactions_status`";
        
        if ($conn->query($add_approved_by) === TRUE) {
            $operations[] = "✓ Added approved_by column";
        } else {
            $operations[] = "! Approved_by column creation failed: " . $conn->error;
        }
    } else {
        $operations[] = "- Approved_by column already exists";
    }
    
    // Check if approved_date column exists
    $check_approved_date = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_approved_date'";
    $approved_date_result = $conn->query($check_approved_date);
    
    if ($approved_date_result->num_rows == 0) {
        // Add approved_date column
        $add_approved_date = "ALTER TABLE `safe_transactions` 
                            ADD COLUMN `safe_transactions_approved_date` DATETIME DEFAULT NULL 
                            AFTER `safe_transactions_approved_by`";
        
        if ($conn->query($add_approved_date) === TRUE) {
            $operations[] = "✓ Added approved_date column";
        } else {
            $operations[] = "! Approved_date column creation failed: " . $conn->error;
        }
    } else {
        $operations[] = "- Approved_date column already exists";
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Database migration completed',
        'operations' => $operations
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

// Close the connection
$conn->close();

// Add some HTML for browser viewing
if (!isset($_GET['json'])) {
    echo '<br><br><h3>Database Migration Complete</h3>';
    echo '<p>All necessary columns have been added to the safe_transactions table.</p>';
    echo '<p>You can safely delete this file after running it once.</p>';
}
?>
