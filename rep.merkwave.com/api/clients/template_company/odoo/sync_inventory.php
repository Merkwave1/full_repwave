<?php
/**
 * Odoo Inventory Sync Functions
 * 
 * Handles synchronization of inventory operations to Odoo:
 * - Sales Deliveries -> Delivery Orders (stock.picking outgoing)
 * - Internal Transfers -> Internal Transfers (stock.picking internal)
 * 
 * @author RepWave Integration
 * @version 1.0
 */

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../functions.php';

// Include product sync for finding products
if (!function_exists('findOdooProductByRepwaveId')) {
    require_once __DIR__ . '/sync_products.php';
}

// Include contact sync for client mapping
if (!function_exists('syncContactToOdoo')) {
    require_once __DIR__ . '/sync_contacts.php';
}

/**
 * ============================================================================
 * WAREHOUSE/LOCATION MAPPING FUNCTIONS
 * ============================================================================
 */

/**
 * Ensure a warehouse exists in Odoo and get its stock location ID
 * Creates or finds a matching stock.warehouse for the PHP warehouse
 * Returns the lot_stock_id (main stock location) of the warehouse
 * 
 * @param int $warehouse_id PHP warehouse ID
 * @return int|false Odoo stock.location ID (lot_stock_id) or false on failure
 */
function ensureWarehouseInOdoo($warehouse_id) {
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
        
        // Check if already has Odoo location ID cached
        if (!empty($warehouse['warehouse_odoo_location_id'])) {
            return (int)$warehouse['warehouse_odoo_location_id'];
        }
        
        $warehouse_name = $warehouse['warehouse_name'] ?? 'Warehouse ' . $warehouse_id;
        $warehouse_code = $warehouse['warehouse_code'] ?? 'WH' . $warehouse_id;
        
        // Use unique code based on PHP warehouse ID for consistency
        // Format: RW + warehouse_id (e.g., RW1, RW2, RW19)
        $unique_code = 'RW' . $warehouse_id;
        
        // First, try to find existing warehouse by our unique code (most reliable)
        $domain = [['code', '=', $unique_code]];
        $existing_wh = callOdooAPI('stock.warehouse', 'search_read', [$domain], [
            'fields' => ['id', 'name', 'code', 'lot_stock_id'],
            'limit' => 1
        ]);
        
        if ($existing_wh && is_array($existing_wh) && count($existing_wh) > 0) {
            $odoo_warehouse_id = $existing_wh[0]['id'];
            $location_id = is_array($existing_wh[0]['lot_stock_id']) 
                ? $existing_wh[0]['lot_stock_id'][0] 
                : $existing_wh[0]['lot_stock_id'];
            error_log("Found existing Odoo warehouse by code '$unique_code': WH ID $odoo_warehouse_id, Location ID $location_id");
        } else {
            // Try to find by exact name match
            $domain = [['name', '=', $warehouse_name]];
            $existing_by_name = callOdooAPI('stock.warehouse', 'search_read', [$domain], [
                'fields' => ['id', 'name', 'code', 'lot_stock_id'],
                'limit' => 1
            ]);
            
            if ($existing_by_name && is_array($existing_by_name) && count($existing_by_name) > 0) {
                $odoo_warehouse_id = $existing_by_name[0]['id'];
                $location_id = is_array($existing_by_name[0]['lot_stock_id']) 
                    ? $existing_by_name[0]['lot_stock_id'][0] 
                    : $existing_by_name[0]['lot_stock_id'];
                error_log("Found existing Odoo warehouse by name '$warehouse_name': WH ID $odoo_warehouse_id, Location ID $location_id");
                
                // Update the code to our unique code for future lookups
                callOdooAPI('stock.warehouse', 'write', [[$odoo_warehouse_id], ['code' => $unique_code]]);
                error_log("Updated Odoo warehouse code to '$unique_code' for consistency");
            } else {
                // Create new warehouse in Odoo with unique code
                $warehouse_data = [
                    'name' => $warehouse_name,
                    'code' => $unique_code,
                    'company_id' => 1, // Default company
                ];
                
                $odoo_warehouse_id = callOdooAPI('stock.warehouse', 'create', [$warehouse_data]);
                
                if (!$odoo_warehouse_id) {
                    error_log("Failed to create Odoo warehouse for '$warehouse_name'");
                    // Fallback: use default warehouse's stock location
                    return getDefaultOdooStockLocation();
                }
                
                // Get the lot_stock_id (main stock location) of the new warehouse
                $new_wh = callOdooAPI('stock.warehouse', 'read', [[$odoo_warehouse_id], ['lot_stock_id']]);
                if ($new_wh && isset($new_wh[0]['lot_stock_id'])) {
                    $location_id = is_array($new_wh[0]['lot_stock_id']) 
                        ? $new_wh[0]['lot_stock_id'][0] 
                        : $new_wh[0]['lot_stock_id'];
                } else {
                    error_log("Failed to get lot_stock_id for new warehouse $odoo_warehouse_id");
                    return false;
                }
                
                error_log("Created Odoo warehouse for '$warehouse_name': WH ID $odoo_warehouse_id, Location ID $location_id, Code '$unique_code'");
            }
        }
        
        // Cache both warehouse ID and location ID
        $stmt = $conn->prepare("UPDATE warehouse SET warehouse_odoo_location_id = ?, warehouse_odoo_warehouse_id = ? WHERE warehouse_id = ?");
        $stmt->bind_param("iii", $location_id, $odoo_warehouse_id, $warehouse_id);
        $stmt->execute();
        $stmt->close();
        
        return $location_id;
        
    } catch (Exception $e) {
        error_log("Error ensuring warehouse in Odoo: " . $e->getMessage());
        return false;
    }
}

