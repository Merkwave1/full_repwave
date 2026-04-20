<?php
/**
 * Unified Odoo Transaction Sync
 * 
 * Handles synchronization of all financial transactions to Odoo:
 * - Customer Payments (inbound)
 * - Customer Refunds (outbound)
 * - Safe Transfers (internal transfers)
 * 
 * Auto-syncs missing clients and safes before syncing transactions.
 * 
 * @author RepWave Integration
 * @version 1.0
 */

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../functions.php';

// Include contact sync for client auto-sync
if (!function_exists('syncContactToOdoo')) {
    require_once __DIR__ . '/sync_contacts.php';
}

// Include sales order sync for autoSyncClientToOdoo function
if (!function_exists('autoSyncClientToOdoo')) {
    require_once __DIR__ . '/sync_sales_orders.php';
}

/**
 * ============================================================================
 * SAFE SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Ensure a safe exists in Odoo (as a journal)
 * If not, create it and cache the journal ID
 * 
 * @param int $safe_id PHP safe ID
 * @return int|false Odoo journal ID or false on failure
 */
function ensureSafeInOdoo($safe_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    
    try {
        // Get safe data
        $stmt = $conn->prepare("SELECT * FROM safes WHERE safes_id = ?");
        $stmt->bind_param("i", $safe_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $safe = $result->fetch_assoc();
        $stmt->close();
        
        if (!$safe) {
            error_log("Safe not found: ID $safe_id");
            return false;
        }
        
        // Check if already has Odoo journal ID
        if (!empty($safe['safes_odoo_journal_id'])) {
            return (int)$safe['safes_odoo_journal_id'];
        }
        
        // Determine journal type based on safe name/type
        $safe_name = $safe['safes_name'] ?? 'Safe ' . $safe_id;
        $safe_type_lower = strtolower($safe_name);
        $journal_type = 'cash'; // Default
        
        if (strpos($safe_type_lower, 'bank') !== false) {
            $journal_type = 'bank';
        }
        
        // Search for existing journal with same name or create new one
        $domain = [
            ['name', 'ilike', $safe_name],
            ['type', 'in', ['cash', 'bank']]
        ];
        $existing = callOdooAPI('account.journal', 'search', [$domain], ['limit' => 1]);
        
        if ($existing && is_array($existing) && count($existing) > 0) {
            $journal_id = $existing[0];
            error_log("Found existing Odoo journal for safe $safe_id: Journal ID $journal_id");
        } else {
            // Get default account for journal type
            $account_domain = [
                ['account_type', '=', $journal_type === 'bank' ? 'asset_cash' : 'asset_cash']
            ];
            $accounts = callOdooAPI('account.account', 'search', [$account_domain], ['limit' => 1]);
            
            // Create new journal
            $journal_data = [
                'name' => $safe_name,
                'code' => 'RW' . $safe_id,
                'type' => $journal_type,
            ];
            
            $journal_id = callOdooAPI('account.journal', 'create', [$journal_data]);
            
            if (!$journal_id) {
                // Fallback: find any cash/bank journal
                $fallback_domain = [['type', 'in', ['cash', 'bank']]];
                $fallback = callOdooAPI('account.journal', 'search', [$fallback_domain], ['limit' => 1]);
                
                if ($fallback && is_array($fallback) && count($fallback) > 0) {
                    $journal_id = $fallback[0];
                    error_log("Using fallback journal for safe $safe_id: Journal ID $journal_id");
                } else {
                    error_log("Failed to create or find Odoo journal for safe $safe_id");
                    return false;
                }
            } else {
                error_log("Created Odoo journal for safe $safe_id: Journal ID $journal_id");
            }
        }
        
        // Cache the journal ID
        $stmt = $conn->prepare("UPDATE safes SET safes_odoo_journal_id = ? WHERE safes_id = ?");
        $stmt->bind_param("ii", $journal_id, $safe_id);
        $stmt->execute();
        $stmt->close();
        
        return $journal_id;
        
    } catch (Exception $e) {
        error_log("Error ensuring safe in Odoo: " . $e->getMessage());
        return false;
    }
}

/**
 * ============================================================================
 * PAYMENT SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Sync a customer payment to Odoo
 * 
 * @param int $payment_id PHP payment ID
 * @return int|false Odoo payment ID or false on failure
 */
function syncPayment($payment_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_id = false;
    
    try {
        // Get payment data
        $stmt = $conn->prepare("SELECT * FROM payments WHERE payments_id = ?");
        $stmt->bind_param("i", $payment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $payment = $result->fetch_assoc();
        $stmt->close();
        
        if (!$payment) {
            $error_message = 'Payment not found';
            logTransactionSync('payment', $payment_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Check if already synced
        if (!empty($payment['payments_odoo_payment_id'])) {
            return (int)$payment['payments_odoo_payment_id'];
        }
        
        // Ensure client exists in Odoo
        $client_id = $payment['payments_client_id'] ?? null;
        if (!$client_id) {
            $error_message = 'No client ID in payment';
            logTransactionSync('payment', $payment_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        $odoo_partner_id = ensureClientInOdoo($client_id);
        if (!$odoo_partner_id) {
            $error_message = 'Could not sync client to Odoo';
            logTransactionSync('payment', $payment_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Ensure safe exists in Odoo
        $safe_id = $payment['payments_safe_id'] ?? null;
        if (!$safe_id) {
            $error_message = 'No safe ID in payment';
            logTransactionSync('payment', $payment_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        $odoo_journal_id = ensureSafeInOdoo($safe_id);
        if (!$odoo_journal_id) {
            $error_message = 'Could not find/create Odoo journal for safe';
            logTransactionSync('payment', $payment_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare payment data
        $amount = (float)($payment['payments_amount'] ?? 0);
        $payment_date = $payment['payments_date'] ?? date('Y-m-d');
        if (strpos($payment_date, ' ') !== false) {
            $payment_date = substr($payment_date, 0, 10);
        }
        
        $reference = 'RW-PAY-' . $payment_id;
        $memo = $reference;
        if (!empty($payment['payments_notes'])) {
            $memo .= ' - ' . substr($payment['payments_notes'], 0, 100);
        }
        
        // Check if already exists in Odoo
        $existing = findOdooPaymentByMemo($reference);
        if ($existing) {
            $sync_action = 'update';
            $odoo_id = $existing;
            $sync_status = 'success';
            error_log("Payment $payment_id already synced to Odoo: ID $odoo_id");
        } else {
            // Create in Odoo
            $odoo_data = [
                'partner_id' => $odoo_partner_id,
                'partner_type' => 'customer',
                'payment_type' => 'inbound', // Customer payment = money in
                'amount' => $amount,
                'date' => $payment_date,
                'journal_id' => $odoo_journal_id,
                'memo' => $memo,
            ];
            
            $odoo_id = callOdooAPI('account.payment', 'create', [$odoo_data]);
            
            if ($odoo_id) {
                $sync_status = 'success';
                error_log("Created Odoo payment for PHP payment $payment_id: Odoo ID $odoo_id");
                
                // Post the payment
                callOdooAPI('account.payment', 'action_post', [[$odoo_id]]);
            } else {
                $error_message = 'Failed to create payment in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Payment sync error: $error_message");
    }
    
    // Log sync attempt
    logTransactionSync('payment', $payment_id, $odoo_id, $sync_status, $sync_action, $error_message);
    
    // Update local record
    if ($odoo_id) {
        $stmt = $conn->prepare("UPDATE payments SET payments_odoo_payment_id = ? WHERE payments_id = ?");
        $stmt->bind_param("ii", $odoo_id, $payment_id);
        $stmt->execute();
        $stmt->close();
    }
    
    return $odoo_id;
}

/**
 * ============================================================================
 * REFUND SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Sync a customer refund to Odoo
 * 
 * @param int $refund_id PHP refund ID
 * @return int|false Odoo payment ID or false on failure
 */
function syncRefund($refund_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_id = false;
    
    try {
        // Get refund data
        $stmt = $conn->prepare("SELECT * FROM refunds WHERE refunds_id = ?");
        $stmt->bind_param("i", $refund_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $refund = $result->fetch_assoc();
        $stmt->close();
        
        if (!$refund) {
            $error_message = 'Refund not found';
            logTransactionSync('refund', $refund_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Check if already synced
        if (!empty($refund['refunds_odoo_payment_id'])) {
            return (int)$refund['refunds_odoo_payment_id'];
        }
        
        // Ensure client exists in Odoo
        $client_id = $refund['refunds_client_id'] ?? null;
        if (!$client_id) {
            $error_message = 'No client ID in refund';
            logTransactionSync('refund', $refund_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        $odoo_partner_id = ensureClientInOdoo($client_id);
        if (!$odoo_partner_id) {
            $error_message = 'Could not sync client to Odoo';
            logTransactionSync('refund', $refund_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Ensure safe exists in Odoo
        $safe_id = $refund['refunds_safe_id'] ?? null;
        if (!$safe_id) {
            $error_message = 'No safe ID in refund';
            logTransactionSync('refund', $refund_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        $odoo_journal_id = ensureSafeInOdoo($safe_id);
        if (!$odoo_journal_id) {
            $error_message = 'Could not find/create Odoo journal for safe';
            logTransactionSync('refund', $refund_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare refund data
        $amount = (float)($refund['refunds_amount'] ?? 0);
        $refund_date = $refund['refunds_date'] ?? date('Y-m-d');
        if (strpos($refund_date, ' ') !== false) {
            $refund_date = substr($refund_date, 0, 10);
        }
        
        $reference = 'RW-REF-' . $refund_id;
        $memo = $reference;
        if (!empty($refund['refunds_notes'])) {
            $memo .= ' - ' . substr($refund['refunds_notes'], 0, 100);
        }
        
        // Check if already exists in Odoo
        $existing = findOdooPaymentByMemo($reference);
        if ($existing) {
            $sync_action = 'update';
            $odoo_id = $existing;
            $sync_status = 'success';
            error_log("Refund $refund_id already synced to Odoo: ID $odoo_id");
        } else {
            // Create in Odoo - refund is outbound payment to customer
            $odoo_data = [
                'partner_id' => $odoo_partner_id,
                'partner_type' => 'customer',
                'payment_type' => 'outbound', // Refund = money out
                'amount' => $amount,
                'date' => $refund_date,
                'journal_id' => $odoo_journal_id,
                'memo' => $memo,
            ];
            
            $odoo_id = callOdooAPI('account.payment', 'create', [$odoo_data]);
            
            if ($odoo_id) {
                $sync_status = 'success';
                error_log("Created Odoo refund for PHP refund $refund_id: Odoo ID $odoo_id");
                
                // Post the refund
                callOdooAPI('account.payment', 'action_post', [[$odoo_id]]);
            } else {
                $error_message = 'Failed to create refund in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Refund sync error: $error_message");
    }
    
    // Log sync attempt
    logTransactionSync('refund', $refund_id, $odoo_id, $sync_status, $sync_action, $error_message);
    
    // Update local record
    if ($odoo_id) {
        $stmt = $conn->prepare("UPDATE refunds SET refunds_odoo_payment_id = ? WHERE refunds_id = ?");
        $stmt->bind_param("ii", $odoo_id, $refund_id);
        $stmt->execute();
        $stmt->close();
    }
    
    return $odoo_id;
}

/**
 * ============================================================================
 * EXPENSE SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Sync a safe expense or deposit (income) to Odoo as journal entry
 * For expenses:
 * - Debit: Expense account (expense goes up)
 * - Credit: Cash/Bank account (cash goes down)
 * For deposits (income):
 * - Debit: Cash/Bank account (cash goes up)
 * - Credit: Income account (income goes up)
 * 
 * @param int $expense_id PHP safe_transactions ID for expense or deposit
 * @return int|false Odoo move ID or false on failure
 */
function syncExpense($expense_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_id = false;
    
    try {
        // Get expense data
        $stmt = $conn->prepare("
            SELECT st.*, s.safes_name, s.safes_odoo_journal_id, pm.payment_methods_name
            FROM safe_transactions st
            LEFT JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
            LEFT JOIN payment_methods pm ON st.safe_transactions_payment_method_id = pm.payment_methods_id
            WHERE st.safe_transactions_id = ?
        ");
        $stmt->bind_param("i", $expense_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $expense = $result->fetch_assoc();
        $stmt->close();
        
        if (!$expense) {
            $error_message = 'Transaction not found';
            logTransactionSync('expense', $expense_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Determine if this is an expense or deposit (income)
        $transaction_type = strtolower($expense['safe_transactions_type'] ?? 'expense');
        $is_income = ($transaction_type === 'deposit');
        
        // Check if already synced
        if (!empty($expense['safe_transactions_odoo_id'])) {
            return (int)$expense['safe_transactions_odoo_id'];
        }
        
        // Ensure safe exists in Odoo
        $safe_id = $expense['safe_transactions_safe_id'] ?? null;
        if (!$safe_id) {
            $error_message = 'No safe ID in transaction';
            logTransactionSync('expense', $expense_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        $odoo_journal_id = ensureSafeInOdoo($safe_id);
        if (!$odoo_journal_id) {
            $error_message = 'Could not find/create Odoo journal for safe';
            logTransactionSync('expense', $expense_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare expense data
        $amount = abs((float)($expense['safe_transactions_amount'] ?? 0));
        $expense_date = $expense['safe_transactions_date'] ?? date('Y-m-d');
        if (strpos($expense_date, ' ') !== false) {
            $expense_date = substr($expense_date, 0, 10);
        }
        
        $reference = $expense['safe_transactions_reference'] ?? ('RW-EXP-' . $expense_id);
        $description = $expense['safe_transactions_description'] ?? 'مصروف';
        
        $memo = $reference . ' - ' . $description;
        
        // Check if already exists in Odoo
        $existing = findOdooMoveByRef($reference);
        if ($existing) {
            $sync_action = 'update';
            $odoo_id = $existing;
            $sync_status = 'success';
            error_log("Expense $expense_id already synced to Odoo: ID $odoo_id");
        } else {
            // Get default account for the journal (cash/bank account)
            $cash_account_id = getOdooJournalDefaultAccount($odoo_journal_id);
            
            if (!$cash_account_id) {
                $error_message = 'Could not find default account for journal';
                logTransactionSync('expense', $expense_id, null, $sync_status, $sync_action, $error_message);
                return false;
            }
            
            // Get Rep Expenses account
            $expense_account_id = null;
            
            // If a specific account was selected in the app, use its code to find the Odoo account
            if (!empty($expense['safe_transactions_account_id'])) {
                $local_account_id = (int)$expense['safe_transactions_account_id'];
                $acc_stmt = $conn->prepare("SELECT code FROM accounts WHERE id = ?");
                $acc_stmt->bind_param("i", $local_account_id);
                $acc_stmt->execute();
                $acc_res = $acc_stmt->get_result();
                if ($acc_row = $acc_res->fetch_assoc()) {
                    $account_code = $acc_row['code'];
                    error_log("Searching Odoo for account code: $account_code (from local account ID $local_account_id)");
                    $expense_account_id = getOdooAccountByCode($account_code);
                }
                $acc_stmt->close();
            }
            
            // Fallback to default code 400100 if no account selected or not found in Odoo
            if (!$expense_account_id) {
                $expense_account_id = getOdooAccountByCode('400100');
            }
            
            if (!$expense_account_id) {
                // Fallback to any expense account
                $expense_account_id = getOdooExpenseAccount();
            }
            if (!$expense_account_id) {
                // Last fallback: use the same account
                $expense_account_id = $cash_account_id;
            }
            
            // Create journal entry with balanced lines based on transaction type
            if ($is_income) {
                // For income/deposit:
                // 1. Debit cash/bank account (cash goes up)
                // 2. Credit income account (revenue goes up)
                $journal_entry_data = [
                    'move_type' => 'entry',
                    'journal_id' => $odoo_journal_id,
                    'date' => $expense_date,
                    'ref' => $memo,
                    'line_ids' => [
                        [0, 0, [
                            'account_id' => $cash_account_id,
                            'name' => $description,
                            'debit' => $amount,
                            'credit' => 0,
                        ]],
                        [0, 0, [
                            'account_id' => $expense_account_id, // In this case, it's the income account
                            'name' => $description,
                            'debit' => 0,
                            'credit' => $amount,
                        ]],
                    ],
                ];
            } else {
                // For expense:
                // 1. Debit expense account (expense goes up)
                // 2. Credit cash/bank account (cash goes down)
                $journal_entry_data = [
                    'move_type' => 'entry',
                    'journal_id' => $odoo_journal_id,
                    'date' => $expense_date,
                    'ref' => $memo,
                    'line_ids' => [
                        [0, 0, [
                            'account_id' => $expense_account_id,
                            'name' => $description,
                            'debit' => $amount,
                            'credit' => 0,
                        ]],
                        [0, 0, [
                            'account_id' => $cash_account_id,
                            'name' => $description,
                            'debit' => 0,
                            'credit' => $amount,
                        ]],
                    ],
                ];
            }
            
            $odoo_id = callOdooAPI('account.move', 'create', [$journal_entry_data]);
            
            if ($odoo_id) {
                $sync_status = 'success';
                $type_label = $is_income ? 'income' : 'expense';
                error_log("Created Odoo journal entry for PHP $type_label $expense_id: Odoo ID $odoo_id");
                
                // Post the journal entry
                $post_result = callOdooAPI('account.move', 'action_post', [[$odoo_id]]);
                if ($post_result) {
                    error_log("Odoo $type_label journal entry posted: ID $odoo_id");
                }
            } else {
                $error_message = 'Failed to create journal entry in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Expense sync error: $error_message");
    }
    
    // Log sync attempt
    logTransactionSync('expense', $expense_id, $odoo_id, $sync_status, $sync_action, $error_message);
    
    // Update local record
    if ($odoo_id) {
        $stmt = $conn->prepare("UPDATE safe_transactions SET safe_transactions_odoo_id = ? WHERE safe_transactions_id = ?");
        $stmt->bind_param("ii", $odoo_id, $expense_id);
        $stmt->execute();
        $stmt->close();
    }
    
    return $odoo_id;
}

/**
 * ============================================================================
 * SAFE TRANSFER SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Sync a safe transfer to Odoo as internal transfer
 * 
 * @param int $transfer_out_id PHP safe_transactions ID for outgoing transaction
 * @return int|false Odoo payment ID or false on failure
 */
function syncSafeTransfer($transfer_out_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_id = false;
    
    try {
        // Get transfer_out data
        $stmt = $conn->prepare("SELECT * FROM safe_transactions WHERE safe_transactions_id = ?");
        $stmt->bind_param("i", $transfer_out_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $transfer_out = $result->fetch_assoc();
        $stmt->close();
        
        if (!$transfer_out) {
            $error_message = 'Transfer out transaction not found';
            logTransactionSync('transfer', $transfer_out_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Check if already synced
        if (!empty($transfer_out['safe_transactions_odoo_id'])) {
            return (int)$transfer_out['safe_transactions_odoo_id'];
        }
        
        // Get related transfer_in
        $transfer_in_id = $transfer_out['safe_transactions_related_id'] ?? null;
        $transfer_in = null;
        if ($transfer_in_id) {
            $stmt = $conn->prepare("SELECT * FROM safe_transactions WHERE safe_transactions_id = ?");
            $stmt->bind_param("i", $transfer_in_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $transfer_in = $result->fetch_assoc();
            $stmt->close();
        }
        
        // Get source and destination safe IDs
        $source_safe_id = $transfer_out['safe_transactions_safe_id'] ?? null;
        $dest_safe_id = $transfer_in ? ($transfer_in['safe_transactions_safe_id'] ?? null) : null;
        
        if (!$source_safe_id || !$dest_safe_id) {
            $error_message = 'Missing source or destination safe';
            logTransactionSync('transfer', $transfer_out_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Ensure both safes exist in Odoo
        $source_journal_id = ensureSafeInOdoo($source_safe_id);
        $dest_journal_id = ensureSafeInOdoo($dest_safe_id);
        
        if (!$source_journal_id || !$dest_journal_id) {
            $error_message = 'Could not find/create Odoo journals for safes';
            logTransactionSync('transfer', $transfer_out_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare transfer data
        $amount = abs((float)($transfer_out['safe_transactions_amount'] ?? 0));
        $transfer_date = $transfer_out['safe_transactions_date'] ?? date('Y-m-d');
        if (strpos($transfer_date, ' ') !== false) {
            $transfer_date = substr($transfer_date, 0, 10);
        }
        
        $reference = 'RW-TRANSFER-' . $transfer_out_id;
        $description = $transfer_out['safe_transactions_description'] ?? '';
        $memo = $reference;
        if (!empty($description)) {
            $memo .= ' - ' . substr($description, 0, 80);
        }
        
        // Check if already exists in Odoo (search by memo)
        $existing = findOdooPaymentByMemo($reference);
        if ($existing) {
            $sync_action = 'update';
            $odoo_id = $existing;
            $sync_status = 'success';
            error_log("Transfer $transfer_out_id already synced to Odoo: ID $odoo_id");
        } else {
            // In Odoo 18, create internal transfer as a journal entry (account.move)
            // This is the most compatible approach across Odoo versions
            
            // Get default accounts for both journals
            $source_account_id = getOdooJournalDefaultAccount($source_journal_id);
            $dest_account_id = getOdooJournalDefaultAccount($dest_journal_id);
            
            if (!$source_account_id || !$dest_account_id) {
                $error_message = 'Could not find default accounts for journals';
                logTransactionSync('transfer', $transfer_out_id, null, $sync_status, $sync_action, $error_message);
                return false;
            }
            
            // Create journal entry with two lines:
            // 1. Credit the source account (money out)
            // 2. Debit the destination account (money in)
            $journal_entry_data = [
                'move_type' => 'entry',
                'journal_id' => $source_journal_id,
                'date' => $transfer_date,
                'ref' => $memo,
                'line_ids' => [
                    [0, 0, [
                        'account_id' => $source_account_id,
                        'name' => $memo,
                        'debit' => 0,
                        'credit' => $amount,
                    ]],
                    [0, 0, [
                        'account_id' => $dest_account_id,
                        'name' => $memo,
                        'debit' => $amount,
                        'credit' => 0,
                    ]],
                ],
            ];
            
            $odoo_id = callOdooAPI('account.move', 'create', [$journal_entry_data]);
            
            if ($odoo_id) {
                $sync_status = 'success';
                error_log("Created Odoo journal entry for PHP transfer $transfer_out_id: Odoo ID $odoo_id");
                
                // Post the journal entry
                $post_result = callOdooAPI('account.move', 'action_post', [[$odoo_id]]);
                if ($post_result) {
                    error_log("Odoo journal entry posted: ID $odoo_id");
                } else {
                    error_log("Warning: Could not post journal entry, may require manual posting in Odoo");
                }
            } else {
                $error_message = 'Failed to create journal entry in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Transfer sync error: $error_message");
    }
    
    // Log sync attempt
    logTransactionSync('transfer', $transfer_out_id, $odoo_id, $sync_status, $sync_action, $error_message);
    
    // Update local records
    if ($odoo_id) {
        $stmt = $conn->prepare("UPDATE safe_transactions SET safe_transactions_odoo_id = ? WHERE safe_transactions_id = ?");
        $stmt->bind_param("ii", $odoo_id, $transfer_out_id);
        $stmt->execute();
        $stmt->close();
        
        if ($transfer_in_id) {
            $stmt = $conn->prepare("UPDATE safe_transactions SET safe_transactions_odoo_id = ? WHERE safe_transactions_id = ?");
            $stmt->bind_param("ii", $odoo_id, $transfer_in_id);
            $stmt->execute();
            $stmt->close();
        }
    }
    
    return $odoo_id;
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Ensure a client exists in Odoo
 * 
 * @param int $client_id PHP client ID
 * @return int|false Odoo partner ID or false
 */
function ensureClientInOdoo($client_id) {
    global $conn;
    
    try {
        // Check local cache first
        $stmt = $conn->prepare("SELECT clients_odoo_partner_id FROM clients WHERE clients_id = ?");
        $stmt->bind_param("i", $client_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $client = $result->fetch_assoc();
        $stmt->close();
        
        if ($client && !empty($client['clients_odoo_partner_id'])) {
            return (int)$client['clients_odoo_partner_id'];
        }
        
        // Search in Odoo by ref
        $domain = [['ref', '=', (string)$client_id]];
        $existing = callOdooAPI('res.partner', 'search', [$domain], ['limit' => 1]);
        
        if ($existing && is_array($existing) && count($existing) > 0) {
            $odoo_partner_id = $existing[0];
            
            // Cache it
            $stmt = $conn->prepare("UPDATE clients SET clients_odoo_partner_id = ? WHERE clients_id = ?");
            $stmt->bind_param("ii", $odoo_partner_id, $client_id);
            $stmt->execute();
            $stmt->close();
            
            return $odoo_partner_id;
        }
        
        // Auto-sync the client
        if (function_exists('autoSyncClientToOdoo')) {
            $odoo_partner_id = autoSyncClientToOdoo($client_id);
            if ($odoo_partner_id) {
                return $odoo_partner_id;
            }
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error ensuring client in Odoo: " . $e->getMessage());
        return false;
    }
}

/**
 * Get the default account ID for an Odoo journal
 * 
 * @param int $journal_id Odoo journal ID
 * @return int|false Account ID or false
 */
function getOdooJournalDefaultAccount($journal_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $result = callOdooAPI('account.journal', 'read', [[$journal_id], ['default_account_id']]);
        
        if ($result && is_array($result) && count($result) > 0) {
            $journal = $result[0];
            if (!empty($journal['default_account_id']) && is_array($journal['default_account_id'])) {
                return $journal['default_account_id'][0]; // Returns [id, name]
            }
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting Odoo journal default account: " . $e->getMessage());
        return false;
    }
}

/**
 * Find Odoo payment by memo (for payments/refunds)
 */
function findOdooPaymentByMemo($reference) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $domain = [['memo', 'ilike', $reference . '%']];
        $result = callOdooAPI('account.payment', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo payment by memo: " . $e->getMessage());
        return false;
    }
}

/**
 * Find Odoo journal entry (account.move) by ref
 */
function findOdooMoveByRef($reference) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $domain = [['ref', 'ilike', $reference . '%']];
        $result = callOdooAPI('account.move', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo move by ref: " . $e->getMessage());
        return false;
    }
}

/**
 * Get an Odoo account by its code
 * 
 * @param string $code Account code (e.g., '400100')
 * @return int|false Account ID or false
 */
function getOdooAccountByCode($code) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $domain = [['code', '=', $code]];
        $result = callOdooAPI('account.account', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo account by code $code: " . $e->getMessage());
        return false;
    }
}

/**
 * Get a default expense account from Odoo
 * Looks for account with type 'expense' or code starting with 6
 */
function getOdooExpenseAccount() {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        // First try to find by account_type 'expense'
        $domain = [['account_type', '=', 'expense']];
        $result = callOdooAPI('account.account', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        // Fallback: find by code starting with 6 (common expense prefix)
        $domain = [['code', '=like', '6%']];
        $result = callOdooAPI('account.account', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo expense account: " . $e->getMessage());
        return false;
    }
}

/**
 * Log transaction sync attempt
 */
function logTransactionSync($type, $php_id, $odoo_id, $status, $action = 'create', $error_message = null) {
    try {
        global $conn;
        
        $stmt = $conn->prepare("
            INSERT INTO odoo_transaction_sync_logs 
            (transaction_type, php_id, odoo_id, sync_status, sync_action, error_message) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("siisss", $type, $php_id, $odoo_id, $status, $action, $error_message);
        $stmt->execute();
        $stmt->close();
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error logging transaction sync: " . $e->getMessage());
        return false;
    }
}

/**
 * ============================================================================
 * BULK SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Bulk sync all unsynced transactions
 * 
 * @param int $limit Maximum number of each type to sync
 * @return array Results summary
 */
function bulkSyncAllTransactions($limit = 50) {
    if (!isOdooIntegrationEnabled()) {
        return ['error' => 'Odoo integration is disabled'];
    }
    
    global $conn;
    
    $results = [
        'payments' => ['total' => 0, 'success' => 0, 'failed' => 0],
        'refunds' => ['total' => 0, 'success' => 0, 'failed' => 0],
        'transfers' => ['total' => 0, 'success' => 0, 'failed' => 0],
    ];
    
    // Sync payments
    $stmt = $conn->prepare("
        SELECT payments_id FROM payments 
        WHERE payments_odoo_payment_id IS NULL 
        ORDER BY payments_id DESC 
        LIMIT ?
    ");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $results['payments']['total']++;
        $odoo_id = syncPayment($row['payments_id']);
        if ($odoo_id) {
            $results['payments']['success']++;
        } else {
            $results['payments']['failed']++;
        }
    }
    $stmt->close();
    
    // Sync refunds
    $stmt = $conn->prepare("
        SELECT refunds_id FROM refunds 
        WHERE refunds_odoo_payment_id IS NULL 
        ORDER BY refunds_id DESC 
        LIMIT ?
    ");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $results['refunds']['total']++;
        $odoo_id = syncRefund($row['refunds_id']);
        if ($odoo_id) {
            $results['refunds']['success']++;
        } else {
            $results['refunds']['failed']++;
        }
    }
    $stmt->close();
    
    // Sync safe transfers (only transfer_out records)
    $stmt = $conn->prepare("
        SELECT safe_transactions_id FROM safe_transactions 
        WHERE safe_transactions_type = 'transfer_out'
        AND safe_transactions_odoo_id IS NULL 
        ORDER BY safe_transactions_id DESC 
        LIMIT ?
    ");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $results['transfers']['total']++;
        $odoo_id = syncSafeTransfer($row['safe_transactions_id']);
        if ($odoo_id) {
            $results['transfers']['success']++;
        } else {
            $results['transfers']['failed']++;
        }
    }
    $stmt->close();
    
    return $results;
}

/**
 * ============================================================================
 * API ENDPOINT
 * ============================================================================
 */

// Handle direct API calls
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'sync_transactions.php') {
    header('Content-Type: application/json');
    
    $action = $_GET['action'] ?? $_POST['action'] ?? 'bulk';
    $type = $_GET['type'] ?? $_POST['type'] ?? null;
    $id = $_GET['id'] ?? $_POST['id'] ?? null;
    $limit = (int)($_GET['limit'] ?? $_POST['limit'] ?? 50);
    
    try {
        $response = [];
        
        switch ($action) {
            case 'sync_payment':
                if (!$id) {
                    $response = ['status' => 'error', 'message' => 'Payment ID required'];
                } else {
                    $odoo_id = syncPayment((int)$id);
                    $response = [
                        'status' => $odoo_id ? 'success' : 'failed',
                        'payment_id' => $id,
                        'odoo_id' => $odoo_id
                    ];
                }
                break;
                
            case 'sync_refund':
                if (!$id) {
                    $response = ['status' => 'error', 'message' => 'Refund ID required'];
                } else {
                    $odoo_id = syncRefund((int)$id);
                    $response = [
                        'status' => $odoo_id ? 'success' : 'failed',
                        'refund_id' => $id,
                        'odoo_id' => $odoo_id
                    ];
                }
                break;
                
            case 'sync_transfer':
                if (!$id) {
                    $response = ['status' => 'error', 'message' => 'Transfer ID required'];
                } else {
                    $odoo_id = syncSafeTransfer((int)$id);
                    $response = [
                        'status' => $odoo_id ? 'success' : 'failed',
                        'transfer_id' => $id,
                        'odoo_id' => $odoo_id
                    ];
                }
                break;
                
            case 'sync_expense':
                if (!$id) {
                    $response = ['status' => 'error', 'message' => 'Expense ID required'];
                } else {
                    $odoo_id = syncExpense((int)$id);
                    $response = [
                        'status' => $odoo_id ? 'success' : 'failed',
                        'expense_id' => $id,
                        'odoo_id' => $odoo_id
                    ];
                }
                break;
                
            case 'bulk':
            default:
                $results = bulkSyncAllTransactions($limit);
                $response = [
                    'status' => 'success',
                    'message' => 'Bulk sync completed',
                    'results' => $results
                ];
                break;
        }
        
        echo json_encode($response, JSON_PRETTY_PRINT);
        
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
    
    exit;
}
