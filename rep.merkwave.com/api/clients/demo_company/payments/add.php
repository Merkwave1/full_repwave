<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID from request
    $users_uuid = $_POST['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Get user ID and role from UUID
    $user_stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
    if (!$user_stmt) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    
    $user_stmt->bind_param("s", $users_uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    
    if ($user_result->num_rows === 0) {
        print_failure("Error: Invalid user UUID.");
    }
    
    $user_row = $user_result->fetch_assoc();
    $payments_rep_user_id = $user_row['users_id'];
    $user_role = $user_row['users_role'];
    $user_name = $user_row['users_name'];
    $user_stmt->close();

    $requested_safe_id = isset($_POST['payments_safe_id']) ? (int)$_POST['payments_safe_id'] : null;
    $safe_payment_method_id = null;
    $payments_safe_id = null;

    // For representatives and store keepers, allow selecting a safe while keeping auto-provisioning fallback
    if ($user_role === 'rep' || $user_role === 'store_keeper') {
        $target_safe_type = $user_role === 'rep' ? 'rep' : 'store_keeper';

        if (!empty($requested_safe_id) && $requested_safe_id > 0) {
            $safe_stmt = $conn->prepare("SELECT safes_id, safes_payment_method_id FROM safes WHERE safes_id = ? AND safes_rep_user_id = ? LIMIT 1");
            if (!$safe_stmt) {
                throw new Exception("Prepare failed for safe lookup: " . $conn->error);
            }
            $safe_stmt->bind_param("ii", $requested_safe_id, $payments_rep_user_id);
            $safe_stmt->execute();
            $safe_result = $safe_stmt->get_result();
            if ($safe_result->num_rows === 0) {
                $safe_stmt->close();
                print_failure("Error: Selected safe is not assigned to this user.");
            }
            $safe_row = $safe_result->fetch_assoc();
            $payments_safe_id = (int)$safe_row['safes_id'];
            $safe_payment_method_id = $safe_row['safes_payment_method_id'] ?? null;
            $safe_stmt->close();
        } else {
            $safe_stmt = $conn->prepare("SELECT safes_id, safes_payment_method_id FROM safes WHERE safes_rep_user_id = ? AND safes_type = ? LIMIT 1");
            if (!$safe_stmt) {
                throw new Exception("Prepare failed for safe lookup: " . $conn->error);
            }
            $safe_stmt->bind_param("is", $payments_rep_user_id, $target_safe_type);
            $safe_stmt->execute();
            $safe_result = $safe_stmt->get_result();

            if ($safe_result->num_rows === 0) {
                $safe_stmt->close();
                $safe_name_suffix = $user_role === 'rep' ? 'Representative Safe' : 'Store Keeper Safe';
                $safe_description = $user_role === 'rep' ? 'Auto-created representative safe' : 'Auto-created store keeper safe';
                $safe_name = $user_name . " - " . $safe_name_suffix;
                $create_safe_stmt = $conn->prepare("INSERT INTO safes (safes_name, safes_type, safes_balance, safes_rep_user_id, safes_payment_method_id, safes_is_active, safes_description) VALUES (?, ?, 0.00, ?, 1, 1, ?)");
                if (!$create_safe_stmt) {
                    throw new Exception("Prepare failed for safe creation: " . $conn->error);
                }
                $create_safe_stmt->bind_param("ssis", $safe_name, $target_safe_type, $payments_rep_user_id, $safe_description);
                if (!$create_safe_stmt->execute()) {
                    throw new Exception("Failed to create representative safe: " . $create_safe_stmt->error);
                }
                $payments_safe_id = (int)$conn->insert_id;
                $safe_payment_method_id = 1; // default payment method when auto-created
                $create_safe_stmt->close();
            } else {
                $safe_row = $safe_result->fetch_assoc();
                $payments_safe_id = (int)$safe_row['safes_id'];
                $safe_payment_method_id = $safe_row['safes_payment_method_id'] ?? null;
                $safe_stmt->close();
            }
        }
    } else {
        // Non-representative users must provide a safe explicitly (typically admin functionality)
        if (empty($requested_safe_id) || $requested_safe_id <= 0) {
            print_failure("Error: Valid Safe ID is required for non-representative users.");
        }

        $safe_stmt = $conn->prepare("SELECT safes_id, safes_payment_method_id FROM safes WHERE safes_id = ? LIMIT 1");
        if (!$safe_stmt) {
            throw new Exception("Prepare failed for safe lookup: " . $conn->error);
        }
        $safe_stmt->bind_param("i", $requested_safe_id);
        $safe_stmt->execute();
        $safe_result = $safe_stmt->get_result();
        if ($safe_result->num_rows === 0) {
            $safe_stmt->close();
            print_failure("Error: Safe not found.");
        }
        $safe_row = $safe_result->fetch_assoc();
        $payments_safe_id = (int)$safe_row['safes_id'];
        $safe_payment_method_id = $safe_row['safes_payment_method_id'] ?? null;
        $safe_stmt->close();
    }

    if (empty($payments_safe_id) || !is_numeric($payments_safe_id) || $payments_safe_id <= 0) {
        print_failure("Error: Failed to determine safe ID for the representative.");
    }

    if (empty($safe_payment_method_id) || !is_numeric($safe_payment_method_id) || $safe_payment_method_id <= 0) {
        print_failure("Error: Selected safe does not have an associated payment method.");
    }

    $payments_client_id      = $_POST['payments_client_id']      ?? null;
    $payments_method_id      = (int)$safe_payment_method_id;
    $payments_amount         = $_POST['payments_amount']         ?? null;
    $payments_date           = $_POST['payments_date']           ?? date('Y-m-d H:i:s'); // Default to current time
    $payments_transaction_id = $_POST['payments_transaction_id'] ?? null;
    $payments_notes          = $_POST['payments_notes']          ?? null;
    $payments_visit_id       = $_POST['payments_visit_id']       ?? null; // For visit tracking

    // Handle empty strings for nullable fields
    if ($payments_transaction_id === "") {$payments_transaction_id = null;}
    if ($payments_notes === "") {$payments_notes = null;}
    if ($payments_visit_id === "" || $payments_visit_id === "0") {$payments_visit_id = null;}

    // Basic Validation
    if (empty($payments_client_id) || !is_numeric($payments_client_id) || $payments_client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }
    if (empty($payments_method_id) || !is_numeric($payments_method_id) || $payments_method_id <= 0) {
        print_failure("Error: Valid Payment Method ID is required.");
    }
    if (empty($payments_amount) || !is_numeric($payments_amount) || $payments_amount <= 0) {
        print_failure("Error: Valid Payment Amount is required and must be positive.");
    }
    if (!strtotime($payments_date)) {
        print_failure("Error: Invalid payment date format.");
    }
    if (empty($payments_rep_user_id) || !is_numeric($payments_rep_user_id) || $payments_rep_user_id <= 0) {
        print_failure("Error: Valid Representative User ID is required.");
    }
    if (empty($payments_safe_id) || !is_numeric($payments_safe_id) || $payments_safe_id <= 0) {
        print_failure("Error: Failed to determine safe ID for the representative.");
    }

    $conn->begin_transaction();

    try {
        // 1. Insert into payments table
        $stmt_payment = $conn->prepare("
            INSERT INTO payments (
                payments_client_id, payments_method_id, payments_amount, payments_date, 
                payments_transaction_id, payments_notes, payments_rep_user_id, payments_safe_id,
                payments_visit_id, payments_created_at, payments_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_payment) {
            throw new Exception("Prepare failed for payment insert: " . $conn->error);
        }

        // Bind parameters: iidsssiiii (int, int, decimal, string, string, string, int, int, int)
        $stmt_payment->bind_param("iidsssiii", 
            $payments_client_id, $payments_method_id, $payments_amount, $payments_date,
            $payments_transaction_id, $payments_notes, $payments_rep_user_id, $payments_safe_id,
            $payments_visit_id
        );

        if (!$stmt_payment->execute()) {
            throw new Exception("Error inserting payment: " . $stmt_payment->error);
        }

        $new_payment_id = $stmt_payment->insert_id;
        $stmt_payment->close();

        // 2. Update client's credit_balance (increase)
        $stmt_update_client_balance = $conn->prepare("
            UPDATE clients
            SET clients_credit_balance = clients_credit_balance + ?
            WHERE clients_id = ?
        ");

        if (!$stmt_update_client_balance) {
            throw new Exception("Prepare failed for client balance update: " . $conn->error);
        }

        $stmt_update_client_balance->bind_param("di", $payments_amount, $payments_client_id);

        if (!$stmt_update_client_balance->execute()) {
            throw new Exception("Error updating client credit balance: " . $stmt_update_client_balance->error);
        }
        $stmt_update_client_balance->close();

        // 3. Insert into safe_transactions (schema-aligned)
        // Fetch current balance for before/after
        $bal_stmt = $conn->prepare("SELECT safes_balance FROM safes WHERE safes_id = ? LIMIT 1");
        if (!$bal_stmt) { throw new Exception("Prepare failed for balance fetch: " . $conn->error); }
        $bal_stmt->bind_param("i", $payments_safe_id);
        $bal_stmt->execute();
        $bal_row = $bal_stmt->get_result()->fetch_assoc();
        $bal_stmt->close();
        $balance_before = isset($bal_row['safes_balance']) ? (float)$bal_row['safes_balance'] : 0.0;
        $balance_after = $balance_before + (float)$payments_amount;

        $safe_transaction_type = 'receipt';
        $safe_transaction_desc = "Payment collection from client ID " . $payments_client_id . " (Payment ID: " . $new_payment_id . ")";
        $safe_transaction_ref = 'payments#' . $new_payment_id;
        $related_table = 'payments';

        $stmt_safe_transaction = $conn->prepare("
            INSERT INTO safe_transactions (
                safe_transactions_safe_id,
                safe_transactions_type,
                safe_transactions_amount,
                safe_transactions_balance_before,
                safe_transactions_balance_after,
                safe_transactions_description,
                safe_transactions_reference,
                safe_transactions_date,
                safe_transactions_created_by,
                safe_transactions_related_table,
                safe_transactions_related_id,
                safe_transactions_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        if (!$stmt_safe_transaction) {
            throw new Exception("Prepare failed for safe transaction insert: " . $conn->error);
        }

        $stmt_safe_transaction->bind_param(
            "isdddsssisi",
            $payments_safe_id,
            $safe_transaction_type,
            $payments_amount,
            $balance_before,
            $balance_after,
            $safe_transaction_desc,
            $safe_transaction_ref,
            $payments_date,
            $payments_rep_user_id,
            $related_table,
            $new_payment_id
        );

        if (!$stmt_safe_transaction->execute()) {
            throw new Exception("Error inserting safe transaction: " . $stmt_safe_transaction->error);
        }
        $new_safe_transaction_id = $stmt_safe_transaction->insert_id;
        $stmt_safe_transaction->close();

        // Update the payments record with the safe_transaction_id
        $stmt_update_payment_with_safe_transaction = $conn->prepare("
            UPDATE payments
            SET payments_safe_transaction_id = ?
            WHERE payments_id = ?
        ");
        if (!$stmt_update_payment_with_safe_transaction) {
            throw new Exception("Prepare failed to update payment with safe_transaction_id: " . $conn->error);
        }
        $stmt_update_payment_with_safe_transaction->bind_param("ii", $new_safe_transaction_id, $new_payment_id);
        if (!$stmt_update_payment_with_safe_transaction->execute()) {
            throw new Exception("Error updating payment with safe_transaction_id: " . $stmt_update_payment_with_safe_transaction->error);
        }
        $stmt_update_payment_with_safe_transaction->close();

        // 4. Update safe's current_balance (increase as money comes in)
        $stmt_update_safe_balance = $conn->prepare("
            UPDATE safes
            SET safes_balance = safes_balance + ?
            WHERE safes_id = ?
        ");

        if (!$stmt_update_safe_balance) {
            throw new Exception("Prepare failed for safe balance update: " . $conn->error);
        }

        $stmt_update_safe_balance->bind_param("di", $payments_amount, $payments_safe_id);

        if (!$stmt_update_safe_balance->execute()) {
            throw new Exception("Error updating safe current balance: " . $stmt_update_safe_balance->error);
        }
        $stmt_update_safe_balance->close();

        $conn->commit();
        
        // Sync to Odoo if integration is enabled
        $odoo_payment_id = null;
        try {
            require_once __DIR__ . '/../odoo/sync_transactions.php';
            if (function_exists('isOdooIntegrationEnabled') && isOdooIntegrationEnabled()) {
                $odoo_payment_id = syncPayment($new_payment_id);
                if ($odoo_payment_id) {
                    error_log("Payment #$new_payment_id synced to Odoo: Payment ID $odoo_payment_id");
                }
            }
        } catch (Exception $odooEx) {
            error_log("Odoo payment sync failed (non-blocking): " . $odooEx->getMessage());
        }
        
        print_success("Payment added successfully, client balance updated, and safe recorded.", [
            'payments_id' => $new_payment_id, 
            'payments_amount' => $payments_amount,
            'odoo_payment_id' => $odoo_payment_id
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