/**
 * Get the default Odoo stock location (fallback)
 * 
 * @return int|false Default stock location ID
 */
function getDefaultOdooStockLocation() {
    try {
        // Find the first warehouse's stock location
        $warehouses = callOdooAPI('stock.warehouse', 'search_read', [[]], [
            'fields' => ['lot_stock_id'],
            'limit' => 1
        ]);
        
        if ($warehouses && count($warehouses) > 0 && isset($warehouses[0]['lot_stock_id'])) {
            $location_id = is_array($warehouses[0]['lot_stock_id']) 
                ? $warehouses[0]['lot_stock_id'][0] 
                : $warehouses[0]['lot_stock_id'];
            return $location_id;
        }
        
        // Absolute fallback: find any internal location
        $locations = callOdooAPI('stock.location', 'search', [[['usage', '=', 'internal']]], ['limit' => 1]);
        if ($locations && count($locations) > 0) {
            return $locations[0];
        }
        
        return 8; // Default WH/Stock location ID in most Odoo installations
        
    } catch (Exception $e) {
        error_log("Error getting default stock location: " . $e->getMessage());
        return 8;
    }
}

/**
 * Get Odoo picking type ID for delivery orders (outgoing)
 * 
 * @return int|false Picking type ID
 */
function getOdooDeliveryPickingType($odoo_warehouse_id = null) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        // If warehouse ID is provided, get the picking type for that specific warehouse
        if ($odoo_warehouse_id) {
            $domain = [
                ['code', '=', 'outgoing'],
                ['warehouse_id', '=', $odoo_warehouse_id]
            ];
            $result = callOdooAPI('stock.picking.type', 'search', [$domain], ['limit' => 1]);
            
            if ($result && is_array($result) && count($result) > 0) {
                return $result[0];
            }
        }
        
        // Fallback: get any outgoing picking type
        $domain = [['code', '=', 'outgoing']];
        $result = callOdooAPI('stock.picking.type', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting delivery picking type: " . $e->getMessage());
        return false;
    }
}

/**
 * Get Odoo picking type ID for internal transfers
 * 
 * @param int|null $odoo_warehouse_id Odoo warehouse ID to filter by
 * @return int|false Picking type ID
 */
function getOdooInternalPickingType($odoo_warehouse_id = null) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        // If warehouse ID is provided, get the picking type for that specific warehouse
        if ($odoo_warehouse_id) {
            $domain = [
                ['code', '=', 'internal'],
                ['warehouse_id', '=', $odoo_warehouse_id]
            ];
            $result = callOdooAPI('stock.picking.type', 'search', [$domain], ['limit' => 1]);
            
            if ($result && is_array($result) && count($result) > 0) {
                return $result[0];
            }
        }
        
        // Fallback: get any internal picking type
        $domain = [['code', '=', 'internal']];
        $result = callOdooAPI('stock.picking.type', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting internal picking type: " . $e->getMessage());
        return false;
    }
}

/**
 * Get customer location ID from Odoo
 * 
 * @return int Customer location ID (Partners/Customers)
 */
