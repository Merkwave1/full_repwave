<?php

require_once '../db_connect.php'; 
require_once '../functions.php';
require_once '../notifications/notify_helpers.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Assuming admin role can initiate transfers

    // Get UUID from headers or POST data  
    $headers = getallheaders();
    $uuid = $headers['User-UUID'] ?? $headers['x-user-uuid'] ?? null;
    
    // If not in headers, try to get from POST data
    if (!$uuid) {
        $input = json_decode(file_get_contents('php://input'), true);
        $uuid = $input['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    }
    
    if (!$uuid) {
        echo json_encode(['status' => 'error', 'message' => 'UUID is required']);
        exit;
    }

    // Get user info by UUID
    $user_stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
    if (!$user_stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Database prepare failed']);
        exit;
    }
    
    $user_stmt->bind_param("s", $uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    $user_data = $user_result->fetch_assoc();
    $user_stmt->close();

    if (!$user_data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid user UUID']);
        exit;
    }

    $transfer_user_id = $user_data['users_id'];

    // Get JSON input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    $source_safe_id      = $input['source_safe_id']      ?? $_POST['source_safe_id']      ?? null;
    $destination_safe_id = $input['destination_safe_id'] ?? $_POST['destination_safe_id'] ?? null;
    $transfer_amount     = $input['transfer_amount']     ?? $_POST['transfer_amount']     ?? null;
    $transfer_date       = $input['transfer_date']       ?? $_POST['transfer_date']       ?? date('Y-m-d H:i:s');
    $transfer_notes      = $input['transfer_notes']      ?? $_POST['transfer_notes']      ?? null;
    $user_role           = $input['user_role']           ?? $_POST['user_role']           ?? null;

    // Determine if this transfer should be auto-approved (admin and cash users)
    $is_admin = ($user_data['users_role'] === 'admin') || ($user_data['users_role'] === 'cash') || ($user_role === 'admin');
    $initial_status = $is_admin ? 'approved' : 'pending';

    // Handle empty strings for nullable fields
    if ($transfer_notes === "") {$transfer_notes = null;}

    // Basic Validation
    if (empty($source_safe_id) || !is_numeric($source_safe_id) || $source_safe_id <= 0) {
        print_failure("Error: Valid Source Safe ID is required.");
    }
    if (empty($destination_safe_id) || !is_numeric($destination_safe_id) || $destination_safe_id <= 0) {
        print_failure("Error: Valid Destination Safe ID is required.");
    }

    // If user is cash, verify they are assigned to the source safe
    if ($user_data['users_role'] === 'cash') {
        $stmt_check = $conn->prepare("SELECT 1 FROM user_safes WHERE user_id = ? AND safe_id = ?");
        $stmt_check->bind_param("ii", $transfer_user_id, $source_safe_id);
        $stmt_check->execute();
        if ($stmt_check->get_result()->num_rows === 0) {
            print_failure("Error: Access denied. You are not assigned to the source safe.");
            exit;
        }
        $stmt_check->close();
    }

    if ($source_safe_id === $destination_safe_id) {
        print_failure("Error: Source and Destination Safe cannot be the same.");
    }
    
    // Sanitize transfer_amount - remove commas and other formatting
    if ($transfer_amount !== null) {
        $transfer_amount = str_replace([',', ' ', 'ر.س'], '', $transfer_amount);
        $transfer_amount = trim($transfer_amount);
    }
    
    if (empty($transfer_amount) || !is_numeric($transfer_amount) || $transfer_amount <= 0) {
        print_failure("Error: Valid Transfer Amount is required and must be positive.");
    }
    
    // Convert to float for further processing
    $transfer_amount = (float) $transfer_amount;
    
    if (!strtotime($transfer_date)) {
        print_failure("Error: Invalid transfer date format.");
    }

    $conn->begin_transaction();

    try {
        // Fetch source and destination safe info for validation and notifications
        $stmt_fetch_safes = $conn->prepare("
            SELECT safes_id, safes_name, safes_balance, safes_type
            FROM safes
            WHERE safes_id IN (?, ?)
        ");
        if (!$stmt_fetch_safes) {
            throw new Exception("Prepare failed while fetching safes: " . $conn->error);
        }
        $stmt_fetch_safes->bind_param("ii", $source_safe_id, $destination_safe_id);
        $stmt_fetch_safes->execute();
        $result = $stmt_fetch_safes->get_result();
        $safes = [];
        while ($row = $result->fetch_assoc()) {
            $safes[(int)$row['safes_id']] = $row;
        }
        $stmt_fetch_safes->close();

        if (!isset($safes[$source_safe_id])) {
            print_failure("Error: Source Safe with ID " . $source_safe_id . " not found.");
        }
        if (!isset($safes[$destination_safe_id])) {
            print_failure("Error: Destination Safe with ID " . $destination_safe_id . " not found.");
        }

        $source_safe_data = $safes[$source_safe_id];
        $destination_safe_data = $safes[$destination_safe_id];

        // Validate balance only for actual send (source -> destination) scenarios
        if ($source_safe_data['safes_balance'] < $transfer_amount) {
            print_failure("Error: Insufficient balance in source safe (ID: " . $source_safe_id . "). Current: " . $source_safe_data['safes_balance']);
        }

        try {
            $token = strtoupper(bin2hex(random_bytes(4))); // short shared identifier
        } catch (Throwable $tokenEx) {
            $token = strtoupper(substr(md5(uniqid((string)microtime(true), true)), 0, 8));
        }
        $reference_out = sprintf('TRANSFER_OUT_TO_%d_REQ_%s', $destination_safe_id, $token);
        $reference_in = sprintf('TRANSFER_IN_FROM_%d_REQ_%s', $source_safe_id, $token);

        $source_balance_before = (float)$source_safe_data['safes_balance'];
        $destination_balance_before = (float)$destination_safe_data['safes_balance'];

        // Calculate balance_after based on approval status
        if ($initial_status === 'approved') {
            $source_balance_after = $source_balance_before - $transfer_amount;
            $destination_balance_after = $destination_balance_before + $transfer_amount;
        } else {
            // Pending: balance remains unchanged
            $source_balance_after = $source_balance_before;
            $destination_balance_after = $destination_balance_before;
        }

        $out_description = trim(
            sprintf(
                // '%s transfer request from %s (ID %d) to %s (ID %d). %s',
                // $initial_status === 'approved' ? 'Approved' : 'Pending',
                // $source_safe_data['safes_name'] ?? 'Safe',
                // $source_safe_id,
                // $destination_safe_data['safes_name'] ?? 'Safe',
                // $destination_safe_id,
                $transfer_notes ? $transfer_notes : ''
            )
        );

        $stmt_insert_out = $conn->prepare("
            INSERT INTO safe_transactions (
                safe_transactions_safe_id,
                safe_transactions_type,
                safe_transactions_amount,
                safe_transactions_balance_before,
                safe_transactions_balance_after,
                safe_transactions_description,
                safe_transactions_reference,
                safe_transactions_status,
                safe_transactions_created_by,
                safe_transactions_date,
                safe_transactions_related_table,
                safe_transactions_created_at
            ) VALUES (?, 'transfer_out', ?, ?, ?, ?, ?, ?, ?, ?, 'safe_transfers', NOW())
        ");
        if (!$stmt_insert_out) {
            throw new Exception("Prepare failed for transfer out insert: " . $conn->error);
        }
        $stmt_insert_out->bind_param(
            "idddsssis",
            $source_safe_id,
            $transfer_amount,
            $source_balance_before,
            $source_balance_after, // Use calculated balance_after
            $out_description,
            $reference_out,
            $initial_status, // Use dynamic status
            $transfer_user_id,
            $transfer_date
        );
        $stmt_insert_out->execute();
        $transfer_out_id = $stmt_insert_out->insert_id;
        $stmt_insert_out->close();

        $in_description = trim(
            sprintf(
                '%s transfer request incoming from %s (ID %d). %s',
                $initial_status === 'approved' ? 'Approved' : 'Pending',
                $source_safe_data['safes_name'] ?? 'Safe',
                $source_safe_id,
                $transfer_notes ? 'Notes: ' . $transfer_notes : ''
            )
        );

        $stmt_insert_in = $conn->prepare("
            INSERT INTO safe_transactions (
                safe_transactions_safe_id,
                safe_transactions_type,
                safe_transactions_amount,
                safe_transactions_balance_before,
                safe_transactions_balance_after,
                safe_transactions_description,
                safe_transactions_reference,
                safe_transactions_status,
                safe_transactions_created_by,
                safe_transactions_date,
                safe_transactions_related_table,
                safe_transactions_created_at
            ) VALUES (?, 'transfer_in', ?, ?, ?, ?, ?, ?, ?, ?, 'safe_transfers', NOW())
        ");
        if (!$stmt_insert_in) {
            throw new Exception("Prepare failed for transfer in insert: " . $conn->error);
        }
        $stmt_insert_in->bind_param(
            "idddsssis",
            $destination_safe_id,
            $transfer_amount,
            $destination_balance_before,
            $destination_balance_after, // Use calculated balance_after
            $in_description,
            $reference_in,
            $initial_status, // Use dynamic status
            $transfer_user_id,
            $transfer_date
        );
        $stmt_insert_in->execute();
        $transfer_in_id = $stmt_insert_in->insert_id;
        $stmt_insert_in->close();

        // Link transactions together for easy lookup on approval/rejection
        $stmt_update_links = $conn->prepare("UPDATE safe_transactions SET safe_transactions_related_id = ? WHERE safe_transactions_id = ?");
        if (!$stmt_update_links) {
            throw new Exception("Prepare failed for related id update: " . $conn->error);
        }
        $stmt_update_links->bind_param("ii", $transfer_in_id, $transfer_out_id);
        $stmt_update_links->execute();
        $stmt_update_links->bind_param("ii", $transfer_out_id, $transfer_in_id);
        $stmt_update_links->execute();
        $stmt_update_links->close();

        // If admin approved, update safe balances immediately
        if ($initial_status === 'approved') {
            $stmt_update_source = $conn->prepare("UPDATE safes SET safes_balance = ? WHERE safes_id = ?");
            if (!$stmt_update_source) {
                throw new Exception("Prepare failed for source safe balance update: " . $conn->error);
            }
            $stmt_update_source->bind_param("di", $source_balance_after, $source_safe_id);
            $stmt_update_source->execute();
            $stmt_update_source->close();

            $stmt_update_dest = $conn->prepare("UPDATE safes SET safes_balance = ? WHERE safes_id = ?");
            if (!$stmt_update_dest) {
                throw new Exception("Prepare failed for destination safe balance update: " . $conn->error);
            }
            $stmt_update_dest->bind_param("di", $destination_balance_after, $destination_safe_id);
            $stmt_update_dest->execute();
            $stmt_update_dest->close();
        }

        $conn->commit();

        // Notify admins about the new request (non-blocking) - only for pending transfers
        if ($initial_status === 'pending') {
            try {
                $title = 'New Safe Transfer Request';
                $body = sprintf(
                    'Transfer of %s from %s to %s is pending approval.',
                    number_format((float)$transfer_amount, 2, '.', ''),
                    $source_safe_data['safes_name'] ?? ('Safe #' . $source_safe_id),
                    $destination_safe_data['safes_name'] ?? ('Safe #' . $destination_safe_id)
                );
                $data = [
                    'source_safe_id' => $source_safe_id,
                    'destination_safe_id' => $destination_safe_id,
                    'amount' => (float)$transfer_amount,
                    'requested_by_user_id' => $transfer_user_id,
                    'transfer_out_id' => $transfer_out_id,
                    'transfer_in_id' => $transfer_in_id,
                    'request_status' => 'Pending',
                ];
                create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'high', 'safe_transactions', $transfer_out_id);
            } catch (Throwable $notifyEx) {
                error_log('Safe transfer request notification failed: ' . $notifyEx->getMessage());
            }
        }

        $success_message = $initial_status === 'approved' 
            ? "Safe transfer completed successfully and approved automatically." 
            : "Safe transfer request submitted and pending approval.";

        // Sync to Odoo if approved and integration enabled
        $odoo_transfer_id = null;
        if ($initial_status === 'approved') {
            try {
                require_once __DIR__ . '/../odoo/sync_transactions.php';
                if (function_exists('isOdooIntegrationEnabled') && isOdooIntegrationEnabled()) {
                    $odoo_transfer_id = syncSafeTransfer($transfer_out_id);
                    if ($odoo_transfer_id) {
                        error_log("Safe transfer $transfer_out_id synced to Odoo: ID $odoo_transfer_id");
                    }
                }
            } catch (Exception $odooEx) {
                error_log("Odoo safe transfer sync failed (non-blocking): " . $odooEx->getMessage());
            }
        }

        print_success($success_message, [
            'source_safe_id' => $source_safe_id,
            'destination_safe_id' => $destination_safe_id,
            'transfer_amount' => $transfer_amount,
            'transfer_out_id' => $transfer_out_id,
            'transfer_in_id' => $transfer_in_id,
            'status' => $initial_status,
            'odoo_transfer_id' => $odoo_transfer_id
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage());
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
