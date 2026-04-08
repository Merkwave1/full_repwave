<?php
/**
 * Odoo Safe Transfer Sync Functions
 * 
 * Handles synchronization of safe transfers to Odoo as internal transfers
 * (journal entries moving funds between cash/bank journals).
 * 
 * @author RepWave Integration
 * @version 1.0
 */

if (!function_exists('callOdooAPI')) {
    require_once __DIR__ . '/../functions.php';
}

if (!function_exists('isOdooIntegrationEnabled')) {
    require_once __DIR__ . '/sync_contacts.php';
}

/**
 * Sync a safe transfer to Odoo as an internal transfer
 * 
 * In Odoo, internal transfers are typically handled as:
 * - account.payment with payment_type='outbound' from source
 * - account.payment with payment_type='inbound' to destination
 * OR as a journal entry (account.move) if more control is needed
 * 
 * @param array $transferData Transfer data including source/dest safe IDs, amount
 * @param int $transfer_out_id PHP safe_transactions ID for the outgoing transaction
 * @param int $transfer_in_id PHP safe_transactions ID for the incoming transaction
 * @return array|false Array with odoo_out_id and odoo_in_id or false on failure
 */
function syncSafeTransferToOdoo($transferData, $transfer_out_id, $transfer_in_id) {
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo safe transfer sync skipped: Integration is disabled');
        return false;
    }
    
    global $conn, $pdo;
    $sync_status = 'failed';
    $error_message = null;
    $odoo_transfer_id = false;
    
    try {
        $source_safe_id = $transferData['source_safe_id'] ?? null;
        $dest_safe_id = $transferData['destination_safe_id'] ?? null;
        $amount = (float)($transferData['transfer_amount'] ?? 0);
        $transfer_date = $transferData['transfer_date'] ?? date('Y-m-d');
        $notes = $transferData['transfer_notes'] ?? '';
        
        if (!$source_safe_id || !$dest_safe_id || $amount <= 0) {
            $error_message = 'Invalid transfer data: missing source, destination, or amount';
            logSafeTransferSync($transfer_out_id, null, $sync_status, 'create', $error_message);
            return false;
        }
        
        // Get Odoo journals for source and destination safes
        $source_journal_id = getOdooJournalForSafe($source_safe_id);
        $dest_journal_id = getOdooJournalForSafe($dest_safe_id);
        
        if (!$source_journal_id || !$dest_journal_id) {
            $error_message = 'Could not find Odoo journals for safes';
            logSafeTransferSync($transfer_out_id, null, $sync_status, 'create', $error_message);
            return false;
        }
        
        // Ensure date is in Y-m-d format
        if (strpos($transfer_date, ' ') !== false) {
            $transfer_date = substr($transfer_date, 0, 10);
        }
        
        $reference = 'RW-TRANSFER-' . $transfer_out_id;
        
        // Create internal transfer in Odoo using account.payment
        // Odoo 15+ has 'is_internal_transfer' field
        $odoo_transfer_data = [
            'payment_type' => 'outbound',
            'partner_type' => 'supplier', // Internal transfers don't need a real partner
            'amount' => $amount,
            'date' => $transfer_date,
            'journal_id' => $source_journal_id,
            'destination_journal_id' => $dest_journal_id,
            'is_internal_transfer' => true,
            'ref' => $reference,
        ];
        
        if (!empty($notes)) {
            $odoo_transfer_data['ref'] .= ' - ' . substr($notes, 0, 100);
        }
        
        // Check if transfer already exists
        $existing = findOdooTransferByReference($reference);
        
        if ($existing) {
            // Already synced
            $odoo_transfer_id = $existing;
            $sync_status = 'success';
            error_log("Odoo transfer already exists: ID $odoo_transfer_id");
        } else {
            // Create new internal transfer
            $odoo_transfer_id = callOdooAPI('account.payment', 'create', [$odoo_transfer_data]);
            
            if ($odoo_transfer_id) {
                $sync_status = 'success';
                error_log("Odoo internal transfer created: ID $odoo_transfer_id");
                
                // Post the transfer if status is approved
                $status = $transferData['status'] ?? 'approved';
                if ($status === 'approved') {
                    $post_result = callOdooAPI('account.payment', 'action_post', [[$odoo_transfer_id]]);
                    if ($post_result) {
                        error_log("Odoo internal transfer posted: ID $odoo_transfer_id");
                    } else {
                        error_log("Warning: Failed to post Odoo transfer ID $odoo_transfer_id");
                    }
                }
            } else {
                $error_message = 'Failed to create internal transfer in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo safe transfer sync error: $error_message");
    }
    
    // Log the sync
    logSafeTransferSync($transfer_out_id, $odoo_transfer_id, $sync_status, 'create', $error_message);
    
    // Update safe_transactions with Odoo ID
    if ($odoo_transfer_id && ($conn || $pdo)) {
        try {
            if ($conn) {
                // Update both out and in transactions
                $stmt = $conn->prepare("UPDATE safe_transactions SET safe_transactions_odoo_id = ? WHERE safe_transactions_id IN (?, ?)");
                $stmt->bind_param("iii", $odoo_transfer_id, $transfer_out_id, $transfer_in_id);
                $stmt->execute();
                $stmt->close();
            } elseif ($pdo) {
                $stmt = $pdo->prepare("UPDATE safe_transactions SET safe_transactions_odoo_id = ? WHERE safe_transactions_id IN (?, ?)");
                $stmt->execute([$odoo_transfer_id, $transfer_out_id, $transfer_in_id]);
            }
        } catch (Exception $e) {
            error_log("Failed to update safe_transactions with Odoo ID: " . $e->getMessage());
        }
    }
    
    return $odoo_transfer_id ? ['odoo_transfer_id' => $odoo_transfer_id] : false;
}

/**
 * Get Odoo journal ID for a PHP safe
 * 
 * @param int $safe_id PHP safe ID
 * @return int|false Odoo journal ID
 */
function getOdooJournalForSafe($safe_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn, $pdo;
    
    try {
        // Check if safe has a cached Odoo journal ID
        $safe_data = null;
        if ($conn) {
            $stmt = $conn->prepare("SELECT safes_name, safes_type, safes_odoo_journal_id FROM safes WHERE safes_id = ?");
            $stmt->bind_param("i", $safe_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $safe_data = $result->fetch_assoc();
            $stmt->close();
        } elseif ($pdo) {
            $stmt = $pdo->prepare("SELECT safes_name, safes_type, safes_odoo_journal_id FROM safes WHERE safes_id = ?");
            $stmt->execute([$safe_id]);
            $safe_data = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$safe_data) {
            return false;
        }
        
        // If we have a cached journal ID, return it
        if (!empty($safe_data['safes_odoo_journal_id'])) {
            return (int)$safe_data['safes_odoo_journal_id'];
        }
        
        // Determine journal type based on safe type/name
        $journal_type = 'cash'; // Default
        $safe_name = strtolower($safe_data['safes_name'] ?? '');
        $safe_type = strtolower($safe_data['safes_type'] ?? '');
        
        if (strpos($safe_name, 'bank') !== false || strpos($safe_type, 'bank') !== false) {
            $journal_type = 'bank';
        }
        
        // Search for matching journal in Odoo
        $domain = [
            ['type', '=', $journal_type],
        ];
        $journals = callOdooAPI('account.journal', 'search', [$domain], ['limit' => 1]);
        
        if ($journals && is_array($journals) && count($journals) > 0) {
            $journal_id = $journals[0];
            
            // Cache the journal ID in the safe record
            try {
                if ($conn) {
                    $stmt = $conn->prepare("UPDATE safes SET safes_odoo_journal_id = ? WHERE safes_id = ?");
                    $stmt->bind_param("ii", $journal_id, $safe_id);
                    $stmt->execute();
                    $stmt->close();
                } elseif ($pdo) {
                    $stmt = $pdo->prepare("UPDATE safes SET safes_odoo_journal_id = ? WHERE safes_id = ?");
                    $stmt->execute([$journal_id, $safe_id]);
                }
            } catch (Exception $e) {
                // Column might not exist yet, ignore
            }
            
            return $journal_id;
        }
        
        // Fallback: get any cash/bank journal
        $domain = [['type', 'in', ['cash', 'bank']]];
        $journals = callOdooAPI('account.journal', 'search', [$domain], ['limit' => 1]);
        
        if ($journals && is_array($journals) && count($journals) > 0) {
            return $journals[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting Odoo journal for safe: " . $e->getMessage());
        return false;
    }
}

/**
 * Find Odoo transfer by reference
 */
function findOdooTransferByReference($reference) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $domain = [['ref', 'ilike', $reference . '%']];
        $result = callOdooAPI('account.payment', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo transfer: " . $e->getMessage());
        return false;
    }
}

/**
 * Log safe transfer sync attempt to unified transaction sync logs table
 */
function logSafeTransferSync($php_transaction_id, $odoo_id, $status, $action = 'create', $error_message = null) {
    try {
        global $conn, $pdo;
        
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
                VALUES ('transfer', ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("iisss", $php_transaction_id, $odoo_id, $status, $action, $error_message);
            $stmt->execute();
            $stmt->close();
        } elseif ($pdo) {
            $pdo->exec($createTable);
            
            $stmt = $pdo->prepare("
                INSERT INTO odoo_transaction_sync_logs 
                (transaction_type, php_id, odoo_id, sync_status, sync_action, error_message) 
                VALUES ('transfer', ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$php_transaction_id, $odoo_id ?: null, $status, $action, $error_message]);
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error logging safe transfer sync: " . $e->getMessage());
        return false;
    }
}

/**
 * Sync a safe transaction (non-transfer) to Odoo
 * This handles deposits, withdrawals, receipts, etc.
 * 
 * @param array $transactionData Transaction data
 * @param int $transaction_id PHP transaction ID
 * @return int|false Odoo ID or false
 */
function syncSafeTransactionToOdoo($transactionData, $transaction_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn, $pdo;
    $sync_status = 'failed';
    $error_message = null;
    $odoo_id = false;
    
    try {
        $safe_id = $transactionData['safe_transactions_safe_id'] ?? null;
        $type = $transactionData['safe_transactions_type'] ?? '';
        $amount = (float)($transactionData['safe_transactions_amount'] ?? 0);
        $date = $transactionData['safe_transactions_date'] ?? date('Y-m-d');
        $description = $transactionData['safe_transactions_description'] ?? '';
        
        if (!$safe_id || $amount <= 0) {
            return false;
        }
        
        // Skip transfer types (handled separately)
        if (in_array($type, ['transfer_in', 'transfer_out'])) {
            return false;
        }
        
        $journal_id = getOdooJournalForSafe($safe_id);
        if (!$journal_id) {
            $error_message = 'Could not find Odoo journal for safe';
            return false;
        }
        
        // Ensure date format
        if (strpos($date, ' ') !== false) {
            $date = substr($date, 0, 10);
        }
        
        // Determine payment type based on transaction type
        $payment_type = 'inbound'; // Money coming in (deposits, receipts, sales)
        $partner_type = 'customer';
        
        $outbound_types = ['withdrawal', 'expense', 'supplier_payment', 'purchase'];
        if (in_array($type, $outbound_types)) {
            $payment_type = 'outbound';
            $partner_type = 'supplier';
        }
        
        $reference = 'RW-TXN-' . $transaction_id;
        
        // Check if already synced
        $existing = findOdooTransferByReference($reference);
        if ($existing) {
            return $existing;
        }
        
        $odoo_data = [
            'payment_type' => $payment_type,
            'partner_type' => $partner_type,
            'amount' => $amount,
            'date' => $date,
            'journal_id' => $journal_id,
            'ref' => $reference . ($description ? ' - ' . substr($description, 0, 80) : ''),
        ];
        
        $odoo_id = callOdooAPI('account.payment', 'create', [$odoo_data]);
        
        if ($odoo_id) {
            $sync_status = 'success';
            
            // Post it
            callOdooAPI('account.payment', 'action_post', [[$odoo_id]]);
            
            // Update local record
            try {
                if ($conn) {
                    $stmt = $conn->prepare("UPDATE safe_transactions SET safe_transactions_odoo_id = ? WHERE safe_transactions_id = ?");
                    $stmt->bind_param("ii", $odoo_id, $transaction_id);
                    $stmt->execute();
                    $stmt->close();
                }
            } catch (Exception $e) {
                // Column might not exist
            }
        } else {
            $error_message = 'Failed to create transaction in Odoo';
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo safe transaction sync error: $error_message");
    }
    
    return $odoo_id;
}
