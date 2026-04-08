<?php
/**
 * Import ALL Customer Transactions from Odoo (CSV Method)
 * 
 * This imports all financial transactions affecting customer balances from a CSV file
 * exported from Odoo PostgreSQL database.
 * 
 * Transaction Types:
 * - invoice → Increases debt (customer owes more)
 * - credit_note → Decreases debt (returns/corrections)
 * - payment → Decreases debt (customer paid)
 * - refund → Increases debt (we gave money back)
 * 
 * RepWave Balance Calculation:
 * Balance = Invoices + Refunds - Payments - Credit Notes
 * 
 * CSV Source: Generated from Odoo using:
 * COPY (SELECT ... FROM repwave_export_customer_transactions) TO 'file.csv' WITH CSV HEADER
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Configuration
$CSV_FILE = __DIR__ . '/../template_company_customer_transactions.csv';
$UPDATE_BALANCE = true; // Whether to update client credit_balance

// Main execution
try {
    $start_time = microtime(true);
    
    // Check if CSV file exists
    if (!file_exists($CSV_FILE)) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'ملف البيانات غير موجود. يرجى تصدير البيانات من Odoo أولاً.',
            'file_path' => $CSV_FILE
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Build client mapping (Odoo partner_id -> RepWave client_id)
    $client_map = [];
    $result = $conn->query("SELECT clients_id, clients_odoo_partner_id FROM clients WHERE clients_odoo_partner_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $client_map[$row['clients_odoo_partner_id']] = $row['clients_id'];
    }
    
    if (empty($client_map)) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'لا يوجد عملاء مرتبطين بـ Odoo. يرجى استيراد العملاء أولاً.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Get default values
    $default_user_id = 1;
    $result = $conn->query("SELECT users_id FROM users WHERE users_role = 'admin' ORDER BY users_id ASC LIMIT 1");
    if ($row = $result->fetch_assoc()) {
        $default_user_id = $row['users_id'];
    }
    
    $default_safe_id = 1;
    $result = $conn->query("SELECT safes_id FROM safes ORDER BY safes_id ASC LIMIT 1");
    if ($row = $result->fetch_assoc()) {
        $default_safe_id = $row['safes_id'];
    }
    
    $default_method_id = 1;
    
    $default_warehouse_id = 1;
    $result = $conn->query("SELECT warehouse_id FROM warehouse ORDER BY warehouse_id ASC LIMIT 1");
    if ($row = $result->fetch_assoc()) {
        $default_warehouse_id = $row['warehouse_id'];
    }
    
    // Read CSV file
    $transactions = [];
    if (($handle = fopen($CSV_FILE, "r")) !== FALSE) {
        $header = fgetcsv($handle); // Read header
        
        // Map header to indices
        $col_map = array_flip($header);
        
        while (($data = fgetcsv($handle)) !== FALSE) {
            $transactions[] = [
                'odoo_move_id' => $data[$col_map['odoo_move_id']] ?? null,
                'transaction_reference' => $data[$col_map['transaction_reference']] ?? '',
                'transaction_date' => $data[$col_map['transaction_date']] ?? date('Y-m-d'),
                'odoo_partner_id' => $data[$col_map['odoo_partner_id']] ?? null,
                'partner_name' => $data[$col_map['partner_name']] ?? '',
                'serial_prefix' => $data[$col_map['serial_prefix']] ?? '',
                'repwave_type' => $data[$col_map['repwave_type']] ?? 'unknown',
                'amount' => floatval($data[$col_map['amount']] ?? 0),
            ];
        }
        fclose($handle);
    }
    
    $total_transactions = count($transactions);
    
    if ($total_transactions == 0) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'لا توجد معاملات في ملف CSV'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Statistics
    $stats = [
        'invoice' => ['count' => 0, 'amount' => 0],
        'credit_note' => ['count' => 0, 'amount' => 0],
        'payment' => ['count' => 0, 'amount' => 0],
        'refund' => ['count' => 0, 'amount' => 0],
        'skipped' => ['count' => 0, 'amount' => 0],
        'unknown' => ['count' => 0, 'amount' => 0],
    ];
    
    $no_client = [];
    
    // Prepare statements
    // payments: client_id, method_id, amount, date, transaction_id, notes, rep_user_id, safe_id
    $stmt_payment = $conn->prepare("INSERT INTO payments 
        (payments_client_id, payments_method_id, payments_amount, payments_date, 
         payments_transaction_id, payments_notes, payments_rep_user_id, payments_safe_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE payments_amount = VALUES(payments_amount)");
    
    // refunds: client_id, return_id (NULL), amount, date, method_id, transaction_id, notes, rep_user_id, safe_id
    $stmt_refund = $conn->prepare("INSERT INTO refunds 
        (refunds_client_id, refunds_return_id, refunds_amount, refunds_date, refunds_method_id,
         refunds_transaction_id, refunds_notes, refunds_rep_user_id, refunds_safe_id)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE refunds_amount = VALUES(refunds_amount)");
    
    // sales_orders (invoices): client_id, rep_id, warehouse_id, date, status, total_amount, notes, odoo_invoice_id
    $stmt_invoice = $conn->prepare("INSERT INTO sales_orders 
        (sales_orders_client_id, sales_orders_representative_id, sales_orders_warehouse_id,
         sales_orders_order_date, sales_orders_status, sales_orders_total_amount, 
         sales_orders_subtotal, sales_orders_notes, sales_orders_odoo_invoice_id)
        VALUES (?, ?, ?, ?, 'Invoiced', ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE sales_orders_total_amount = VALUES(sales_orders_total_amount)");
    
    // sales_returns (credit notes): client_id, date, total_amount, status, notes, odoo_credit_note_id, created_by
    $stmt_credit_note = $conn->prepare("INSERT INTO sales_returns 
        (returns_client_id, returns_date, returns_total_amount, returns_status, 
         returns_notes, returns_odoo_credit_note_id, returns_created_by_user_id)
        VALUES (?, ?, ?, 'Processed', ?, ?, ?)
        ON DUPLICATE KEY UPDATE returns_total_amount = VALUES(returns_total_amount)");
    
    // Track balance changes per client
    $balance_changes = [];
    
    // Process transactions
    $conn->begin_transaction();
    
    try {
        foreach ($transactions as $tx) {
            $odoo_partner_id = $tx['odoo_partner_id'];
            $repwave_type = $tx['repwave_type'];
            $amount = $tx['amount'];
            $date = $tx['transaction_date'];
            $reference = $tx['transaction_reference'];
            $notes = "Odoo Import: " . $reference;
            
            // Find RepWave client
            if (!isset($client_map[$odoo_partner_id])) {
                $partner_name = $tx['partner_name'];
                $no_client[$partner_name] = ($no_client[$partner_name] ?? 0) + $amount;
                $stats['skipped']['count']++;
                $stats['skipped']['amount'] += $amount;
                continue;
            }
            
            $client_id = $client_map[$odoo_partner_id];
            
            // Initialize balance tracking for this client
            if (!isset($balance_changes[$client_id])) {
                $balance_changes[$client_id] = 0;
            }
            
            // Track statistics
            if (isset($stats[$repwave_type])) {
                $stats[$repwave_type]['count']++;
                $stats[$repwave_type]['amount'] += $amount;
            } else {
                $stats['unknown']['count']++;
                $stats['unknown']['amount'] += $amount;
                continue;
            }
            
            // Insert based on type and calculate balance effect
            switch ($repwave_type) {
                case 'payment':
                    // payments: client_id(i), method_id(i), amount(d), date(s), transaction_id(s), notes(s), rep_user_id(i), safe_id(i)
                    $stmt_payment->bind_param("iidsssii",
                        $client_id,
                        $default_method_id,
                        $amount,
                        $date,
                        $reference,
                        $notes,
                        $default_user_id,
                        $default_safe_id
                    );
                    $stmt_payment->execute();
                    
                    // Payment increases credit_balance (customer paid, reduces debt)
                    $balance_changes[$client_id] += $amount;
                    break;
                    
                case 'refund':
                    // refunds: client_id(i), amount(d), date(s), method_id(i), transaction_id(s), notes(s), rep_user_id(i), safe_id(i)
                    $stmt_refund->bind_param("idsissii",
                        $client_id,
                        $amount,
                        $date,
                        $default_method_id,
                        $reference,
                        $notes,
                        $default_user_id,
                        $default_safe_id
                    );
                    $stmt_refund->execute();
                    
                    // Refund decreases credit_balance (we gave money back, increases debt)
                    $balance_changes[$client_id] -= $amount;
                    break;
                    
                case 'invoice':
                    // Insert into sales_orders
                    $odoo_invoice_id = intval($tx['odoo_move_id']);
                    $stmt_invoice->bind_param("iiisddsi",
                        $client_id,
                        $default_user_id,
                        $default_warehouse_id,
                        $date,
                        $amount,
                        $amount,
                        $notes,
                        $odoo_invoice_id
                    );
                    $stmt_invoice->execute();
                    
                    // Invoice decreases credit_balance (customer owes more)
                    $balance_changes[$client_id] -= $amount;
                    break;
                    
                case 'credit_note':
                    // Insert into sales_returns
                    $odoo_credit_note_id = intval($tx['odoo_move_id']);
                    $stmt_credit_note->bind_param("isdsii",
                        $client_id,
                        $date,
                        $amount,
                        $notes,
                        $odoo_credit_note_id,
                        $default_user_id
                    );
                    $stmt_credit_note->execute();
                    
                    // Credit note increases credit_balance (reduces what customer owes)
                    $balance_changes[$client_id] += $amount;
                    break;
            }
        }
        
        // Update client balances if enabled
        if ($UPDATE_BALANCE) {
            $stmt_balance = $conn->prepare("UPDATE clients SET clients_credit_balance = ? WHERE clients_id = ?");
            
            foreach ($balance_changes as $client_id => $net_balance) {
                // Set the balance directly (net_balance is already the calculated balance)
                $stmt_balance->bind_param("di", $net_balance, $client_id);
                $stmt_balance->execute();
            }
            
            $stmt_balance->close();
        }
        
        $conn->commit();
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
    $stmt_payment->close();
    $stmt_refund->close();
    $stmt_invoice->close();
    $stmt_credit_note->close();
    
    // Calculate net balance (this should be positive if customers owe money)
    $net_balance = 
        ($stats['invoice']['amount'] + $stats['refund']['amount']) - 
        ($stats['payment']['amount'] + $stats['credit_note']['amount']);
    
    $elapsed_time = round(microtime(true) - $start_time, 2);
    
    // Return results
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد المعاملات المالية بنجاح",
        'data' => [
            'total_transactions' => $total_transactions,
            'processed' => $total_transactions - $stats['skipped']['count'] - $stats['unknown']['count'],
            'clients_updated' => count($balance_changes),
            'elapsed_time' => $elapsed_time . 's',
            'summary' => [
                'invoices' => [
                    'count' => $stats['invoice']['count'],
                    'amount' => number_format($stats['invoice']['amount'], 2),
                    'effect' => '+ يزيد المديونية'
                ],
                'credit_notes' => [
                    'count' => $stats['credit_note']['count'],
                    'amount' => number_format($stats['credit_note']['amount'], 2),
                    'effect' => '- يقلل المديونية'
                ],
                'payments' => [
                    'count' => $stats['payment']['count'],
                    'amount' => number_format($stats['payment']['amount'], 2),
                    'effect' => '- يقلل المديونية'
                ],
                'refunds' => [
                    'count' => $stats['refund']['count'],
                    'amount' => number_format($stats['refund']['amount'], 2),
                    'effect' => '+ يزيد المديونية'
                ],
                'skipped' => [
                    'count' => $stats['skipped']['count'],
                    'amount' => number_format($stats['skipped']['amount'], 2),
                    'reason' => 'عميل غير موجود في RepWave'
                ],
                'net_ar_balance' => number_format($net_balance, 2)
            ],
            'missing_clients' => array_slice($no_client, 0, 10, true) // Show first 10
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error', 
        'message' => 'خطأ: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
