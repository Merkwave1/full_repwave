<?php
/**
 * Odoo Sales Order Sync Functions
 * 
 * Handles synchronization of sales orders to Odoo.
 * 
 * @author RepWave Integration
 * @version 1.0
 */

if (!function_exists('callOdooAPI')) {
    require_once __DIR__ . '/../functions.php';
}

// Include the isOdooIntegrationEnabled function
if (!function_exists('isOdooIntegrationEnabled')) {
    require_once __DIR__ . '/sync_contacts.php';
}

// Include product sync for finding products
if (!function_exists('findOdooProductByRepwaveId')) {
    require_once __DIR__ . '/sync_products.php';
}

// Include inventory sync for warehouse mapping
if (!function_exists('ensureWarehouseInOdoo')) {
    require_once __DIR__ . '/sync_inventory.php';
}

/**
 * Ensure warehouse exists in Odoo and get its warehouse ID (not location ID)
 * This is used for sales orders which need the warehouse_id field
 * 
 * @param int $warehouse_id PHP warehouse ID
 * @return int|false Odoo stock.warehouse ID or false
 */
function ensureWarehouseInOdooForSales($warehouse_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    
    try {
        // Get warehouse data
        $stmt = $conn->prepare("SELECT * FROM warehouse WHERE warehouse_id = ?");
        $stmt->bind_param("i", $warehouse_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $warehouse = $result->fetch_assoc();
        $stmt->close();
        
        if (!$warehouse) {
            error_log("Warehouse not found: ID $warehouse_id");
            return false;
        }
        
        // Check if already has Odoo warehouse ID cached
        if (!empty($warehouse['warehouse_odoo_warehouse_id'])) {
            return (int)$warehouse['warehouse_odoo_warehouse_id'];
        }
        
        // Call ensureWarehouseInOdoo to create/find the warehouse and cache IDs
        // This will populate both warehouse_odoo_location_id and warehouse_odoo_warehouse_id
        ensureWarehouseInOdoo($warehouse_id);
        
        // Re-fetch to get the cached warehouse ID
        $stmt = $conn->prepare("SELECT warehouse_odoo_warehouse_id FROM warehouse WHERE warehouse_id = ?");
        $stmt->bind_param("i", $warehouse_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $warehouse = $result->fetch_assoc();
        $stmt->close();
        
        if (!empty($warehouse['warehouse_odoo_warehouse_id'])) {
            return (int)$warehouse['warehouse_odoo_warehouse_id'];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error ensuring warehouse in Odoo for sales: " . $e->getMessage());
        return false;
    }
}

/**
 * Sync a sales order to Odoo
 * 
 * @param array $orderData The sales order data
 * @param int $php_order_id The PHP sales order ID
 * @param array $orderItems The order items array
 * @return array|false Array with 'order_id' and 'invoice_id' or false on failure
 */
function syncSalesOrderToOdoo($orderData, $php_order_id, $orderItems = []) {
    // Check if integration is enabled FIRST
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo sales order sync skipped: Integration is disabled');
        return false;
    }

    // Only sync if status is 'Invoiced'
    $status = $orderData['sales_orders_status'] ?? '';
    if (strcasecmp($status, 'Invoiced') !== 0) {
        // We only sync when status is Invoiced
        return false;
    }
    
    global $pdo;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_order_id = false;
    $odoo_invoice_id = false;
    
    try {
        // Get Odoo partner ID from PHP client - auto-sync if not found
        $odoo_partner_id = getOdooPartnerIdFromClient($orderData['sales_orders_client_id']);
        if (!$odoo_partner_id) {
            // Client not found in Odoo, attempt to sync it first
            error_log("Client {$orderData['sales_orders_client_id']} not found in Odoo, attempting auto-sync...");
            $odoo_partner_id = autoSyncClientToOdoo($orderData['sales_orders_client_id']);
            
            if (!$odoo_partner_id) {
                $error_message = 'Failed to auto-sync client to Odoo. Please sync the client manually.';
                logSalesOrderSync($php_order_id, null, $sync_status, $sync_action, $error_message);
                return false;
            }
            error_log("Client auto-synced successfully, Odoo partner ID: $odoo_partner_id");
        }
        
        // Prepare Odoo sale order data
        $odoo_order_data = [
            'partner_id' => $odoo_partner_id,
            'rw_id' => (string)$php_order_id,
        ];
        
        // Set warehouse for the sales order (determines delivery source location)
        if (!empty($orderData['sales_orders_warehouse_id'])) {
            $odoo_warehouse_id = ensureWarehouseInOdooForSales($orderData['sales_orders_warehouse_id']);
            if ($odoo_warehouse_id) {
                $odoo_order_data['warehouse_id'] = $odoo_warehouse_id;
            }
        }
        
        // Client Order Reference (optional)
        if (!empty($orderData['sales_orders_notes'])) {
            $odoo_order_data['note'] = $orderData['sales_orders_notes'];
        }
        
        // Order Date
        if (!empty($orderData['sales_orders_order_date'])) {
            $odoo_order_data['date_order'] = $orderData['sales_orders_order_date'];
        }
        
        // Expected Delivery Date -> Commitment Date
        if (!empty($orderData['sales_orders_expected_delivery_date'])) {
            $odoo_order_data['commitment_date'] = $orderData['sales_orders_expected_delivery_date'];
        }
        
        // Sales Representative
        if (!empty($orderData['sales_orders_representative_id'])) {
            $odoo_employee_id = getOrCreateOdooEmployee($orderData['sales_orders_representative_id']);
            if ($odoo_employee_id) {
                $odoo_order_data['sales_representative_id'] = $odoo_employee_id;
            }
        }
        
        // Check if order already exists by rw_id
        $existing_order = findOdooSalesOrderByRepwaveId($php_order_id);
        
        if ($existing_order) {
            // Update existing order
            $sync_action = 'update';
            $result = callOdooAPI('sale.order', 'write', [[$existing_order], $odoo_order_data]);
            
            if ($result) {
                $odoo_order_id = $existing_order;
                $sync_status = 'success';
                error_log("Odoo sales order sync successful: Updated order ID $odoo_order_id");
                
                // Update order lines (delete existing and add new)
                // Only if order is in draft or sent state
                $order_info = callOdooAPI('sale.order', 'read', [[$odoo_order_id], ['state', 'order_line']]);
                if ($order_info && isset($order_info[0])) {
                    $current_state = $order_info[0]['state'];
                    
                    // If order is confirmed ('sale'), try to reset to draft to allow editing
                    if ($current_state === 'sale') {
                        error_log("Order $odoo_order_id is in 'sale' state. Attempting to reset to draft to update lines.");
                        callOdooAPI('sale.order', 'action_cancel', [[$odoo_order_id]]);
                        callOdooAPI('sale.order', 'action_draft', [[$odoo_order_id]]);
                        // Re-fetch state and order_line (as they might have changed or been cleared)
                        $order_info_new = callOdooAPI('sale.order', 'read', [[$odoo_order_id], ['state', 'order_line']]);
                        if ($order_info_new && isset($order_info_new[0])) {
                            $current_state = $order_info_new[0]['state'];
                            $order_info[0]['order_line'] = $order_info_new[0]['order_line'];
                        }
                    }

                    if (in_array($current_state, ['draft', 'sent', 'sale'])) {
                        // Delete existing lines
                        if (!empty($order_info[0]['order_line'])) {
                            callOdooAPI('sale.order.line', 'unlink', [$order_info[0]['order_line']]);
                        }
                        
                        // Add new lines
                        if (!empty($orderItems)) {
                            $lines_success = addOrderLinesToOdoo($odoo_order_id, $orderItems);
                            if (!$lines_success) {
                                error_log("Warning: Some order lines failed to sync for updated order $odoo_order_id");
                            }
                        }
                    } else {
                        error_log("Skipping line update for order $odoo_order_id because state is $current_state");
                    }
                }

                // Confirm and create invoice (only for Invoiced status)
                // Check if already confirmed to avoid error
                $current_state_check = callOdooAPI('sale.order', 'read', [[$odoo_order_id], ['state']]);
                $is_confirmed = false;
                if ($current_state_check && isset($current_state_check[0]) && $current_state_check[0]['state'] !== 'sale') {
                    $is_confirmed = confirmOdooSalesOrder($odoo_order_id);
                } else {
                    $is_confirmed = true;
                }
                
                $odoo_invoice_id = createOdooInvoice($odoo_order_id);
                
                // Fallback: If invoice creation failed (e.g. because confirmation failed due to stock rules),
                // try to create a standalone invoice linked to the order
                if (!$odoo_invoice_id) {
                    error_log("Standard invoice creation failed for order $odoo_order_id. Attempting fallback standalone invoice creation.");
                    $odoo_invoice_id = createStandaloneOdooInvoice($odoo_order_id, $odoo_order_data, $orderItems);
                    if ($odoo_invoice_id) {
                        error_log("Fallback standalone invoice created: $odoo_invoice_id for order $odoo_order_id");
                    }
                }
                if ($odoo_invoice_id) {
                    error_log("Odoo invoice created/found: $odoo_invoice_id for order $odoo_order_id");
                }
            } else {
                $error_message = 'Failed to update sales order in Odoo';
            }
        } else {
            // Create new order
            $odoo_order_id = callOdooAPI('sale.order', 'create', [$odoo_order_data]);
            
            if ($odoo_order_id) {
                $sync_status = 'success';
                error_log("Odoo sales order sync successful: Created order ID $odoo_order_id");
                
                // Add order lines
                if (!empty($orderItems)) {
                    $lines_success = addOrderLinesToOdoo($odoo_order_id, $orderItems);
                    if (!$lines_success) {
                        error_log("Warning: Some order lines failed to sync for order $odoo_order_id");
                    }
                }
                
                // Confirm the order and create invoice (only for Invoiced status)
                confirmOdooSalesOrder($odoo_order_id);
                $odoo_invoice_id = createOdooInvoice($odoo_order_id);
                if ($odoo_invoice_id) {
                    error_log("Odoo invoice created: $odoo_invoice_id for order $odoo_order_id");
                }
            } else {
                $error_message = 'Failed to create sales order in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo sales order sync error: $error_message");
    }
    
    // Log the sync attempt and update local DB
    if ($php_order_id) {
        global $conn;
        
        if ($pdo) {
            logSalesOrderSync($php_order_id, $odoo_order_id, $sync_status, $sync_action, $error_message, $odoo_invoice_id);
        }
        
        // Update the sales_orders table with Odoo order ID and invoice ID
        if ($odoo_order_id !== false && $odoo_order_id > 0) {
            try {
                // Build update query based on whether we have invoice ID
                if ($odoo_invoice_id && $odoo_invoice_id > 0) {
                    // Update both order ID and invoice ID
                    if ($pdo) {
                        $updateStmt = $pdo->prepare("UPDATE sales_orders SET sales_orders_odoo_order_id = ?, sales_orders_odoo_invoice_id = ? WHERE sales_orders_id = ?");
                        $updateStmt->execute([$odoo_order_id, $odoo_invoice_id, $php_order_id]);
                        error_log("Updated sales_orders with Odoo order ID $odoo_order_id and invoice ID $odoo_invoice_id for order #$php_order_id (PDO)");
                    } elseif ($conn) {
                        $updateStmt = $conn->prepare("UPDATE sales_orders SET sales_orders_odoo_order_id = ?, sales_orders_odoo_invoice_id = ? WHERE sales_orders_id = ?");
                        $updateStmt->bind_param("iii", $odoo_order_id, $odoo_invoice_id, $php_order_id);
                        $updateStmt->execute();
                        $updateStmt->close();
                        error_log("Updated sales_orders with Odoo order ID $odoo_order_id and invoice ID $odoo_invoice_id for order #$php_order_id (mysqli)");
                    }
                } else {
                    // Update only order ID
                    if ($pdo) {
                        $updateStmt = $pdo->prepare("UPDATE sales_orders SET sales_orders_odoo_order_id = ? WHERE sales_orders_id = ?");
                        $updateStmt->execute([$odoo_order_id, $php_order_id]);
                        error_log("Updated sales_orders with Odoo order ID $odoo_order_id for order #$php_order_id (PDO)");
                    } elseif ($conn) {
                        $updateStmt = $conn->prepare("UPDATE sales_orders SET sales_orders_odoo_order_id = ? WHERE sales_orders_id = ?");
                        $updateStmt->bind_param("ii", $odoo_order_id, $php_order_id);
                        $updateStmt->execute();
                        $updateStmt->close();
                        error_log("Updated sales_orders with Odoo order ID $odoo_order_id for order #$php_order_id (mysqli)");
                    }
                }
                
                if (!$pdo && !$conn) {
                    error_log("Neither PDO nor mysqli connection available to update sales order with Odoo ID");
                }
            } catch (Exception $e) {
                error_log("Failed to update sales order with Odoo order ID: " . $e->getMessage());
            }
        }
    }
    
    // Return both order ID and invoice ID
    return [
        'order_id' => $odoo_order_id,
        'invoice_id' => $odoo_invoice_id
    ];
}

/**
 * Add order lines to Odoo sale order
 * 
 * @param int $odoo_order_id Odoo sale.order ID
 * @param array $orderItems Array of order items
 * @return bool Success status
 */
function addOrderLinesToOdoo($odoo_order_id, $orderItems) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    $all_success = true;
    
    foreach ($orderItems as $item) {
        try {
            // Find Odoo product by Repwave variant ID
            $variant_id = $item['sales_order_items_variant_id'] ?? null;
            if (empty($variant_id)) {
                error_log("Skipping order line: No variant ID");
                $all_success = false;
                continue;
            }
            
            $odoo_product_id = findOdooProductByRepwaveId($variant_id);
            if (!$odoo_product_id) {
                // Product not found in Odoo, attempt to auto-sync it
                error_log("Product variant $variant_id not found in Odoo, attempting auto-sync...");
                $odoo_product_id = autoSyncProductToOdoo($variant_id);
                
                if (!$odoo_product_id) {
                    error_log("Failed to auto-sync product variant $variant_id to Odoo, skipping line");
                    $all_success = false;
                    continue;
                }
                error_log("Product auto-synced successfully, Odoo product ID: $odoo_product_id");
            }
            
            // Prepare order line data
            $line_data = [
                'order_id' => $odoo_order_id,
                'product_id' => $odoo_product_id,
                'product_uom_qty' => (float)($item['sales_order_items_quantity'] ?? 1),
                'price_unit' => (float)($item['sales_order_items_unit_price'] ?? 0),
            ];

            // Explicit tax control: if has_tax is false or tax_rate is 0, remove taxes
            $has_tax_flag = isset($item['sales_order_items_has_tax']) ? (bool)$item['sales_order_items_has_tax'] : null;
            $tax_rate_val = isset($item['sales_order_items_tax_rate']) ? (float)$item['sales_order_items_tax_rate'] : null;
            if (($has_tax_flag === false) || ($tax_rate_val !== null && $tax_rate_val <= 0)) {
                // Remove any default taxes
                $line_data['tax_id'] = [[6, 0, []]];
            } elseif ($tax_rate_val !== null && $tax_rate_val > 0) {
                // Try to assign a matching tax by percentage for sales
                try {
                    $domain = [
                        ['amount', '=', $tax_rate_val],
                        ['type_tax_use', '=', 'sale'],
                    ];
                    $tax_ids = callOdooAPI('account.tax', 'search', [$domain], ['limit' => 1]);
                    if ($tax_ids && is_array($tax_ids) && count($tax_ids) > 0) {
                        $line_data['tax_id'] = [[6, 0, [$tax_ids[0]]]];
                    }
                } catch (Exception $e) {
                    error_log('Tax resolution failed: ' . $e->getMessage());
                }
            }
            
            // Discount (if any) - Odoo uses percentage
            if (!empty($item['sales_order_items_discount_amount']) && !empty($item['sales_order_items_subtotal'])) {
                $subtotal = (float)$item['sales_order_items_subtotal'];
                if ($subtotal > 0) {
                    $discount_pct = ((float)$item['sales_order_items_discount_amount'] / $subtotal) * 100;
                    $line_data['discount'] = $discount_pct;
                }
            }
            
            // Notes
            if (!empty($item['sales_order_items_notes'])) {
                $line_data['name'] = $item['sales_order_items_notes'];
            }
            
            // Create order line
            $line_id = callOdooAPI('sale.order.line', 'create', [$line_data]);
            
            if (!$line_id) {
                error_log("Failed to create order line for variant: $variant_id");
                $all_success = false;
            }
            
        } catch (Exception $e) {
            error_log("Error adding order line: " . $e->getMessage());
            $all_success = false;
        }
    }
    
    return $all_success;
}

/**
 * Find Odoo sales order by Repwave Order ID (rw_id)
 * 
 * @param int $rw_id Repwave order ID
 * @return int|false Odoo order ID or false
 */
function findOdooSalesOrderByRepwaveId($rw_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if (empty($rw_id)) {
            return false;
        }
        
        $domain = [['rw_id', '=', (string)$rw_id]];
        $result = callOdooAPI('sale.order', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo sales order by Repwave ID: " . $e->getMessage());
        return false;
    }
}

/**
 * Get Odoo partner ID from PHP client ID
 * 
 * @param int $php_client_id PHP client ID
 * @return int|false Odoo partner ID or false
 */
function getOdooPartnerIdFromClient($php_client_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        global $pdo;
        
        // First check if we have it stored locally
        if ($pdo) {
            $stmt = $pdo->prepare("SELECT clients_odoo_partner_id FROM clients WHERE clients_id = ?");
            $stmt->execute([$php_client_id]);
            $client = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($client && !empty($client['clients_odoo_partner_id'])) {
                return (int)$client['clients_odoo_partner_id'];
            }
        }
        
        // If not stored, search in Odoo by ref (which is the PHP client ID)
        $domain = [['ref', '=', (string)$php_client_id]];
        $result = callOdooAPI('res.partner', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            $odoo_partner_id = $result[0];
            
            // Store it locally for future use
            if ($pdo) {
                try {
                    $updateStmt = $pdo->prepare("UPDATE clients SET clients_odoo_partner_id = ? WHERE clients_id = ?");
                    $updateStmt->execute([$odoo_partner_id, $php_client_id]);
                } catch (Exception $e) {
                    error_log("Failed to cache Odoo partner ID: " . $e->getMessage());
                }
            }
            
            return $odoo_partner_id;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting Odoo partner ID: " . $e->getMessage());
        return false;
    }
}

/**
 * Confirm a sales order in Odoo
 * 
 * @param int $odoo_order_id Odoo sale.order ID
 * @return bool Success status
 */
function confirmOdooSalesOrder($odoo_order_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        // Call the action_confirm method on the sale order
        $result = callOdooAPI('sale.order', 'action_confirm', [[$odoo_order_id]]);
        
        if ($result !== false) {
            error_log("Odoo sales order confirmed: ID $odoo_order_id");
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error confirming Odoo sales order: " . $e->getMessage());
        return false;
    }
}

/**
 * Cancel a sales order in Odoo
 * 
 * @param int $odoo_order_id Odoo sale.order ID
 * @return bool Success status
 */
function cancelOdooSalesOrder($odoo_order_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $result = callOdooAPI('sale.order', 'action_cancel', [[$odoo_order_id]]);
        
        if ($result !== false) {
            error_log("Odoo sales order cancelled: ID $odoo_order_id");
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error cancelling Odoo sales order: " . $e->getMessage());
        return false;
    }
}

/**
 * Create and post an invoice for a sales order in Odoo
 * 
 * @param int $odoo_order_id Odoo sale.order ID
 * @return int|false Created invoice ID or false
 */
function createOdooInvoice($odoo_order_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }

    try {
        // Check if order is already invoiced fully
        $order_info = callOdooAPI('sale.order', 'read', [[$odoo_order_id], ['invoice_status', 'invoice_ids']]);
        if ($order_info && isset($order_info[0])) {
            if ($order_info[0]['invoice_status'] === 'invoiced') {
                error_log("Order $odoo_order_id is already fully invoiced.");
                if (!empty($order_info[0]['invoice_ids'])) {
                    return $order_info[0]['invoice_ids'][0];
                }
                return true;
            }
        }

        // Use the wizard to create the invoice
        // We must link the wizard to the sales order via sale_order_ids
        $wizard_data = [
            'advance_payment_method' => 'delivered',
            'sale_order_ids' => [[6, 0, [$odoo_order_id]]]
        ];

        $wizard_id = callOdooAPI('sale.advance.payment.inv', 'create', [$wizard_data]);
        
        if ($wizard_id) {
             error_log("Created invoice wizard ID: $wizard_id for order $odoo_order_id");
             
             // Call create_invoices on the wizard
             // We pass context just in case, though sale_order_ids should handle it
             $context = ['active_ids' => [$odoo_order_id], 'active_id' => $odoo_order_id];
             $result = callOdooAPI('sale.advance.payment.inv', 'create_invoices', [[$wizard_id]], ['context' => $context]);
             
             if ($result) {
                 error_log("Wizard create_invoices executed successfully.");
                 
                 // Now fetch the invoice ID from the sales order
                 // The invoice should be linked to the order now
                 $updated_order = callOdooAPI('sale.order', 'read', [[$odoo_order_id], ['invoice_ids']]);
                 
                 if ($updated_order && !empty($updated_order[0]['invoice_ids'])) {
                     // Get the last invoice ID (in case there are multiple, though unlikely for a new sync)
                     $invoice_ids = $updated_order[0]['invoice_ids'];
                     $invoice_id = end($invoice_ids);
                     
                     error_log("Found created Odoo invoice ID: $invoice_id");
                     
                     // Post the invoice (validate it)
                     $post_result = callOdooAPI('account.move', 'action_post', [[$invoice_id]]);
                     if ($post_result) {
                         error_log("Posted Odoo invoice ID: $invoice_id");
                     } else {
                         error_log("Failed to post Odoo invoice ID: $invoice_id");
                     }
                     
                     return $invoice_id;
                 } else {
                     error_log("No invoice_ids found on order $odoo_order_id after wizard execution.");
                 }
             } else {
                 error_log("Wizard create_invoices returned false/null.");
             }
        } else {
             error_log("Failed to create sale.advance.payment.inv wizard.");
        }
        
        return false;

    } catch (Exception $e) {
        error_log("Error creating Odoo invoice: " . $e->getMessage());
        return false;
    }
}

/**
 * Create a standalone invoice in Odoo linked to a sales order
 * Used as fallback when standard flow fails (e.g. due to stock rules)
 * 
 * @param int $odoo_order_id Odoo sale.order ID
 * @param array $orderData Order data used for creation
 * @param array $orderItems Order items
 * @return int|false Created invoice ID or false
 */
function createStandaloneOdooInvoice($odoo_order_id, $orderData, $orderItems) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }

    try {
        // Get order name for reference
        $order_info = callOdooAPI('sale.order', 'read', [[$odoo_order_id], ['name', 'partner_id', 'date_order']]);
        if (!$order_info || !isset($order_info[0])) {
            return false;
        }
        
        $so_name = $order_info[0]['name'];
        $partner_id = $order_info[0]['partner_id'][0];
        $invoice_date = isset($orderData['date_order']) ? date('Y-m-d', strtotime($orderData['date_order'])) : date('Y-m-d');

        // Prepare invoice lines
        $invoice_lines = [];
        foreach ($orderItems as $item) {
            $variant_id = $item['sales_order_items_variant_id'] ?? null;
            if (empty($variant_id)) continue;
            
            $odoo_product_id = findOdooProductByRepwaveId($variant_id);
            if (!$odoo_product_id) continue;
            
            $line_data = [
                'product_id' => $odoo_product_id,
                'quantity' => (float)($item['sales_order_items_quantity'] ?? 1),
                'price_unit' => (float)($item['sales_order_items_unit_price'] ?? 0),
            ];
            
            // Tax
            $tax_rate_val = isset($item['sales_order_items_tax_rate']) ? (float)$item['sales_order_items_tax_rate'] : null;
            if ($tax_rate_val !== null && $tax_rate_val > 0) {
                try {
                    $domain = [['amount', '=', $tax_rate_val], ['type_tax_use', '=', 'sale']];
                    $tax_ids = callOdooAPI('account.tax', 'search', [$domain], ['limit' => 1]);
                    if ($tax_ids && count($tax_ids) > 0) {
                        $line_data['tax_ids'] = [[6, 0, [$tax_ids[0]]]];
                    }
                } catch (Exception $e) {}
            } else {
                 $line_data['tax_ids'] = [[6, 0, []]];
            }
            
            // Discount
            if (!empty($item['sales_order_items_discount_amount']) && !empty($item['sales_order_items_subtotal'])) {
                $subtotal = (float)$item['sales_order_items_subtotal'];
                if ($subtotal > 0) {
                    $line_data['discount'] = ((float)$item['sales_order_items_discount_amount'] / $subtotal) * 100;
                }
            }
            
            $invoice_lines[] = [0, 0, $line_data];
        }

        if (empty($invoice_lines)) return false;

        // Create Invoice
        $invoice_data = [
            'move_type' => 'out_invoice',
            'partner_id' => $partner_id,
            'invoice_date' => $invoice_date,
            'invoice_origin' => $so_name, // Link to SO by name
            'ref' => $so_name,
            'invoice_line_ids' => $invoice_lines,
        ];

        $invoice_id = callOdooAPI('account.move', 'create', [$invoice_data]);
        
        if ($invoice_id) {
            // Post the invoice
            callOdooAPI('account.move', 'action_post', [[$invoice_id]]);
            
            // Try to link invoice lines to order lines
            try {
                // Fetch Order Lines
                $order_data = callOdooAPI('sale.order', 'read', [[$odoo_order_id], ['order_line']]);
                if ($order_data && !empty($order_data[0]['order_line'])) {
                    $order_line_ids = $order_data[0]['order_line'];
                    $order_lines = callOdooAPI('sale.order.line', 'read', [$order_line_ids, ['product_id']]);
                    
                    // Fetch Invoice Lines
                    $invoice_data_read = callOdooAPI('account.move', 'read', [[$invoice_id], ['invoice_line_ids']]);
                    if ($invoice_data_read && !empty($invoice_data_read[0]['invoice_line_ids'])) {
                        $invoice_line_ids = $invoice_data_read[0]['invoice_line_ids'];
                        $invoice_lines_read = callOdooAPI('account.move.line', 'read', [$invoice_line_ids, ['product_id', 'sale_line_ids']]);
                        
                        // Match and Link
                        foreach ($invoice_lines_read as $inv_line) {
                            $inv_product_id = $inv_line['product_id'][0];
                            foreach ($order_lines as $ord_line) {
                                $ord_product_id = $ord_line['product_id'][0];
                                if ($inv_product_id == $ord_product_id) {
                                    $current_sale_lines = $inv_line['sale_line_ids'];
                                    if (!in_array($ord_line['id'], $current_sale_lines)) {
                                        $new_sale_lines = array_merge($current_sale_lines, [$ord_line['id']]);
                                        callOdooAPI('account.move.line', 'write', [[$inv_line['id']], ['sale_line_ids' => [[6, 0, $new_sale_lines]]]]);
                                    }
                                    break; 
                                }
                            }
                        }
                    }
                }
            } catch (Exception $e) {
                error_log("Error linking standalone invoice lines to order lines: " . $e->getMessage());
            }

            return $invoice_id;
        }
        
        return false;

    } catch (Exception $e) {
        error_log("Error creating standalone invoice: " . $e->getMessage());
        return false;
    }
}