function getOdooCustomerLocation() {
    try {
        $domain = [['usage', '=', 'customer']];
        $result = callOdooAPI('stock.location', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return 5; // Default Partners/Customers location
        
    } catch (Exception $e) {
        error_log("Error getting customer location: " . $e->getMessage());
        return 5;
    }
}

/**
 * ============================================================================
 * DELIVERY SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Sync a sales delivery to Odoo
 * 
 * This function handles two scenarios:
 * 1. If the sales order was already synced to Odoo, it UPDATES the existing
 *    delivery order (created automatically by Odoo when the SO was confirmed)
 * 2. If the sales order was not synced, it creates a new standalone picking
 * 
 * @param int $delivery_id PHP sales_deliveries ID
 * @return int|false Odoo stock.picking ID or false on failure
 */
function syncDeliveryToOdoo($delivery_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_id = false;
    
    try {
        // Get delivery data with related info (including Odoo order ID)
        $stmt = $conn->prepare("
            SELECT 
                sd.*,
                so.sales_orders_client_id,
                so.sales_orders_order_date,
                so.sales_orders_odoo_order_id,
                c.clients_company_name,
                c.clients_odoo_partner_id,
                w.warehouse_name,
                w.warehouse_odoo_location_id
            FROM sales_deliveries sd
            JOIN sales_orders so ON sd.sales_deliveries_sales_order_id = so.sales_orders_id
            LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
            LEFT JOIN warehouse w ON sd.sales_deliveries_warehouse_id = w.warehouse_id
            WHERE sd.sales_deliveries_id = ?
        ");
        $stmt->bind_param("i", $delivery_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $delivery = $result->fetch_assoc();
        $stmt->close();
        
        if (!$delivery) {
            $error_message = 'Delivery not found';
            logInventorySync('delivery', $delivery_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Check if already synced
        if (!empty($delivery['sales_deliveries_odoo_picking_id'])) {
            return (int)$delivery['sales_deliveries_odoo_picking_id'];
        }
        
        // Get delivery items with Odoo product mappings
        $delivery_items = getDeliveryItems($delivery_id);
        
        // Build product-quantity map for delivered items
        $delivered_products = [];
        $skipped_items = [];
        foreach ($delivery_items as $item) {
            $odoo_product_id = getOdooProductForDeliveryItem($item);
            if (!$odoo_product_id) {
                $skipped_items[] = $item['product_name'] ?? 'Unknown';
                error_log("Product not found in Odoo for delivery item: " . json_encode($item));
                continue;
            }
            
            $qty = (float)($item['sales_delivery_items_quantity_delivered'] ?? 0);
            if ($qty <= 0) continue;
            
            // Aggregate by product (in case same product appears multiple times)
            if (!isset($delivered_products[$odoo_product_id])) {
                $delivered_products[$odoo_product_id] = 0;
            }
            $delivered_products[$odoo_product_id] += $qty;
        }
        
        if (empty($delivered_products)) {
            $error_message = 'No valid items to sync. Products must be synced to Odoo first.';
            if (!empty($skipped_items)) {
                $error_message .= ' Skipped: ' . implode(', ', array_slice($skipped_items, 0, 3));
                if (count($skipped_items) > 3) {
                    $error_message .= ' and ' . (count($skipped_items) - 3) . ' more';
                }
            }
            logInventorySync('delivery', $delivery_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Check if sales order was synced to Odoo (has existing delivery order)
        $odoo_order_id = $delivery['sales_orders_odoo_order_id'] ?? null;
        
        if ($odoo_order_id) {
            // SCENARIO 1: Update existing Odoo delivery order from sales order
            $sync_action = 'update';
            $odoo_id = updateExistingOdooDelivery($odoo_order_id, $delivered_products, $delivery_id);
            
            if ($odoo_id) {
                $sync_status = 'success';
                error_log("Updated existing Odoo delivery for sales order $odoo_order_id: Picking ID $odoo_id");
            } else {
                $error_message = 'Failed to update existing Odoo delivery order';
            }
        } else {
            // SCENARIO 2: Create new standalone picking (sales order not synced to Odoo)
            $sync_action = 'create';
            $odoo_id = createNewOdooDelivery($delivery, $delivery_items, $delivered_products);
            
            if ($odoo_id) {
                $sync_status = 'success';
                error_log("Created new Odoo delivery picking for PHP delivery $delivery_id: Picking ID $odoo_id");
            } else {
                $error_message = 'Failed to create delivery picking in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Delivery sync error: $error_message");
    }
    
    // Log sync attempt
    logInventorySync('delivery', $delivery_id, $odoo_id, $sync_status, $sync_action, $error_message);
    
    // Update local record
    if ($odoo_id) {
        $stmt = $conn->prepare("UPDATE sales_deliveries SET sales_deliveries_odoo_picking_id = ? WHERE sales_deliveries_id = ?");
        $stmt->bind_param("ii", $odoo_id, $delivery_id);
        $stmt->execute();
        $stmt->close();
    }
    
    return $odoo_id;
}

/**
 * Update existing Odoo delivery order (created from sales order sync)
 * Sets the delivered quantities on stock.move lines and validates the picking
 * 
 * @param int $odoo_order_id Odoo sale.order ID
 * @param array $delivered_products Map of Odoo product ID => delivered quantity
 * @param int $delivery_id PHP delivery ID for logging
 * @return int|false Odoo picking ID or false on failure
 */
function updateExistingOdooDelivery($odoo_order_id, $delivered_products, $delivery_id) {
    try {
        // Find the delivery picking linked to this sales order
        $domain = [
            ['sale_id', '=', (int)$odoo_order_id],
            ['picking_type_code', '=', 'outgoing'],
            ['state', 'not in', ['done', 'cancel']]
        ];
        $pickings = callOdooAPI('stock.picking', 'search_read', [$domain], [
            'fields' => ['id', 'name', 'state', 'move_ids'],
            'limit' => 1
        ]);
        
        if (!$pickings || empty($pickings)) {
            error_log("No pending delivery order found for Odoo sales order $odoo_order_id");
            return false;
        }
        
        $picking = $pickings[0];
        $picking_id = $picking['id'];
        $move_ids = $picking['move_ids'] ?? [];
        
        error_log("Found Odoo picking $picking_id (state: {$picking['state']}) with " . count($move_ids) . " moves");
        
        // Get move details
        if (empty($move_ids)) {
            error_log("No stock moves found in picking $picking_id");
            return false;
        }
        
        $moves = callOdooAPI('stock.move', 'search_read', [
            [['id', 'in', $move_ids]]
        ], [
            'fields' => ['id', 'product_id', 'product_uom_qty', 'quantity', 'state']
        ]);
        
        if (!$moves) {
            error_log("Could not read stock moves for picking $picking_id");
            return false;
        }
        
        // Update quantities on each move line
        foreach ($moves as $move) {
            $move_id = $move['id'];
            $product_id = is_array($move['product_id']) ? $move['product_id'][0] : $move['product_id'];
            $expected_qty = (float)$move['product_uom_qty'];
            
            // Find delivered quantity for this product
            $delivered_qty = $delivered_products[$product_id] ?? 0;
            
            // Use the minimum of expected and delivered (don't over-deliver)
            $qty_to_set = min($expected_qty, $delivered_qty);
            
            if ($qty_to_set > 0) {
                // Set quantity done on the move
                $result = callOdooAPI('stock.move', 'write', [[$move_id], ['quantity' => $qty_to_set]]);
                error_log("Set quantity $qty_to_set on move $move_id (product $product_id)");
                
                // Reduce from delivered_products to track remaining
                $delivered_products[$product_id] -= $qty_to_set;
            }
        }
        
        // Ensure picking is confirmed and assigned
        $picking_state = $picking['state'];
        if ($picking_state === 'draft') {
            callOdooAPI('stock.picking', 'action_confirm', [[$picking_id]]);
            error_log("Confirmed picking $picking_id");
        }
        
        if (in_array($picking_state, ['draft', 'confirmed', 'waiting'])) {
            callOdooAPI('stock.picking', 'action_assign', [[$picking_id]]);
            error_log("Assigned picking $picking_id");
        }
        
        // Validate the picking (mark as done)
        $validate_result = callOdooAPI('stock.picking', 'button_validate', [[$picking_id]]);
        
        if ($validate_result !== false) {
            error_log("Validated Odoo picking $picking_id - delivery complete");
            return $picking_id;
        } else {
            // Try alternative validation approach
            error_log("button_validate returned false, trying force_assign");
            callOdooAPI('stock.picking', 'force_assign', [[$picking_id]]);
            $validate_result = callOdooAPI('stock.picking', 'button_validate', [[$picking_id]]);
            
            if ($validate_result !== false) {
                return $picking_id;
            }
        }
        
        // Even if validation has issues, return picking ID since we updated quantities
        return $picking_id;
        
    } catch (Exception $e) {
        error_log("Error updating existing Odoo delivery: " . $e->getMessage());
        return false;
    }
}

/**
 * Create a new standalone delivery order in Odoo
 * Used when the sales order was not synced to Odoo
 * 
 * @param array $delivery Delivery data from database
 * @param array $delivery_items Delivery items
 * @param array $delivered_products Map of Odoo product ID => quantity
 * @return int|false Odoo picking ID or false on failure
 */
function createNewOdooDelivery($delivery, $delivery_items, $delivered_products) {
    try {
        $delivery_id = $delivery['sales_deliveries_id'];
        
        // Get or create Odoo partner for client
        $odoo_partner_id = $delivery['clients_odoo_partner_id'] ?? null;
        if (!$odoo_partner_id && !empty($delivery['sales_orders_client_id'])) {
            $odoo_partner_id = ensureClientInOdooForInventory($delivery['sales_orders_client_id']);
        }
        
        // Ensure warehouse location exists in Odoo and get the warehouse ID
        $warehouse_id = $delivery['sales_deliveries_warehouse_id'];
        $source_location_id = ensureWarehouseInOdoo($warehouse_id);
        if (!$source_location_id) {
            error_log('Could not find/create Odoo location for warehouse');
            return false;
        }
        
        // Get Odoo warehouse ID from database (cached by ensureWarehouseInOdoo)
        global $conn;
        $odoo_warehouse_id = null;
        $stmt = $conn->prepare("SELECT warehouse_odoo_warehouse_id FROM warehouse WHERE warehouse_id = ?");
        $stmt->bind_param("i", $warehouse_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $wh = $result->fetch_assoc();
        $stmt->close();
        if ($wh && !empty($wh['warehouse_odoo_warehouse_id'])) {
            $odoo_warehouse_id = (int)$wh['warehouse_odoo_warehouse_id'];
        }
        
        // Get destination (customer) location
        $dest_location_id = getOdooCustomerLocation();
        
        // Get delivery picking type for this specific warehouse
        $picking_type_id = getOdooDeliveryPickingType($odoo_warehouse_id);
        if (!$picking_type_id) {
            error_log('Could not find delivery picking type in Odoo');
            return false;
        }
        
        // Prepare reference
        $origin = 'RW-DEL-' . $delivery_id;
        $sales_order_id = $delivery['sales_deliveries_sales_order_id'];
        if ($sales_order_id) {
            $origin .= ' (SO-' . $sales_order_id . ')';
        }
        
        // Check if already exists in Odoo by origin
        $existing = findOdooPickingByOrigin($origin);
        if ($existing) {
            error_log("Delivery $delivery_id already exists in Odoo: Picking ID $existing");
            return $existing;
        }
        
        // Build move lines from delivery items
        $move_lines = [];
        foreach ($delivery_items as $item) {
            $odoo_product_id = getOdooProductForDeliveryItem($item);
            if (!$odoo_product_id) continue;
            
            $qty = (float)($item['sales_delivery_items_quantity_delivered'] ?? 0);
            if ($qty <= 0) continue;
            
            $move_lines[] = [0, 0, [
                'name' => $item['product_name'] ?? $item['variant_name'] ?? 'Product',
                'product_id' => $odoo_product_id,
                'product_uom_qty' => $qty,
                'location_id' => $source_location_id,
                'location_dest_id' => $dest_location_id,
            ]];
        }
        
        if (empty($move_lines)) {
            error_log('No valid move lines for new delivery');
            return false;
        }
        
        // Prepare picking data
        $picking_data = [
            'picking_type_id' => $picking_type_id,
            'location_id' => $source_location_id,
            'location_dest_id' => $dest_location_id,
            'origin' => $origin,
            'move_ids' => $move_lines,
        ];
        
        // Add partner if available
        if ($odoo_partner_id) {
            $picking_data['partner_id'] = $odoo_partner_id;
        }
        
        // Add scheduled date
        if (!empty($delivery['sales_deliveries_delivery_date'])) {
            $picking_data['scheduled_date'] = $delivery['sales_deliveries_delivery_date'];
        }
        
        // Create picking in Odoo
        $odoo_id = callOdooAPI('stock.picking', 'create', [$picking_data]);
        
        if ($odoo_id) {
            // Confirm the picking if delivery status is Delivered
            if ($delivery['sales_deliveries_delivery_status'] === 'Delivered') {
                confirmOdooPicking($odoo_id);
            }
        }
        
        return $odoo_id;
        
    } catch (Exception $e) {
        error_log("Error creating new Odoo delivery: " . $e->getMessage());
        return false;
    }
}

/**
 * Get delivery items for a delivery
 */
function getDeliveryItems($delivery_id) {
    global $conn;
    
    $stmt = $conn->prepare("
        SELECT 
            sdi.*,
            soi.sales_order_items_variant_id,
            pv.variant_products_id,
            pv.variant_odoo_product_id,
            pv.variant_name,
            p.products_name as product_name
        FROM sales_delivery_items sdi
        JOIN sales_order_items soi ON sdi.sales_delivery_items_sales_order_item_id = soi.sales_order_items_id
        LEFT JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        WHERE sdi.sales_delivery_items_delivery_id = ?
    ");
    $stmt->bind_param("i", $delivery_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
    $stmt->close();
    
    return $items;
}

/**
 * Get Odoo product ID for a delivery item
 * Auto-syncs the product to Odoo if not already synced
 */
function getOdooProductForDeliveryItem($item) {
    global $conn;
    
    // Check if variant has Odoo ID cached
    if (!empty($item['variant_odoo_product_id'])) {
        return (int)$item['variant_odoo_product_id'];
    }
    
    $variant_id = $item['sales_order_items_variant_id'] ?? $item['variant_id'] ?? null;
    
    // Try to find in Odoo by variant ID (rw_id)
    if ($variant_id && function_exists('findOdooProductByRepwaveId')) {
        $odoo_id = findOdooProductByRepwaveId($variant_id);
        if ($odoo_id) {
            // Cache the Odoo ID in the database
            if ($conn) {
                $stmt = $conn->prepare("UPDATE product_variants SET variant_odoo_product_id = ? WHERE variant_id = ?");
                $stmt->bind_param("ii", $odoo_id, $variant_id);
                $stmt->execute();
                $stmt->close();
            }
            return $odoo_id;
        }
    }
    
    // Auto-sync the product to Odoo if not found
    if ($variant_id && function_exists('syncVariantById')) {
        error_log("Auto-syncing variant $variant_id to Odoo for delivery item");
        $odoo_id = syncVariantById($variant_id);
        if ($odoo_id) {
            return $odoo_id;
        }
    }
    
    return false;
}

/**
 * ============================================================================
 * INTERNAL TRANSFER SYNC FUNCTIONS
 * ============================================================================
 */

/**
 * Sync an internal transfer to Odoo as a stock.picking (internal)
 * 
 * @param int $transfer_id PHP transfers ID
 * @return int|false Odoo stock.picking ID or false on failure
 */
function syncTransferToOdoo($transfer_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    global $conn;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_id = false;
    
    try {
        // Get transfer data
        $stmt = $conn->prepare("
            SELECT 
                t.*,
                ws.warehouse_name as source_warehouse_name,
                ws.warehouse_odoo_location_id as source_location_id,
                wd.warehouse_name as dest_warehouse_name,
                wd.warehouse_odoo_location_id as dest_location_id
            FROM transfers t
            LEFT JOIN warehouse ws ON t.transfer_source_warehouse_id = ws.warehouse_id
            LEFT JOIN warehouse wd ON t.transfer_destination_warehouse_id = wd.warehouse_id
            WHERE t.transfer_id = ?
        ");
        $stmt->bind_param("i", $transfer_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $transfer = $result->fetch_assoc();
        $stmt->close();
        
        if (!$transfer) {
            $error_message = 'Transfer not found';
            logInventorySync('transfer', $transfer_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Check if already synced
        if (!empty($transfer['transfer_odoo_picking_id'])) {
            return (int)$transfer['transfer_odoo_picking_id'];
        }
        
        // Ensure source warehouse location exists in Odoo
        $source_location_id = ensureWarehouseInOdoo($transfer['transfer_source_warehouse_id']);
        if (!$source_location_id) {
            $error_message = 'Could not find/create Odoo location for source warehouse';
            logInventorySync('transfer', $transfer_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Get Odoo warehouse ID for source warehouse (for picking type)
        $source_odoo_warehouse_id = null;
        $stmt = $conn->prepare("SELECT warehouse_odoo_warehouse_id FROM warehouse WHERE warehouse_id = ?");
        $stmt->bind_param("i", $transfer['transfer_source_warehouse_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $wh = $result->fetch_assoc();
        $stmt->close();
        if ($wh && !empty($wh['warehouse_odoo_warehouse_id'])) {
            $source_odoo_warehouse_id = (int)$wh['warehouse_odoo_warehouse_id'];
        }
        
        // Ensure destination warehouse location exists in Odoo
        $dest_location_id = ensureWarehouseInOdoo($transfer['transfer_destination_warehouse_id']);
        if (!$dest_location_id) {
            $error_message = 'Could not find/create Odoo location for destination warehouse';
            logInventorySync('transfer', $transfer_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Get internal transfer picking type for the source warehouse
        $picking_type_id = getOdooInternalPickingType($source_odoo_warehouse_id);
        if (!$picking_type_id) {
            $error_message = 'Could not find internal transfer picking type in Odoo';
            logInventorySync('transfer', $transfer_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare reference
        $source_name = $transfer['source_warehouse_name'] ?? 'Source';
        $dest_name = $transfer['dest_warehouse_name'] ?? 'Dest';
        $origin = 'RW-TR-' . $transfer_id . ' (' . $source_name . ' → ' . $dest_name . ')';
        
        // Get transfer items
        $transfer_items = getTransferItems($transfer_id);
        
        // Prepare stock moves
        $move_lines = [];
        $skipped_items = [];
        foreach ($transfer_items as $item) {
            // Get product's Odoo ID
            $odoo_product_id = getOdooProductForTransferItem($item);
            if (!$odoo_product_id) {
                $skipped_items[] = $item['product_name'] ?? $item['variant_name'] ?? 'Unknown';
                error_log("Product not found in Odoo for transfer item: " . json_encode($item));
                continue;
            }
            
            $qty = (float)($item['transfer_item_quantity'] ?? 0);
            if ($qty <= 0) continue;
            
            $move_lines[] = [0, 0, [
                'name' => $item['product_name'] ?? $item['variant_name'] ?? 'Product',
                'product_id' => $odoo_product_id,
                'product_uom_qty' => $qty,
                'location_id' => $source_location_id,
                'location_dest_id' => $dest_location_id,
            ]];
        }
        
        if (empty($move_lines)) {
            $error_message = 'No valid items to sync. Products must be synced to Odoo first.';
            if (!empty($skipped_items)) {
                $error_message .= ' Skipped: ' . implode(', ', array_slice($skipped_items, 0, 3));
                if (count($skipped_items) > 3) {
                    $error_message .= ' and ' . (count($skipped_items) - 3) . ' more';
                }
            }
            logInventorySync('transfer', $transfer_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Check if already exists in Odoo by origin
        $existing = findOdooPickingByOrigin('RW-TR-' . $transfer_id);
        if ($existing) {
            $sync_action = 'update';
            $odoo_id = $existing;
            $sync_status = 'success';
            error_log("Transfer $transfer_id already synced to Odoo: Picking ID $odoo_id");
        } else {
            // Prepare picking data
            $picking_data = [
                'picking_type_id' => $picking_type_id,
                'location_id' => $source_location_id,
                'location_dest_id' => $dest_location_id,
                'origin' => $origin,
                'move_ids' => $move_lines,
            ];
            
            // Add scheduled date
            if (!empty($transfer['transfer_created_at'])) {
                $picking_data['scheduled_date'] = $transfer['transfer_created_at'];
            }
            
            // Create picking in Odoo
            $odoo_id = callOdooAPI('stock.picking', 'create', [$picking_data]);
            
            if ($odoo_id) {
                $sync_status = 'success';
                error_log("Created Odoo internal transfer picking for PHP transfer $transfer_id: Picking ID $odoo_id");
                
                // Confirm the picking if transfer status is Completed
                if ($transfer['transfer_status'] === 'Completed') {
                    confirmOdooPicking($odoo_id);
                }
            } else {
                $error_message = 'Failed to create internal transfer picking in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Transfer sync error: $error_message");
    }
    
    // Log sync attempt
    logInventorySync('transfer', $transfer_id, $odoo_id, $sync_status, $sync_action, $error_message);
    
    // Update local record
    if ($odoo_id) {
        $stmt = $conn->prepare("UPDATE transfers SET transfer_odoo_picking_id = ? WHERE transfer_id = ?");
        $stmt->bind_param("ii", $odoo_id, $transfer_id);
        $stmt->execute();
        $stmt->close();
    }
    
    return $odoo_id;
}

/**
 * Get transfer items for a transfer
 */
function getTransferItems($transfer_id) {
    global $conn;
    
    $stmt = $conn->prepare("
        SELECT 
            ti.*,
            i.variant_id,
            pv.variant_products_id,
            pv.variant_odoo_product_id,
            pv.variant_name,
            p.products_name as product_name
        FROM transfer_items ti
        LEFT JOIN inventory i ON ti.inventory_id = i.inventory_id
        LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        WHERE ti.transfer_id = ?
    ");
    $stmt->bind_param("i", $transfer_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
    $stmt->close();
    
    return $items;
}

/**
 * Get Odoo product ID for a transfer item
 * Auto-syncs the product to Odoo if not already synced
 */
function getOdooProductForTransferItem($item) {
    global $conn;
    
    // Check if variant has Odoo ID cached
    if (!empty($item['variant_odoo_product_id'])) {
        return (int)$item['variant_odoo_product_id'];
    }
    
    $variant_id = $item['variant_id'] ?? null;
    
    // Try to find in Odoo by variant ID (rw_id)
    if ($variant_id && function_exists('findOdooProductByRepwaveId')) {
        $odoo_id = findOdooProductByRepwaveId($variant_id);
        if ($odoo_id) {
            // Cache the Odoo ID in the database
            if ($conn) {
                $stmt = $conn->prepare("UPDATE product_variants SET variant_odoo_product_id = ? WHERE variant_id = ?");
                $stmt->bind_param("ii", $odoo_id, $variant_id);
                $stmt->execute();
                $stmt->close();
            }
            return $odoo_id;
        }
    }
    
    // Auto-sync the product to Odoo if not found
    if ($variant_id && function_exists('syncVariantById')) {
        error_log("Auto-syncing variant $variant_id to Odoo for transfer item");
        $odoo_id = syncVariantById($variant_id);
        if ($odoo_id) {
            return $odoo_id;
        }
    }
    
    return false;
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Find Odoo picking by origin reference
 */
function findOdooPickingByOrigin($origin) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $domain = [['origin', 'ilike', $origin . '%']];
        $result = callOdooAPI('stock.picking', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo picking by origin: " . $e->getMessage());
        return false;
    }
}

/**
 * Confirm an Odoo picking (mark as done)
 */
function confirmOdooPicking($picking_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        // First confirm the picking
        callOdooAPI('stock.picking', 'action_confirm', [[$picking_id]]);
        
        // Then assign quantities
        callOdooAPI('stock.picking', 'action_assign', [[$picking_id]]);
        
        // Finally validate (mark as done)
        // In Odoo 18, we need to set quantities done first
        $picking = callOdooAPI('stock.picking', 'read', [[$picking_id], ['move_ids']]);
        if ($picking && isset($picking[0]['move_ids'])) {
            foreach ($picking[0]['move_ids'] as $move_id) {
                // Read the move to get the quantity
                $move = callOdooAPI('stock.move', 'read', [[$move_id], ['product_uom_qty']]);
                if ($move && isset($move[0]['product_uom_qty'])) {
                    // Set quantity done
                    callOdooAPI('stock.move', 'write', [[$move_id], ['quantity' => $move[0]['product_uom_qty']]]);
                }
            }
        }
        
        // Now validate
        $result = callOdooAPI('stock.picking', 'button_validate', [[$picking_id]]);
        
        if ($result) {
            error_log("Odoo picking $picking_id confirmed and validated");
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error confirming Odoo picking: " . $e->getMessage());
        return false;
    }
}

/**
 * Ensure client exists in Odoo for inventory operations
 */
function ensureClientInOdooForInventory($client_id) {
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
        
        // Try to sync client
        if (function_exists('syncContactToOdoo')) {
            // Get client data
            $stmt = $conn->prepare("SELECT * FROM clients WHERE clients_id = ?");
            $stmt->bind_param("i", $client_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $client_data = $result->fetch_assoc();
            $stmt->close();
            
            if ($client_data) {
                $odoo_partner_id = syncContactToOdoo($client_data);
                if ($odoo_partner_id) {
                    return $odoo_partner_id;
                }
            }
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error ensuring client in Odoo for inventory: " . $e->getMessage());
        return false;
    }
}

/**
 * Log inventory sync attempt
 */
function logInventorySync($type, $php_id, $odoo_id, $status, $action = 'create', $error_message = null) {
    try {
        global $conn;
        
        $stmt = $conn->prepare("
            INSERT INTO odoo_inventory_sync_logs 
            (operation_type, php_id, odoo_picking_id, sync_status, sync_action, error_message) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("siisss", $type, $php_id, $odoo_id, $status, $action, $error_message);
        $stmt->execute();
        $stmt->close();
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error logging inventory sync: " . $e->getMessage());
        return false;
    }
}
