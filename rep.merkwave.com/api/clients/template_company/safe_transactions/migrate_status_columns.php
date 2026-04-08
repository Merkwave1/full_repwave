<?php
/**
 * Database Migration Script for Safe Transaction Status
 * Add status, approved_by, and approved_date columns
 * 
 * Run this script once by accessing it through your browser:
 * https://yourdomain.com/path/to/this/script.php
 */

// Include database connection
require_once '../db_connect.php';

// Set response header
header('Content-Type: application/json');

try {
    $operations = [];
    
    // Check if status column exists
    $check_status = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_status'";
    $status_result = $conn->query($check_status);
    
    if ($status_result->num_rows == 0) {
        // Add status column
        $add_status = "ALTER TABLE `safe_transactions` 
                      ADD COLUMN `safe_transactions_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' 
                      AFTER `safe_transactions_receipt_image`";
        
        if ($conn->query($add_status) === TRUE) {
            $operations[] = "✓ Added status column";
        } else {
            throw new Exception("Failed to add status column: " . $conn->error);
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
            throw new Exception("Failed to add approved_by column: " . $conn->error);
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
            throw new Exception("Failed to add approved_date column: " . $conn->error);
        }
    } else {
        $operations[] = "- Approved_date column already exists";
    }
    
    // Add index for status if it doesn't exist
    $index_query = "SHOW INDEX FROM `safe_transactions` WHERE Key_name = 'idx_safe_transactions_status'";
    $index_result = $conn->query($index_query);
    
    if ($index_result->num_rows == 0) {
        $add_index = "CREATE INDEX `idx_safe_transactions_status` ON `safe_transactions`(`safe_transactions_status`)";
        if ($conn->query($add_index) === TRUE) {
            $operations[] = "✓ Added status index";
        } else {
            $operations[] = "! Index creation skipped: " . $conn->error;
        }
    } else {
        $operations[] = "- Status index already exists";
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Status columns migration completed',
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
    echo '<br><br><h3>Status Columns Migration Complete</h3>';
    echo '<p>You can safely delete this file after running it once.</p>';
}
?>
