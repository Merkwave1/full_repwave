<?php
/**
 * Database Migration Script for Safe Transactions
 * Add receipt_image column to safe_transactions table
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

try {
    // Check if the column already exists
    $check_query = "SHOW COLUMNS FROM `safe_transactions` LIKE 'safe_transactions_receipt_image'";
    $check_result = $conn->query($check_query);
    
    if ($check_result->num_rows > 0) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Column safe_transactions_receipt_image already exists',
            'action' => 'none'
        ]);
        exit;
    }
    
    // Add the receipt image column
    $alter_query = "ALTER TABLE `safe_transactions` 
                   ADD COLUMN `safe_transactions_receipt_image` VARCHAR(500) DEFAULT NULL 
                   AFTER `safe_transactions_reference`";
    
    if ($conn->query($alter_query) === TRUE) {
        $success_message = "Column safe_transactions_receipt_image added successfully";
        
        // Try to add index (optional - don't fail if it doesn't work)
        $index_query = "CREATE INDEX `idx_safe_transactions_receipt` 
                       ON `safe_transactions`(`safe_transactions_receipt_image`)";
        
        if ($conn->query($index_query) === TRUE) {
            $success_message .= " with index";
        } else {
            $success_message .= " (index creation skipped: " . $conn->error . ")";
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => $success_message,
            'action' => 'column_added'
        ]);
    } else {
        throw new Exception("Failed to add column: " . $conn->error);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'action' => 'failed'
    ]);
}

// Close the connection
$conn->close();

// Add some HTML for browser viewing
if (!isset($_GET['json'])) {
    echo '<br><br><h3>Database Migration Complete</h3>';
    echo '<p>You can safely delete this file after running it once.</p>';
    echo '<p><a href="' . $_SERVER['PHP_SELF'] . '?json=1">View JSON Response</a></p>';
}
?>
