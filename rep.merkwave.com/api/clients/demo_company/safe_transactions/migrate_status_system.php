<?php
/**
 * Database Migration Script for Transaction Status System
 * Add status, approved_by, and approved_date columns to safe_transactions table
 * 
 * Run this script once by accessing it through your browser:
 * https://yourdomain.com/path/to/this/script.php
 * 
 * Safe for Hostinger and other shared hosting providers
 */

// Include database connection
require_once '../db_connect.php';

// Set response header
header('Content-Type: application/json');

$results = [];

try {
    // Check if status column already exists
    $check_status = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_status'";
    $status_result = $conn->query($check_status);
    
    if ($status_result->num_rows == 0) {
        // Add status column
        $add_status = "ALTER TABLE `safe_transactions` 
                      ADD COLUMN `safe_transactions_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' 
                      AFTER `safe_transactions_receipt_image`";
        
        if ($conn->query($add_status) === TRUE) {
            $results[] = "✓ Status column added successfully";
        } else {
            $results[] = "✗ Failed to add status column: " . $conn->error;
        }
    } else {
        $results[] = "- Status column already exists";
    }
    
    // Check if approved_by column already exists
    $check_approved_by = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_approved_by'";
    $approved_by_result = $conn->query($check_approved_by);
    
    if ($approved_by_result->num_rows == 0) {
        // Add approved_by column
        $add_approved_by = "ALTER TABLE `safe_transactions` 
                           ADD COLUMN `safe_transactions_approved_by` INT DEFAULT NULL 
                           AFTER `safe_transactions_status`";
        
        if ($conn->query($add_approved_by) === TRUE) {
            $results[] = "✓ Approved_by column added successfully";
        } else {
            $results[] = "✗ Failed to add approved_by column: " . $conn->error;
        }
    } else {
        $results[] = "- Approved_by column already exists";
    }
    
    // Check if approved_date column already exists
    $check_approved_date = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_approved_date'";
    $approved_date_result = $conn->query($check_approved_date);
    
    if ($approved_date_result->num_rows == 0) {
        // Add approved_date column
        $add_approved_date = "ALTER TABLE `safe_transactions` 
                             ADD COLUMN `safe_transactions_approved_date` DATETIME DEFAULT NULL 
                             AFTER `safe_transactions_approved_by`";
        
        if ($conn->query($add_approved_date) === TRUE) {
            $results[] = "✓ Approved_date column added successfully";
        } else {
            $results[] = "✗ Failed to add approved_date column: " . $conn->error;
        }
    } else {
        $results[] = "- Approved_date column already exists";
    }
    
    // Add status index if it doesn't exist
    $check_status_index = "SHOW INDEX FROM `safe_transactions` WHERE Key_name = 'idx_safe_transactions_status'";
    $status_index_result = $conn->query($check_status_index);
    
    if ($status_index_result->num_rows == 0) {
        $add_status_index = "CREATE INDEX `idx_safe_transactions_status` 
                            ON `safe_transactions`(`safe_transactions_status`)";
        
        if ($conn->query($add_status_index) === TRUE) {
            $results[] = "✓ Status index added successfully";
        } else {
            $results[] = "- Status index creation skipped: " . $conn->error;
        }
    } else {
        $results[] = "- Status index already exists";
    }
    
    // Set existing transactions to 'approved' status (backward compatibility)
    $update_existing = "UPDATE `safe_transactions` 
                       SET `safe_transactions_status` = 'approved' 
                       WHERE `safe_transactions_status` IS NULL OR `safe_transactions_status` = ''";
    
    if ($conn->query($update_existing) === TRUE) {
        $affected_rows = $conn->affected_rows;
        if ($affected_rows > 0) {
            $results[] = "✓ Updated $affected_rows existing transactions to 'approved' status";
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Transaction status system migration completed',
        'results' => $results
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'results' => $results
    ]);
}

// Close the connection
$conn->close();

// Add some HTML for browser viewing
if (!isset($_GET['json'])) {
    echo '<br><br><h3>Transaction Status System Migration</h3>';
    echo '<div>';
    foreach ($results as $result) {
        echo '<p>' . htmlspecialchars($result) . '</p>';
    }
    echo '</div>';
    echo '<p>You can safely delete this file after running it once.</p>';
    echo '<p><a href="' . $_SERVER['PHP_SELF'] . '?json=1">View JSON Response</a></p>';
}
?>
