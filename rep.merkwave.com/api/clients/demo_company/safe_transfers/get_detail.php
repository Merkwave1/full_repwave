<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Accept id from either `id` or `safe_transactions_id`
    $safe_transactions_id = $_GET['id']
        ?? $_POST['id']
        ?? $_GET['safe_transactions_id']
        ?? $_POST['safe_transactions_id']
        ?? null;

    if (empty($safe_transactions_id) || !is_numeric($safe_transactions_id) || (int)$safe_transactions_id <= 0) {
        print_failure('Error: Safe Transaction ID is required.');
    }

    $sql = "
        SELECT 
            st.safe_transactions_id,
            st.safe_transactions_safe_id AS affected_safe_id,
            s_affected.safes_name AS affected_safe_name,
            s_affected.safes_type AS affected_safe_type,
            st.safe_transactions_type,
            st.safe_transactions_amount,
            st.safe_transactions_date,
            st.safe_transactions_created_by,
            u_created.users_name AS user_name,
            st.safe_transactions_reference,
            st.safe_transactions_description AS safe_transactions_notes,
            st.safe_transactions_balance_before,
            st.safe_transactions_balance_after,
            st.safe_transactions_created_at,
            st.safe_transactions_status,
            st.safe_transactions_related_id,
            st.safe_transactions_related_table,
            st.safe_transactions_approved_by,
            u_approved.users_name AS approved_by_name,
            st.safe_transactions_approved_date,
            st_pair.safe_transactions_id AS pair_transaction_id,
            st_pair.safe_transactions_safe_id AS safe_transactions_counterpart_safe_id,
            st_pair.safe_transactions_type AS pair_transaction_type,
            st_pair.safe_transactions_amount AS pair_transaction_amount,
            st_pair.safe_transactions_status AS pair_transaction_status,
            st_pair.safe_transactions_approved_by AS pair_transaction_approved_by,
            u_pair_created.users_name AS pair_user_name,
            u_pair_approved.users_name AS pair_approved_by_name,
            st_pair.safe_transactions_approved_date AS pair_transaction_approved_date,
            st_pair.safe_transactions_reference AS pair_transaction_reference,
            st_pair.safe_transactions_description AS pair_transaction_notes,
            st_pair.safe_transactions_balance_before AS pair_balance_before,
            st_pair.safe_transactions_balance_after AS pair_balance_after,
            st_pair.safe_transactions_created_at AS pair_created_at,
            s_counterpart.safes_name AS counterpart_safe_name,
            s_counterpart.safes_type AS counterpart_safe_type
        FROM safe_transactions st
        JOIN safes s_affected ON st.safe_transactions_safe_id = s_affected.safes_id
        LEFT JOIN safe_transactions st_pair 
            ON st_pair.safe_transactions_id = st.safe_transactions_related_id
        LEFT JOIN safes s_counterpart ON st_pair.safe_transactions_safe_id = s_counterpart.safes_id
        LEFT JOIN users u_created ON st.safe_transactions_created_by = u_created.users_id
        LEFT JOIN users u_pair_created ON st_pair.safe_transactions_created_by = u_pair_created.users_id
        LEFT JOIN users u_approved ON st.safe_transactions_approved_by = u_approved.users_id
        LEFT JOIN users u_pair_approved ON st_pair.safe_transactions_approved_by = u_pair_approved.users_id
        WHERE st.safe_transactions_id = ?
          AND st.safe_transactions_type IN ('transfer_out','transfer_in')
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed for select: ' . $conn->error);
    }

    $id = (int)$safe_transactions_id;
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure('Error: Safe transfer transaction not found or is not a transfer type.');
    }

    $transfer = $result->fetch_assoc();

    // If counterpart safe not found via reference pairing, try a robust fallback pairing by datetime + amount and opposite type
    $hasCounterpart = !empty($transfer['safe_transactions_counterpart_safe_id']) || !empty($transfer['counterpart_safe_name']);
    if (!$hasCounterpart) {
        $fallbackSql = "
            SELECT 
                st2.safe_transactions_id,
                st2.safe_transactions_type,
                st2.safe_transactions_safe_id AS affected_safe_id,
                s2.safes_name AS affected_safe_name,
                s2.safes_type AS affected_safe_type
            FROM safe_transactions st2
            JOIN safes s2 ON st2.safe_transactions_safe_id = s2.safes_id
            WHERE st2.safe_transactions_id <> ?
              AND st2.safe_transactions_type IN ('transfer_out','transfer_in')
              AND st2.safe_transactions_amount = ?
              AND st2.safe_transactions_date = ?
            ORDER BY st2.safe_transactions_id DESC
            LIMIT 10
        ";
        $stmt2 = $conn->prepare($fallbackSql);
        if ($stmt2) {
            $amt = (float)$transfer['safe_transactions_amount'];
            $dt  = $transfer['safe_transactions_date'];
            $stmt2->bind_param('ids', $id, $amt, $dt);
            $stmt2->execute();
            $cand = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt2->close();

            // pick the best candidate: opposite type and preferably different safe than the current affected safe
            $isOutRow = strtolower($transfer['safe_transactions_type']) === 'transfer_out';
            $best = null;
            foreach ($cand as $c) {
                $cIsOut = strtolower($c['safe_transactions_type']) === 'transfer_out';
                if ($cIsOut === $isOutRow) continue; // need opposite type
                if ((int)$c['affected_safe_id'] === (int)$transfer['affected_safe_id']) continue; // prefer different safe
                $best = $c; break;
            }
            if (!$best && count($cand) > 0) {
                $best = $cand[0]; // fallback to any opposite found
            }
            if ($best) {
                // Map as counterpart
                $transfer['safe_transactions_counterpart_safe_id'] = $best['affected_safe_id'];
                $transfer['counterpart_safe_name'] = $best['affected_safe_name'];
                $transfer['counterpart_safe_type'] = $best['affected_safe_type'];
                $transfer['pair_transaction_id'] = (int)$best['safe_transactions_id'];
            }
        }
    }

    // Derive source/destination convenience fields for UI
    $isOut = strtolower($transfer['safe_transactions_type']) === 'transfer_out';
    $isIn  = strtolower($transfer['safe_transactions_type']) === 'transfer_in';
    $source_safe_name = null; $source_safe_type = null; $destination_safe_name = null; $destination_safe_type = null;
    if ($isOut) {
        $source_safe_name = $transfer['affected_safe_name'];
        $source_safe_type = $transfer['affected_safe_type'];
        $destination_safe_name = $transfer['counterpart_safe_name'];
        $destination_safe_type = $transfer['counterpart_safe_type'];
    } else if ($isIn) {
        $source_safe_name = $transfer['counterpart_safe_name'];
        $source_safe_type = $transfer['counterpart_safe_type'];
        $destination_safe_name = $transfer['affected_safe_name'];
        $destination_safe_type = $transfer['affected_safe_type'];
    }

    $transfer['source_safe_name'] = $source_safe_name;
    $transfer['source_safe_type'] = $source_safe_type;
    $transfer['destination_safe_name'] = $destination_safe_name;
    $transfer['destination_safe_type'] = $destination_safe_type;

    $transfer['pair_transaction_id'] = isset($transfer['pair_transaction_id']) ? (int)$transfer['pair_transaction_id'] : null;
    $transfer['safe_transactions_status'] = $transfer['safe_transactions_status'] ?? null;
    $transfer['pair_transaction_status'] = $transfer['pair_transaction_status'] ?? null;
    $transfer['transfer_out_id'] = $isOut ? (int)$transfer['safe_transactions_id'] : ($transfer['pair_transaction_id'] ?? null);
    $transfer['transfer_in_id'] = $isIn ? (int)$transfer['safe_transactions_id'] : ($transfer['pair_transaction_id'] ?? null);
    $transfer['transfer_out_status'] = $isOut ? $transfer['safe_transactions_status'] : ($transfer['pair_transaction_status'] ?? null);
    $transfer['transfer_in_status'] = $isIn ? $transfer['safe_transactions_status'] : ($transfer['pair_transaction_status'] ?? null);
    $transfer['transfer_out_reference'] = $isOut ? $transfer['safe_transactions_reference'] : ($transfer['pair_transaction_reference'] ?? null);
    $transfer['transfer_in_reference'] = $isIn ? $transfer['safe_transactions_reference'] : ($transfer['pair_transaction_reference'] ?? null);
    $transfer['transfer_out_user_name'] = $isOut ? $transfer['user_name'] : ($transfer['pair_user_name'] ?? null);
    $transfer['transfer_in_user_name'] = $isIn ? $transfer['user_name'] : ($transfer['pair_user_name'] ?? null);
    $transfer['transfer_out_approved_by_name'] = $isOut ? $transfer['approved_by_name'] : ($transfer['pair_approved_by_name'] ?? null);
    $transfer['transfer_in_approved_by_name'] = $isIn ? $transfer['approved_by_name'] : ($transfer['pair_approved_by_name'] ?? null);
    $transfer['transfer_out_approved_date'] = $isOut ? $transfer['safe_transactions_approved_date'] : ($transfer['pair_transaction_approved_date'] ?? null);
    $transfer['transfer_in_approved_date'] = $isIn ? $transfer['safe_transactions_approved_date'] : ($transfer['pair_transaction_approved_date'] ?? null);
    $transfer['pair_transaction_notes'] = $transfer['pair_transaction_notes'] ?? null;
    $transfer['pair_balance_before'] = $transfer['pair_balance_before'] ?? null;
    $transfer['pair_balance_after'] = $transfer['pair_balance_after'] ?? null;
    $transfer['pair_created_at'] = $transfer['pair_created_at'] ?? null;

    $overallStatus = $transfer['safe_transactions_status'];
    if ($transfer['pair_transaction_status'] === 'rejected' || $transfer['safe_transactions_status'] === 'rejected') {
        $overallStatus = 'rejected';
    } elseif ($transfer['pair_transaction_status'] === 'pending' || $transfer['safe_transactions_status'] === 'pending') {
        $overallStatus = 'pending';
    }
    $transfer['transfer_status'] = $overallStatus;

    print_success('Safe transfer details retrieved successfully.', $transfer);

} catch (Exception | TypeError $e) {
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