/**
 * Log sales order sync attempt
 * 
 * @param int $php_order_id PHP sales order ID
 * @param int|null $odoo_order_id Odoo order ID (if successful)
 * @param string $status Sync status (success/failed)
 * @param string $action Sync action (create/update)
 * @param string|null $error_message Error message (if failed)
 * @param int|null $odoo_invoice_id Odoo invoice ID (if created)
 * @return bool Success status
 */
function logSalesOrderSync($php_order_id, $odoo_order_id, $status, $action = 'create', $error_message = null, $odoo_invoice_id = null) {
    try {
        global $pdo;
        
        if (!$pdo) {
            return false;
        }
        
        // Create table if it doesn't exist
        $createTable = "
            CREATE TABLE IF NOT EXISTS odoo_sales_order_sync_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                php_order_id INT NOT NULL,
                odoo_order_id INT NULL,
                odoo_invoice_id INT NULL,
                sync_status ENUM('success', 'failed') NOT NULL,
                sync_action ENUM('create', 'update') NOT NULL DEFAULT 'create',
                error_message TEXT NULL,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_php_order_id (php_order_id),
                INDEX idx_odoo_order_id (odoo_order_id),
                INDEX idx_odoo_invoice_id (odoo_invoice_id),
                INDEX idx_sync_status (sync_status),
                INDEX idx_synced_at (synced_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $pdo->exec($createTable);
        
        // Check if odoo_invoice_id column exists, if not add it
        try {
            $checkCol = $pdo->query("SHOW COLUMNS FROM odoo_sales_order_sync_logs LIKE 'odoo_invoice_id'");
            if ($checkCol->rowCount() == 0) {
                $pdo->exec("ALTER TABLE odoo_sales_order_sync_logs ADD COLUMN odoo_invoice_id INT NULL AFTER odoo_order_id");
                $pdo->exec("CREATE INDEX idx_odoo_invoice_id ON odoo_sales_order_sync_logs (odoo_invoice_id)");
            }
        } catch (Exception $e) {
            // Ignore if check fails, table might just have been created
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO odoo_sales_order_sync_logs 
            (php_order_id, odoo_order_id, odoo_invoice_id, sync_status, sync_action, error_message) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $php_order_id,
            $odoo_order_id ?: null,
            $odoo_invoice_id ?: null,
            $status,
            $action,
            $error_message
        ]);
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error logging sales order sync: " . $e->getMessage());
        return false;
    }
}

