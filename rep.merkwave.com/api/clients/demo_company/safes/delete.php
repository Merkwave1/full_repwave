<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        print_failure('Error: Only POST requests are allowed.');
    }

    $uuid = $_POST['users_uuid'] ?? null;
    if (empty($uuid)) {
        print_failure('Error: UUID is required.');
    }

    $safe_id = $_POST['safes_id'] ?? null;
    if (empty($safe_id) || !is_numeric($safe_id) || $safe_id <= 0) {
        print_failure('Error: Valid Safe ID is required.');
    }

    $conn->begin_transaction();

    try {
        $user_stmt = $conn->prepare('SELECT users_id, users_role FROM users WHERE users_uuid = ?');
        if (!$user_stmt) {
            throw new Exception('Prepare failed for user lookup: ' . $conn->error);
        }
        $user_stmt->bind_param('s', $uuid);
        $user_stmt->execute();
        $user_result = $user_stmt->get_result();
        $user = $user_result->fetch_assoc();
        $user_stmt->close();

        if (!$user) {
            $conn->rollback();
            print_failure('Error: Invalid UUID.');
        }

        // Check permissions - only admins and cash role can delete safes
        if (!in_array(strtolower((string)$user['users_role']), ['admin', 'cash'])) {
            $conn->rollback();
            print_failure('Error: Access denied. Only administrators can delete safes.');
        }

        $safe_stmt = $conn->prepare('SELECT safes_balance FROM safes WHERE safes_id = ?');
        if (!$safe_stmt) {
            throw new Exception('Prepare failed for safe lookup: ' . $conn->error);
        }
        $safe_stmt->bind_param('i', $safe_id);
        $safe_stmt->execute();
        $safe_result = $safe_stmt->get_result();
        $safe = $safe_result->fetch_assoc();
        $safe_stmt->close();

        if (!$safe) {
            $conn->rollback();
            print_failure('Error: Safe with ID ' . $safe_id . ' not found.');
        }

        if (abs((float)$safe['safes_balance']) > 0.01) {
            $conn->rollback();
            print_failure('Error: Safe balance must be zero before deletion.');
        }

        $transaction_stmt = $conn->prepare('SELECT COUNT(*) AS cnt FROM safe_transactions WHERE safe_transactions_safe_id = ?');
        if (!$transaction_stmt) {
            throw new Exception('Prepare failed for transaction check: ' . $conn->error);
        }
        $transaction_stmt->bind_param('i', $safe_id);
        $transaction_stmt->execute();
        $transaction_result = $transaction_stmt->get_result();
        $transaction_count = (int)$transaction_result->fetch_assoc()['cnt'];
        $transaction_stmt->close();

        if ($transaction_count > 0) {
            $conn->rollback();
            print_failure('Error: Cannot delete safe with existing transactions.');
        }

        $fk_sql = "
            SELECT TABLE_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_NAME = 'safes'
        ";

        $fk_stmt = $conn->prepare($fk_sql);
        if ($fk_stmt) {
            $fk_stmt->execute();
            $fk_result = $fk_stmt->get_result();

            while ($fk_row = $fk_result->fetch_assoc()) {
                $table = $fk_row['TABLE_NAME'];
                $column = $fk_row['COLUMN_NAME'];

                if (!preg_match('/^[a-zA-Z0-9_]+$/', $table) || !preg_match('/^[a-zA-Z0-9_]+$/', $column)) {
                    continue;
                }

                // safe_transactions already handled separately above
                if (strcasecmp($table, 'safe_transactions') === 0) {
                    continue;
                }

                $check_sql = sprintf('SELECT COUNT(*) AS cnt FROM `%s` WHERE `%s` = ?', $table, $column);
                $check_stmt = $conn->prepare($check_sql);

                if ($check_stmt) {
                    $check_stmt->bind_param('i', $safe_id);
                    $check_stmt->execute();
                    $check_result = $check_stmt->get_result();
                    $count = (int)$check_result->fetch_assoc()['cnt'];
                    $check_stmt->close();

                    if ($count > 0) {
                        $fk_stmt->close();
                        $conn->rollback();
                        print_failure("Error: Cannot delete safe. It is referenced in {$table}.");
                    }
                }
            }

            $fk_stmt->close();
        }

        $delete_stmt = $conn->prepare('DELETE FROM safes WHERE safes_id = ?');
        if (!$delete_stmt) {
            throw new Exception('Prepare failed for delete: ' . $conn->error);
        }
        $delete_stmt->bind_param('i', $safe_id);
        $delete_stmt->execute();

        if ($delete_stmt->affected_rows === 0) {
            $delete_stmt->close();
            $conn->rollback();
            print_failure('Error: Safe with ID ' . $safe_id . ' not found.');
        }

        $delete_stmt->close();

        $conn->commit();
        print_success('Safe deleted successfully.');

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
