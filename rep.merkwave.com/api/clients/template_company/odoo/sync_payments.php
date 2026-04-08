<?php
/**
 * Odoo Payment Sync Functions
 * 
 * Handles synchronization of customer payments to Odoo account.payment model.
 * 
 * @author RepWave Integration
 * @version 1.0
 */

if (!function_exists('callOdooAPI')) {
    require_once __DIR__ . '/../functions.php';
}

// Include isOdooIntegrationEnabled function
if (!function_exists('isOdooIntegrationEnabled')) {
    require_once __DIR__ . '/sync_contacts.php';
}

/**
 * Sync a customer payment to Odoo
 * 
 * @param array $paymentData The payment data from the payments table
 * @param int $php_payment_id The PHP payment ID
 * @return int|false Odoo account.payment ID or false on failure
 */
function syncPaymentToOdoo($paymentData, $php_payment_id) {
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo payment sync skipped: Integration is disabled');
        return false;
    }
    
    global $pdo, $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_payment_id = false;
    
    try {
        // Get Odoo partner ID from PHP client
        $client_id = $paymentData['payments_client_id'] ?? null;
        if (!$client_id) {
            $error_message = 'No client ID in payment data';
            logPaymentSync($php_payment_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        $odoo_partner_id = getOdooPartnerIdFromClient($client_id);
        if (!$odoo_partner_id) {
            // Try to auto-sync the client first
            error_log("Client $client_id not found in Odoo for payment sync, attempting auto-sync...");
            if (function_exists('autoSyncClientToOdoo')) {
                $odoo_partner_id = autoSyncClientToOdoo($client_id);
            }
            
            if (!$odoo_partner_id) {
                $error_message = 'Client not found in Odoo and auto-sync failed';
                logPaymentSync($php_payment_id, null, $sync_status, $sync_action, $error_message);
                return false;
            }
        }
        
        // Get Odoo journal ID for customer payments (typically "Bank" or "Cash")
        $odoo_journal_id = getOdooPaymentJournal($paymentData['payments_method_id'] ?? 1);
        if (!$odoo_journal_id) {
            $error_message = 'Could not find appropriate Odoo payment journal';
            logPaymentSync($php_payment_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare Odoo payment data
        $payment_amount = (float)($paymentData['payments_amount'] ?? 0);
        $payment_date = $paymentData['payments_date'] ?? date('Y-m-d');
        // Ensure date is in Y-m-d format
        if (strpos($payment_date, ' ') !== false) {
            $payment_date = substr($payment_date, 0, 10);
        }
        
        $odoo_payment_data = [
            'partner_id' => $odoo_partner_id,
            'partner_type' => 'customer',
            'payment_type' => 'inbound', // Customer payment = inbound
            'amount' => $payment_amount,
            'date' => $payment_date,
            'journal_id' => $odoo_journal_id,
            'memo' => 'RW-PAY-' . $php_payment_id, // Reference to PHP payment (Odoo 18 uses 'memo' instead of 'ref')
        ];
        
        // Add memo/communication if notes exist
        if (!empty($paymentData['payments_notes'])) {
            $odoo_payment_data['memo'] .= ' - ' . substr($paymentData['payments_notes'], 0, 100);
        }
        
        // Check if payment already exists by memo reference
        $existing_payment = findOdooPaymentByReference('RW-PAY-' . $php_payment_id);
        
        if ($existing_payment) {
            // Update existing payment (if not posted)
            $sync_action = 'update';
            
            // Check payment state
            $payment_info = callOdooAPI('account.payment', 'read', [[$existing_payment], ['state']]);
            if ($payment_info && isset($payment_info[0]['state']) && $payment_info[0]['state'] === 'posted') {
                // Already posted, can't update
                error_log("Odoo payment $existing_payment is already posted, skipping update");
                $odoo_payment_id = $existing_payment;
                $sync_status = 'success';
            } else {
                // Update the draft payment
                $result = callOdooAPI('account.payment', 'write', [[$existing_payment], $odoo_payment_data]);
                if ($result) {
                    $odoo_payment_id = $existing_payment;
                    $sync_status = 'success';
                    error_log("Odoo payment sync successful: Updated payment ID $odoo_payment_id");
                } else {
                    $error_message = 'Failed to update payment in Odoo';
                }
            }
        } else {
            // Create new payment
            $odoo_payment_id = callOdooAPI('account.payment', 'create', [$odoo_payment_data]);
            
            if ($odoo_payment_id) {
                $sync_status = 'success';
                error_log("Odoo payment sync successful: Created payment ID $odoo_payment_id");
                
                // Post the payment (validate/confirm it)
                $post_result = callOdooAPI('account.payment', 'action_post', [[$odoo_payment_id]]);
                if ($post_result) {
                    error_log("Odoo payment posted: ID $odoo_payment_id");
                } else {
                    error_log("Warning: Failed to post Odoo payment ID $odoo_payment_id");
                }
            } else {
                $error_message = 'Failed to create payment in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo payment sync error: $error_message");
    }
    
    // Log the sync attempt
    logPaymentSync($php_payment_id, $odoo_payment_id, $sync_status, $sync_action, $error_message);
    
    // Update payments table with Odoo payment ID
    if ($odoo_payment_id && ($conn || $pdo)) {
        try {
            if ($conn) {
                $stmt = $conn->prepare("UPDATE payments SET payments_odoo_payment_id = ? WHERE payments_id = ?");
                $stmt->bind_param("ii", $odoo_payment_id, $php_payment_id);
                $stmt->execute();
                $stmt->close();
            } elseif ($pdo) {
                $stmt = $pdo->prepare("UPDATE payments SET payments_odoo_payment_id = ? WHERE payments_id = ?");
                $stmt->execute([$odoo_payment_id, $php_payment_id]);
            }
        } catch (Exception $e) {
            error_log("Failed to update payment with Odoo ID: " . $e->getMessage());
        }
    }
    
    return $odoo_payment_id;
}

/**
 * Get Odoo payment journal ID based on payment method
 * 
 * @param int $payment_method_id PHP payment method ID
 * @return int|false Odoo journal ID or false
 */
function getOdooPaymentJournal($payment_method_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        // Map common payment methods to Odoo journal types
        // 1 = Cash typically, 2 = Bank, etc.
        // We'll search for journals by type
        
        global $conn;
        $journal_type = 'cash'; // Default to cash
        
        if ($conn && $payment_method_id) {
            $stmt = $conn->prepare("SELECT payment_methods_name FROM payment_methods WHERE payment_methods_id = ?");
            $stmt->bind_param("i", $payment_method_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $method = $result->fetch_assoc();
            $stmt->close();
            
            if ($method) {
                $method_name = strtolower($method['payment_methods_name'] ?? '');
                if (strpos($method_name, 'bank') !== false || strpos($method_name, 'transfer') !== false) {
                    $journal_type = 'bank';
                }
            }
        }
        
        // Search for journal in Odoo
        $domain = [
            ['type', '=', $journal_type],
            ['company_id', '=', 1] // Assuming single company
        ];
        $journals = callOdooAPI('account.journal', 'search', [$domain], ['limit' => 1]);
        
        if ($journals && is_array($journals) && count($journals) > 0) {
            return $journals[0];
        }
        
        // Fallback: try to find any payment journal
        $domain = [['type', 'in', ['cash', 'bank']]];
        $journals = callOdooAPI('account.journal', 'search', [$domain], ['limit' => 1]);
        
        if ($journals && is_array($journals) && count($journals) > 0) {
            return $journals[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting Odoo payment journal: " . $e->getMessage());
        return false;
    }
}

/**
 * Find Odoo payment by reference (memo field in Odoo 18)
 * 
 * @param string $reference Payment reference (e.g., RW-PAY-123)
 * @return int|false Odoo payment ID or false
 */
function findOdooPaymentByReference($reference) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        // Odoo 18 uses 'memo' instead of 'ref' for account.payment
        $domain = [['memo', 'ilike', $reference . '%']];
        $result = callOdooAPI('account.payment', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo payment: " . $e->getMessage());
        return false;
    }
}

/**
 * Get Odoo partner ID from PHP client ID
 * (Re-using from sync_sales_orders if available, otherwise implement here)
 */
if (!function_exists('getOdooPartnerIdFromClient')) {
    function getOdooPartnerIdFromClient($php_client_id) {
        if (!isOdooIntegrationEnabled()) {
            return false;
        }
        
        try {
            global $pdo, $conn;
            
            // First check local cache
            if ($conn) {
                $stmt = $conn->prepare("SELECT clients_odoo_partner_id FROM clients WHERE clients_id = ?");
                $stmt->bind_param("i", $php_client_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $client = $result->fetch_assoc();
                $stmt->close();
                
                if ($client && !empty($client['clients_odoo_partner_id'])) {
                    return (int)$client['clients_odoo_partner_id'];
                }
            } elseif ($pdo) {
                $stmt = $pdo->prepare("SELECT clients_odoo_partner_id FROM clients WHERE clients_id = ?");
                $stmt->execute([$php_client_id]);
                $client = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($client && !empty($client['clients_odoo_partner_id'])) {
                    return (int)$client['clients_odoo_partner_id'];
                }
            }
            
            // Search in Odoo by ref
            $domain = [['ref', '=', (string)$php_client_id]];
            $result = callOdooAPI('res.partner', 'search', [$domain], ['limit' => 1]);
            
            if ($result && is_array($result) && count($result) > 0) {
                return $result[0];
            }
            
            return false;
            
        } catch (Exception $e) {
            error_log("Error getting Odoo partner ID: " . $e->getMessage());
            return false;
        }
    }
}

/**
 * Log payment sync attempt to unified transaction sync logs table
 */
function logPaymentSync($php_payment_id, $odoo_payment_id, $status, $action = 'create', $error_message = null) {
    try {
        global $pdo, $conn;
        
        // Create unified table if not exists
        $createTable = "
            CREATE TABLE IF NOT EXISTS odoo_transaction_sync_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_type ENUM('payment', 'transfer') NOT NULL,
                php_id INT NOT NULL,
                odoo_id INT NULL,
                sync_status ENUM('success', 'failed') NOT NULL,
                sync_action ENUM('create', 'update') NOT NULL DEFAULT 'create',
                error_message TEXT NULL,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_transaction_type (transaction_type),
                INDEX idx_php_id (php_id),
                INDEX idx_odoo_id (odoo_id),
                INDEX idx_sync_status (sync_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        if ($conn) {
            $conn->query($createTable);
            
            $stmt = $conn->prepare("
                INSERT INTO odoo_transaction_sync_logs 
                (transaction_type, php_id, odoo_id, sync_status, sync_action, error_message) 
                VALUES ('payment', ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("iisss", $php_payment_id, $odoo_payment_id, $status, $action, $error_message);
            $stmt->execute();
            $stmt->close();
        } elseif ($pdo) {
            $pdo->exec($createTable);
            
            $stmt = $pdo->prepare("
                INSERT INTO odoo_transaction_sync_logs 
                (transaction_type, php_id, odoo_id, sync_status, sync_action, error_message) 
                VALUES ('payment', ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$php_payment_id, $odoo_payment_id ?: null, $status, $action, $error_message]);
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error logging payment sync: " . $e->getMessage());
        return false;
    }
}

/**
 * Sync a payment by ID
 * 
 * @param int $payment_id PHP payment ID
 * @return int|false Odoo payment ID or false
 */
function syncPaymentById($payment_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn, $pdo;
    
    try {
        $paymentData = null;
        
        if ($conn) {
            $stmt = $conn->prepare("SELECT * FROM payments WHERE payments_id = ?");
            $stmt->bind_param("i", $payment_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $paymentData = $result->fetch_assoc();
            $stmt->close();
        } elseif ($pdo) {
            $stmt = $pdo->prepare("SELECT * FROM payments WHERE payments_id = ?");
            $stmt->execute([$payment_id]);
            $paymentData = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$paymentData) {
            error_log("Payment not found: ID $payment_id");
            return false;
        }
        
        return syncPaymentToOdoo($paymentData, $payment_id);
        
    } catch (Exception $e) {
        error_log("Error syncing payment by ID: " . $e->getMessage());
        return false;
    }
}

/**
 * Bulk sync unsynced payments
 * 
 * @param int $limit Maximum number to sync
 * @return array Results
 */
function bulkSyncUnsyncedPayments($limit = 50) {
    if (!isOdooIntegrationEnabled()) {
        return ['total' => 0, 'success' => 0, 'failed' => 0];
    }
    
    global $conn, $pdo;
    
    $results = ['total' => 0, 'success' => 0, 'failed' => 0, 'details' => []];
    
    try {
        $payments = [];
        
        if ($conn) {
            $stmt = $conn->prepare("
                SELECT * FROM payments 
                WHERE payments_odoo_payment_id IS NULL 
                ORDER BY payments_id DESC 
                LIMIT ?
            ");
            $stmt->bind_param("i", $limit);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $payments[] = $row;
            }
            $stmt->close();
        } elseif ($pdo) {
            $stmt = $pdo->prepare("
                SELECT * FROM payments 
                WHERE payments_odoo_payment_id IS NULL 
                ORDER BY payments_id DESC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        $results['total'] = count($payments);
        
        foreach ($payments as $payment) {
            $odoo_id = syncPaymentToOdoo($payment, $payment['payments_id']);
            
            if ($odoo_id) {
                $results['success']++;
                $results['details'][] = ['payment_id' => $payment['payments_id'], 'odoo_id' => $odoo_id, 'status' => 'success'];
            } else {
                $results['failed']++;
                $results['details'][] = ['payment_id' => $payment['payments_id'], 'odoo_id' => null, 'status' => 'failed'];
            }
        }
        
    } catch (Exception $e) {
        error_log("Error in bulk payment sync: " . $e->getMessage());
    }
    
    return $results;
}

/**
 * Sync a customer refund to Odoo
 * 
 * @param array $refundData The refund data from the refunds table
 * @param int $php_refund_id The PHP refund ID
 * @return int|false Odoo account.payment ID or false on failure
 */
function syncRefundToOdoo($refundData, $php_refund_id) {
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo refund sync skipped: Integration is disabled');
        return false;
    }
    
    global $pdo, $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_payment_id = false;
    
    try {
        // Get Odoo partner ID from PHP client
        $client_id = $refundData['refunds_client_id'] ?? null;
        if (!$client_id) {
            $error_message = 'No client ID in refund data';
            logRefundSync($php_refund_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        $odoo_partner_id = getOdooPartnerIdFromClient($client_id);
        if (!$odoo_partner_id) {
            // Try to auto-sync the client first
            error_log("Client $client_id not found in Odoo for refund sync, attempting auto-sync...");
            if (function_exists('autoSyncClientToOdoo')) {
                $odoo_partner_id = autoSyncClientToOdoo($client_id);
            }
            
            if (!$odoo_partner_id) {
                $error_message = 'Client not found in Odoo and auto-sync failed';
                logRefundSync($php_refund_id, null, $sync_status, $sync_action, $error_message);
                return false;
            }
        }
        
        // Get Odoo journal ID for customer refunds
        $odoo_journal_id = getOdooPaymentJournal($refundData['refunds_method_id'] ?? 1);
        if (!$odoo_journal_id) {
            $error_message = 'Could not find appropriate Odoo payment journal';
            logRefundSync($php_refund_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare Odoo payment data (refund = outbound payment to customer)
        $refund_amount = (float)($refundData['refunds_amount'] ?? 0);
        $refund_date = $refundData['refunds_date'] ?? date('Y-m-d');
        // Ensure date is in Y-m-d format
        if (strpos($refund_date, ' ') !== false) {
            $refund_date = substr($refund_date, 0, 10);
        }
        
        $odoo_payment_data = [
            'partner_id' => $odoo_partner_id,
            'partner_type' => 'customer',
            'payment_type' => 'outbound', // Customer refund = outbound
            'amount' => $refund_amount,
            'date' => $refund_date,
            'journal_id' => $odoo_journal_id,
            'memo' => 'RW-REF-' . $php_refund_id, // Reference to PHP refund
        ];
        
        // Add memo/communication if notes exist
        if (!empty($refundData['refunds_notes'])) {
            $odoo_payment_data['memo'] .= ' - ' . substr($refundData['refunds_notes'], 0, 100);
        }
        
        // Check if refund already exists by memo reference
        $existing_payment = findOdooPaymentByReference('RW-REF-' . $php_refund_id);
        
        if ($existing_payment) {
            // Update existing payment (if not posted)
            $sync_action = 'update';
            
            // Check payment state
            $payment_info = callOdooAPI('account.payment', 'read', [[$existing_payment], ['state']]);
            if ($payment_info && isset($payment_info[0]['state']) && $payment_info[0]['state'] === 'posted') {
                // Already posted, can't update
                error_log("Odoo refund payment $existing_payment is already posted, skipping update");
                $odoo_payment_id = $existing_payment;
                $sync_status = 'success';
            } else {
                // Update the draft payment
                $result = callOdooAPI('account.payment', 'write', [[$existing_payment], $odoo_payment_data]);
                if ($result) {
                    $odoo_payment_id = $existing_payment;
                    $sync_status = 'success';
                    error_log("Odoo refund sync successful: Updated payment ID $odoo_payment_id");
                } else {
                    $error_message = 'Failed to update refund in Odoo';
                }
            }
        } else {
            // Create new payment
            $odoo_payment_id = callOdooAPI('account.payment', 'create', [$odoo_payment_data]);
            
            if ($odoo_payment_id) {
                $sync_status = 'success';
                error_log("Odoo refund sync successful: Created payment ID $odoo_payment_id");
                
                // Post the payment (validate/confirm it)
                $post_result = callOdooAPI('account.payment', 'action_post', [[$odoo_payment_id]]);
                if ($post_result) {
                    error_log("Odoo refund posted: ID $odoo_payment_id");
                } else {
                    error_log("Warning: Failed to post Odoo refund ID $odoo_payment_id");
                }
            } else {
                $error_message = 'Failed to create refund in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo refund sync error: $error_message");
    }
    
    // Log the sync attempt
    logRefundSync($php_refund_id, $odoo_payment_id, $sync_status, $sync_action, $error_message);
    
    // Update refunds table with Odoo payment ID
    if ($odoo_payment_id && ($conn || $pdo)) {
        try {
            if ($conn) {
                $stmt = $conn->prepare("UPDATE refunds SET refunds_odoo_payment_id = ? WHERE refunds_id = ?");
                $stmt->bind_param("ii", $odoo_payment_id, $php_refund_id);
                $stmt->execute();
                $stmt->close();
            } elseif ($pdo) {
                $stmt = $pdo->prepare("UPDATE refunds SET refunds_odoo_payment_id = ? WHERE refunds_id = ?");
                $stmt->execute([$odoo_payment_id, $php_refund_id]);
            }
        } catch (Exception $e) {
            error_log("Failed to update refund with Odoo ID: " . $e->getMessage());
        }
    }
    
    return $odoo_payment_id;
}

/**
 * Log refund sync attempt
 */
function logRefundSync($php_refund_id, $odoo_payment_id, $status, $action = 'create', $error_message = null) {
    try {
        global $pdo, $conn;
        
        // Create unified table if not exists
        $createTable = "
            CREATE TABLE IF NOT EXISTS odoo_transaction_sync_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_type ENUM('payment', 'refund', 'transfer') NOT NULL,
                php_id INT NOT NULL,
                odoo_id INT NULL,
                sync_status ENUM('success', 'failed') NOT NULL,
                sync_action ENUM('create', 'update') NOT NULL DEFAULT 'create',
                error_message TEXT NULL,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_transaction_type (transaction_type),
                INDEX idx_php_id (php_id),
                INDEX idx_odoo_id (odoo_id),
                INDEX idx_sync_status (sync_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        if ($conn) {
            $conn->query($createTable);
            
            $stmt = $conn->prepare("
                INSERT INTO odoo_transaction_sync_logs 
                (transaction_type, php_id, odoo_id, sync_status, sync_action, error_message) 
                VALUES ('refund', ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("iisss", $php_refund_id, $odoo_payment_id, $status, $action, $error_message);
            $stmt->execute();
            $stmt->close();
        } elseif ($pdo) {
            $pdo->exec($createTable);
            
            $stmt = $pdo->prepare("
                INSERT INTO odoo_transaction_sync_logs 
                (transaction_type, php_id, odoo_id, sync_status, sync_action, error_message) 
                VALUES ('refund', ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$php_refund_id, $odoo_payment_id ?: null, $status, $action, $error_message]);
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error logging refund sync: " . $e->getMessage());
        return false;
    }
}

/**
 * Sync a refund by ID
 * 
 * @param int $refund_id PHP refund ID
 * @return int|false Odoo payment ID or false
 */
function syncRefundById($refund_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn, $pdo;
    
    try {
        $refundData = null;
        
        if ($conn) {
            $stmt = $conn->prepare("SELECT * FROM refunds WHERE refunds_id = ?");
            $stmt->bind_param("i", $refund_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $refundData = $result->fetch_assoc();
            $stmt->close();
        } elseif ($pdo) {
            $stmt = $pdo->prepare("SELECT * FROM refunds WHERE refunds_id = ?");
            $stmt->execute([$refund_id]);
            $refundData = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$refundData) {
            error_log("Refund not found: ID $refund_id");
            return false;
        }
        
        return syncRefundToOdoo($refundData, $refund_id);
        
    } catch (Exception $e) {
        error_log("Error syncing refund by ID: " . $e->getMessage());
        return false;
    }
}