/**
 * Sync a sales order by ID
 * 
 * @param int $order_id PHP sales order ID
 * @return int|false Odoo order ID or false
 */
function syncSalesOrderById($order_id) {
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo sales order sync skipped: Integration is disabled');
        return false;
    }
    
    global $pdo;
    
    try {
        if (!$pdo) {
            return false;
        }
        
        // Fetch sales order data
        $stmt = $pdo->prepare("
            SELECT so.*
            FROM sales_orders so
            WHERE so.sales_orders_id = ?
        ");
        $stmt->execute([$order_id]);
        $orderData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$orderData) {
            error_log("Sales order not found: ID $order_id");
            return false;
        }
        
        // Fetch order items
        $itemsStmt = $pdo->prepare("
            SELECT soi.*
            FROM sales_order_items soi
            WHERE soi.sales_order_items_sales_order_id = ?
        ");
        $itemsStmt->execute([$order_id]);
        $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        return syncSalesOrderToOdoo($orderData, $order_id, $orderItems);
        
    } catch (Exception $e) {
        error_log("Error syncing sales order by ID: " . $e->getMessage());
        return false;
    }
}

/**
 * Bulk sync unsynced sales orders
 * 
 * @param int $limit Maximum number of orders to sync (0 = no limit)
 * @return array Results with total, success, failed counts
 */
