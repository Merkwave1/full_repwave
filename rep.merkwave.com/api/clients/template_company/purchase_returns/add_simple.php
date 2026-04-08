<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        print_failure("Error: No valid JSON input received.");
        exit;
    }

    // Validate required fields
    $required_fields = [
        'purchase_return_supplier_id',
        'purchase_return_date',
        'purchase_return_purchase_order_id',
        'return_items'
    ];

    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            print_failure("Error: Missing required field '$field'.");
            exit;
        }
    }

    // Validate return items
    if (!is_array($input['return_items']) || count($input['return_items']) === 0) {
        print_failure("Error: At least one return item is required.");
        exit;
    }

    // Validate each return item
    foreach ($input['return_items'] as $i => $item) {
        if (empty($item['original_item_id']) || empty($item['quantity_returned']) || empty($item['unit_cost'])) {
            print_failure("Error: Return item " . ($i + 1) . " is missing required fields (original_item_id, quantity_returned, unit_cost).");
            exit;
        }
    }

    // Start transaction
    $conn->autocommit(false);

    try {
        // Calculate totals
        $items_subtotal = 0;
        $processed_items = [];

        foreach ($input['return_items'] as $item) {
            $quantity = (float)$item['quantity_returned'];
            $unit_cost = (float)$item['unit_cost'];
            $item_total = $quantity * $unit_cost;
            $items_subtotal += $item_total;

            $processed_items[] = [
                'original_item_id' => !empty($item['original_item_id']) ? (int)$item['original_item_id'] : null,
                'quantity_returned' => $quantity,
                'unit_cost' => $unit_cost,
                'total_cost' => $item_total,
                'return_reason' => $item['return_reason'] ?? null
            ];
        }

        // Apply order-level discount
        $order_discount = (float)($input['purchase_return_order_discount'] ?? 0);
        $final_total_amount = max(0, $items_subtotal - $order_discount);

        // Determine status (allow client to provide it, default to 'Approved')
        $status = $input['status'] ?? $input['purchase_returns_status'] ?? $input['purchase_return_status'] ?? 'Approved';

        // 1. Insert main purchase return record (use provided status)
        $stmt_main = $conn->prepare("            INSERT INTO purchase_returns (
                purchase_returns_supplier_id,
                purchase_returns_purchase_order_id,
                purchase_returns_date,
                purchase_returns_reason,
                purchase_returns_notes,
                purchase_returns_total_amount,
                purchase_returns_status,
                purchase_returns_created_at,
                purchase_returns_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_main) {
            throw new Exception("Prepare failed for main insert: " . $conn->error);
        }

        $stmt_main->bind_param("iisssds", 
            $input['purchase_return_supplier_id'],
            $input['purchase_return_purchase_order_id'],
            $input['purchase_return_date'],
            $input['purchase_return_reason'],
            $input['purchase_return_notes'],
            $final_total_amount,
            $status
        );

        $stmt_main->execute();
        $purchase_return_id = $conn->insert_id;
        $stmt_main->close();

        // 2. Insert return items
        $stmt_item = $conn->prepare("
            INSERT INTO purchase_return_items (
                purchase_return_items_return_id,
                purchase_return_items_purchase_order_item_id,
                purchase_return_items_quantity,
                purchase_return_items_unit_cost,
                purchase_return_items_total_cost,
                purchase_return_items_notes
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");

        if (!$stmt_item) {
            throw new Exception("Prepare failed for item insert: " . $conn->error);
        }

        foreach ($processed_items as $item) {
            $stmt_item->bind_param("iiddds",
                $purchase_return_id,
                $item['original_item_id'],
                $item['quantity_returned'],
                $item['unit_cost'],
                $item['total_cost'],
                $item['return_reason']
            );
            $stmt_item->execute();

            // Update the purchase_order_items_quantity_returned column
            $update_returned_stmt = $conn->prepare("
                UPDATE purchase_order_items 
                SET purchase_order_items_quantity_returned = purchase_order_items_quantity_returned + ?
                WHERE purchase_order_items_id = ?
            ");
            $update_returned_stmt->bind_param("di", $item['quantity_returned'], $item['original_item_id']);
            $update_returned_stmt->execute();
            $update_returned_stmt->close();

            // ===== ADD INVENTORY DEDUCTION LOGIC =====
            // Fetch variant, packaging, and warehouse info for inventory update
            $stmt_fetch_variant = $conn->prepare("
                SELECT 
                    poi.purchase_order_items_variant_id,
                    poi.purchase_order_items_packaging_type_id,
                    poi.purchase_order_items_quantity_received,
                    po.purchase_orders_warehouse_id
                FROM purchase_order_items poi 
                JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id 
                WHERE poi.purchase_order_items_id = ?
            ");
            if ($stmt_fetch_variant) {
                $stmt_fetch_variant->bind_param("i", $item['original_item_id']);
                $stmt_fetch_variant->execute();
                $variant_result = $stmt_fetch_variant->get_result();
                $variant_data = $variant_result->fetch_assoc();
                $stmt_fetch_variant->close();

                if ($variant_data) {
                    $variant_id = (int)$variant_data['purchase_order_items_variant_id'];
                    $packaging_id = $variant_data['purchase_order_items_packaging_type_id'] ? (int)$variant_data['purchase_order_items_packaging_type_id'] : null;
                    $warehouse_id = (int)$variant_data['purchase_orders_warehouse_id'];
                    $qty_received = (float)$variant_data['purchase_order_items_quantity_received'];
                    $return_quantity = (float)$item['quantity_returned'];

                    // Only deduct inventory for items that were actually received
                    $warehouse_return_qty = min($return_quantity, $qty_received);

                    if ($warehouse_return_qty > 0) {
                        // Find inventory record
                        $stmt_find_inventory = $conn->prepare("
                            SELECT inventory_id, inventory_quantity
                            FROM inventory 
                            WHERE variant_id = ? AND warehouse_id = ? 
                            AND (packaging_type_id = ? OR (packaging_type_id IS NULL AND ? IS NULL))
                            ORDER BY inventory_created_at DESC
                            LIMIT 1
                        ");
                        if ($stmt_find_inventory) {
                            $stmt_find_inventory->bind_param("iiii", $variant_id, $warehouse_id, $packaging_id, $packaging_id);
                            $stmt_find_inventory->execute();
                            $inventory_result = $stmt_find_inventory->get_result();
                            $inventory_row = $inventory_result->fetch_assoc();
                            $stmt_find_inventory->close();

                            if ($inventory_row) {
                                $current_inventory = (float)$inventory_row['inventory_quantity'];
                                $inventory_id = (int)$inventory_row['inventory_id'];

                                if ($current_inventory >= $warehouse_return_qty) {
                                    $new_inventory_qty = $current_inventory - $warehouse_return_qty;

                                    // Update inventory
                                    $stmt_update_inventory = $conn->prepare("
                                        UPDATE inventory 
                                        SET inventory_quantity = ?,
                                            inventory_status = CASE 
                                                WHEN ? <= 0 THEN 'Out of Stock'
                                                WHEN ? <= 10 THEN 'Low Stock' 
                                                ELSE inventory_status 
                                            END,
                                            inventory_last_movement_at = NOW(),
                                            inventory_updated_at = NOW()
                                        WHERE inventory_id = ?
                                    ");
                                    if ($stmt_update_inventory) {
                                        $stmt_update_inventory->bind_param("dddi", $new_inventory_qty, $new_inventory_qty, $new_inventory_qty, $inventory_id);
                                        $stmt_update_inventory->execute();
                                        $stmt_update_inventory->close();

                                        // Log inventory movement
                                        if (function_exists('log_inventory_movement_internal')) {
                                            log_inventory_movement_internal(
                                                $variant_id, 
                                                $packaging_id, 
                                                $warehouse_id, 
                                                'return', 
                                                -$warehouse_return_qty, 
                                                $new_inventory_qty, 
                                                0, // No user ID available in simple API
                                                $purchase_return_id, 
                                                "Purchase return (simple API) - deducted from warehouse inventory", 
                                                $conn
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        $stmt_item->close();

        // Update supplier's balance since return is approved (credit supplier)
        $stmt_update_supplier_balance = $conn->prepare("
            UPDATE suppliers
            SET supplier_balance = supplier_balance - ?
            WHERE supplier_id = ?
        ");
        if ($stmt_update_supplier_balance) {
            $stmt_update_supplier_balance->bind_param("di", $final_total_amount, $input['purchase_return_supplier_id']);
            $stmt_update_supplier_balance->execute();
            $stmt_update_supplier_balance->close();
        }

        // Commit transaction
        $conn->commit();

        // Prepare response data
        $response_data = [
            'purchase_return_id' => $purchase_return_id,
            'supplier_id' => $input['purchase_return_supplier_id'],
            'purchase_order_id' => $input['purchase_return_purchase_order_id'],
            'return_date' => $input['purchase_return_date'],
            'reason' => $input['purchase_return_reason'],
            'notes' => $input['purchase_return_notes'],
            'total_amount' => $final_total_amount,
            'order_discount' => $order_discount,
            'status' => $status,
            'items_count' => count($processed_items),
            'items_subtotal' => $items_subtotal
        ];

        print_success("Purchase return added successfully.", $response_data);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

?>
