<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

require_once '../db_connect.php';
require_once '../functions.php';

try {
    // Get transaction ID
    $transaction_id = $_GET['id'] ?? null;
    
    if (!$transaction_id) {
        echo json_encode(['status' => 'error', 'message' => 'Transaction ID is required']);
        exit;
    }

    // Get transaction details with all related information
    $query = "
        SELECT 
            st.*,
            s.safes_name,
            s.safes_description,
            s.safes_type,
            s.safes_rep_user_id,
            u.users_name as rep_name,
            u.users_email as rep_email,
            approved_user.users_name as approved_by_name,
            approved_user.users_email as approved_by_email,
            acc.id as account_id,
            acc.code as account_code,
            acc.name as account_name,
            acc.type as account_type
        FROM safe_transactions st
        LEFT JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
        LEFT JOIN users u ON st.safe_transactions_created_by = u.users_id
        LEFT JOIN users approved_user ON st.safe_transactions_approved_by = approved_user.users_id
        LEFT JOIN accounts acc ON st.safe_transactions_account_id = acc.id
        WHERE st.safe_transactions_id = ?
    ";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception('Database prepare failed: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $transaction_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Transaction not found']);
        exit;
    }
    
    $transaction = $result->fetch_assoc();

    $relatedData = null;
    if (!empty($transaction['safe_transactions_related_id'])) {
        $relatedQuery = "
            SELECT 
                rel.*, 
                rel_safe.safes_name AS related_safe_name,
                rel_safe.safes_description AS related_safe_description,
                rel_safe.safes_type AS related_safe_type,
                rel_safe.safes_rep_user_id AS related_safe_rep_user_id,
                rel_user.users_name AS related_rep_name,
                rel_user.users_email AS related_rep_email
            FROM safe_transactions rel
            LEFT JOIN safes rel_safe ON rel.safe_transactions_safe_id = rel_safe.safes_id
            LEFT JOIN users rel_user ON rel.safe_transactions_created_by = rel_user.users_id
            WHERE rel.safe_transactions_id = ?
        ";

        $relatedStmt = $conn->prepare($relatedQuery);
        if ($relatedStmt) {
            $relatedStmt->bind_param("i", $transaction['safe_transactions_related_id']);
            $relatedStmt->execute();
            $relatedResult = $relatedStmt->get_result();
            if ($relatedResult && $relatedResult->num_rows > 0) {
                $relatedData = $relatedResult->fetch_assoc();
            }
            $relatedStmt->close();
        }
    }

    $directionDetails = null;
    $type = $transaction['safe_transactions_type'] ?? '';
    if (in_array($type, ['transfer_in', 'transfer_out'], true) && $relatedData) {
        // Determine source and destination safes
        if ($type === 'transfer_out') {
            $directionDetails = [
                'source_safe_id' => $transaction['safe_transactions_safe_id'],
                'source_safe_name' => $transaction['safes_name'],
                'source_safe_type' => $transaction['safes_type'],
                'destination_safe_id' => $relatedData['safe_transactions_safe_id'],
                'destination_safe_name' => $relatedData['related_safe_name'],
                'destination_safe_type' => $relatedData['related_safe_type'],
                'source_rep_name' => $transaction['rep_name'],
                'destination_rep_name' => $relatedData['related_rep_name'],
            ];
        } else {
            // transfer_in
            $directionDetails = [
                'source_safe_id' => $relatedData['safe_transactions_safe_id'],
                'source_safe_name' => $relatedData['related_safe_name'],
                'source_safe_type' => $relatedData['related_safe_type'],
                'destination_safe_id' => $transaction['safe_transactions_safe_id'],
                'destination_safe_name' => $transaction['safes_name'],
                'destination_safe_type' => $transaction['safes_type'],
                'source_rep_name' => $relatedData['related_rep_name'],
                'destination_rep_name' => $transaction['rep_name'],
            ];
        }
    }
    
    // Format the response
    $response = [
        'status' => 'success',
        'data' => [
            'id' => $transaction['safe_transactions_id'],
            'safe_id' => $transaction['safe_transactions_safe_id'],
            'safe_name' => $transaction['safes_name'],
            'safe_description' => $transaction['safes_description'],
            'safe_type' => $transaction['safes_type'],
            'safe_rep_user_id' => $transaction['safes_rep_user_id'],
            'user_id' => $transaction['safe_transactions_created_by'],
            'rep_name' => $transaction['rep_name'],
            'rep_email' => $transaction['rep_email'],
            'type' => $transaction['safe_transactions_type'],
            'amount' => $transaction['safe_transactions_amount'],
            'description' => $transaction['safe_transactions_description'],
            'reference' => $transaction['safe_transactions_reference'],
            'date' => $transaction['safe_transactions_date'],
            'status' => isset($transaction['safe_transactions_status']) && !empty($transaction['safe_transactions_status']) 
                ? $transaction['safe_transactions_status'] 
                : 'approved', // Default for old records before status system
            'receipt_image' => $transaction['safe_transactions_receipt_image'],
            'receipt_image_url' => $transaction['safe_transactions_receipt_image'],
            'approved_by' => $transaction['safe_transactions_approved_by'],
            'approved_by_name' => $transaction['approved_by_name'],
            'approved_by_email' => $transaction['approved_by_email'],
            'approved_date' => $transaction['safe_transactions_approved_date'],
            'account_id' => $transaction['account_id'] ?? null,
            'account_code' => $transaction['account_code'] ?? null,
            'account_name' => $transaction['account_name'] ?? null,
            'account_type' => $transaction['account_type'] ?? null,
            'related_transaction_id' => $transaction['safe_transactions_related_id'] ?? null,
            'related_transaction' => $relatedData ? [
                'id' => $relatedData['safe_transactions_id'],
                'safe_id' => $relatedData['safe_transactions_safe_id'],
                'safe_name' => $relatedData['related_safe_name'],
                'safe_description' => $relatedData['related_safe_description'],
                'safe_type' => $relatedData['related_safe_type'],
                'rep_name' => $relatedData['related_rep_name'],
                'rep_email' => $relatedData['related_rep_email'],
                'type' => $relatedData['safe_transactions_type'],
                'amount' => $relatedData['safe_transactions_amount'],
                'status' => $relatedData['safe_transactions_status'],
                'date' => $relatedData['safe_transactions_date'],
            ] : null,
            'direction_details' => $directionDetails,
        ]
    ];
    
    echo json_encode($response);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

$conn->close();
?>