function bulkSyncUnsyncedSalesOrders($limit = 0) {
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo bulk sales order sync skipped: Integration is disabled');
        return ['total' => 0, 'success' => 0, 'failed' => 0, 'details' => []];
    }
    
    global $pdo;
    
    $results = [
        'total' => 0,
        'success' => 0,
        'failed' => 0,
        'details' => []
    ];
    
    try {
        if (!$pdo) {
            return $results;
        }
        
        // Get unsynced orders (no odoo_order_id)
        $sql = "
            SELECT so.*
            FROM sales_orders so
            WHERE so.sales_orders_odoo_order_id IS NULL
            AND so.sales_orders_status IN ('Invoiced', 'Confirmed', 'Approved')
        ";
        
        if ($limit > 0) {
            $sql .= " LIMIT " . (int)$limit;
        }
        
        $stmt = $pdo->query($sql);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results['total'] = count($orders);
        
        foreach ($orders as $orderData) {
            $order_id = $orderData['sales_orders_id'];
            
            // Fetch order items
            $itemsStmt = $pdo->prepare("
                SELECT soi.*
                FROM sales_order_items soi
                WHERE soi.sales_order_items_sales_order_id = ?
            ");
            $itemsStmt->execute([$order_id]);
            $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $odoo_id = syncSalesOrderToOdoo($orderData, $order_id, $orderItems);
            
            if ($odoo_id) {
                $results['success']++;
                $results['details'][] = [
                    'order_id' => $order_id,
                    'odoo_id' => $odoo_id,
                    'status' => 'success'
                ];
            } else {
                $results['failed']++;
                $results['details'][] = [
                    'order_id' => $order_id,
                    'odoo_id' => null,
                    'status' => 'failed'
                ];
            }
        }
        
    } catch (Exception $e) {
        error_log("Error in bulk sync: " . $e->getMessage());
    }
    
    return $results;
}

/**
 * Auto-sync a client to Odoo when not found
 * Fetches client data from database and syncs to Odoo
 * 
 * @param int $php_client_id PHP client ID
 * @return int|false Odoo partner ID or false on failure
 */
function autoSyncClientToOdoo($php_client_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        global $conn, $pdo;
        
        // Try mysqli first (more reliable in this context)
        if ($conn) {
            $stmt = $conn->prepare("SELECT * FROM clients WHERE clients_id = ?");
            $stmt->bind_param("i", $php_client_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $clientData = $result->fetch_assoc();
            $stmt->close();
        } elseif ($pdo) {
            $stmt = $pdo->prepare("SELECT * FROM clients WHERE clients_id = ?");
            $stmt->execute([$php_client_id]);
            $clientData = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            error_log("autoSyncClientToOdoo: No database connection available");
            return false;
        }
        
        if (!$clientData) {
            error_log("autoSyncClientToOdoo: Client $php_client_id not found in database");
            return false;
        }
        
        error_log("autoSyncClientToOdoo: Found client data for ID $php_client_id: " . $clientData['clients_company_name']);
        
        // Sync to Odoo using existing syncContactToOdoo function
        $odoo_partner_id = syncContactToOdoo($clientData, $php_client_id);
        
        if ($odoo_partner_id) {
            error_log("autoSyncClientToOdoo: Successfully synced client $php_client_id to Odoo partner $odoo_partner_id");
            return $odoo_partner_id;
        }
        
        error_log("autoSyncClientToOdoo: syncContactToOdoo returned false for client $php_client_id");
        return false;
        
    } catch (Exception $e) {
        error_log("autoSyncClientToOdoo error: " . $e->getMessage());
        return false;
    }
}

/**
 * Auto-sync a product variant to Odoo when not found
 * Fetches product data from database and syncs to Odoo
 * 
 * @param int $php_variant_id PHP product variant ID
 * @return int|false Odoo product.product ID or false on failure
 */
function autoSyncProductToOdoo($php_variant_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        error_log("autoSyncProductToOdoo: Attempting to sync variant $php_variant_id");
        
        // Use syncVariantById which handles all the data fetching internally
        if (function_exists('syncVariantById')) {
            $odoo_product_id = syncVariantById($php_variant_id);
            
            if ($odoo_product_id) {
                error_log("autoSyncProductToOdoo: Successfully synced variant $php_variant_id to Odoo product $odoo_product_id");
                return $odoo_product_id;
            }
            error_log("autoSyncProductToOdoo: syncVariantById returned false for variant $php_variant_id");
        } else {
            error_log("autoSyncProductToOdoo: syncVariantById function not available");
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("autoSyncProductToOdoo error: " . $e->getMessage());
        return false;
    }
}
