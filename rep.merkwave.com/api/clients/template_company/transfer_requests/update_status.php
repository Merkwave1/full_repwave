<?php
/**
 * transfer_requests/update_status.php
 * Admin updates request status and automatically creates transfers when status is "Approved" with allocations.
 * POST: request_id, status (Pending|Approved|Rejected|Cancelled), admin_note (optional), allocations (optional JSON array)
 */
require_once '../db_connect.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    $request_id = $_POST['request_id'] ?? null;
    $status     = $_POST['status'] ?? null;
    $admin_note = $_POST['admin_note'] ?? null;
    $allocations_json = $_POST['allocations'] ?? null;

    if (empty($request_id) || !is_numeric($request_id)) { print_failure('request_id is required'); }
    $allowed = ['Pending','Approved','Rejected','Cancelled'];
    if (!in_array($status, $allowed)) { print_failure('Invalid status'); }

    // Parse allocations if provided
    $allocations = [];
    if (!empty($allocations_json)) {
        $allocations = json_decode($allocations_json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            print_failure('Invalid allocations JSON format');
        }
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // Update request status
        $stmt = $conn->prepare("UPDATE transfer_requests SET request_status = ?, request_admin_note = ?, request_updated_at = NOW() WHERE request_id = ?");
        $stmt->bind_param('ssi', $status, $admin_note, $request_id);
        $stmt->execute();

        // If status is "Approved" and allocations are provided, create transfers automatically
        if ($status === 'Approved' && !empty($allocations)) {
            // Get request details
            $stmt = $conn->prepare("SELECT request_source_warehouse_id, request_destination_warehouse_id FROM transfer_requests WHERE request_id = ?");
            $stmt->bind_param('i', $request_id);
            $stmt->execute();
            $request_result = $stmt->get_result();
            $request_data = $request_result->fetch_assoc();
            
            if (!$request_data) {
                throw new Exception('Transfer request not found');
            }

            // Group allocations by source warehouse (from inventory items)
            $transfers_by_warehouse = [];
            
            foreach ($allocations as $allocation) {
                if (!isset($allocation['inventory_id']) || !isset($allocation['quantity'])) {
                    continue; // Skip invalid allocations
                }
                
                // Get inventory item details to determine source warehouse
                $stmt = $conn->prepare("SELECT warehouse_id FROM inventory WHERE inventory_id = ?");
                $stmt->bind_param('i', $allocation['inventory_id']);
                $stmt->execute();
                $inv_result = $stmt->get_result();
                $inv_data = $inv_result->fetch_assoc();
                
                if (!$inv_data) {
                    continue; // Skip if inventory item not found
                }
                
                $source_warehouse_id = $inv_data['warehouse_id'];
                $destination_warehouse_id = $request_data['request_destination_warehouse_id'];
                
                // Group by source-destination pair
                $transfer_key = $source_warehouse_id . '_' . $destination_warehouse_id;
                
                if (!isset($transfers_by_warehouse[$transfer_key])) {
                    $transfers_by_warehouse[$transfer_key] = [
                        'source_warehouse_id' => $source_warehouse_id,
                        'destination_warehouse_id' => $destination_warehouse_id,
                        'items' => []
                    ];
                }
                
                $transfers_by_warehouse[$transfer_key]['items'][] = [
                    'inventory_id' => $allocation['inventory_id'],
                    'quantity' => $allocation['quantity']
                ];
            }

            // Create transfers for each warehouse group
            foreach ($transfers_by_warehouse as $transfer_group) {
                // Create transfer record with "Completed" status
                $transfer_notes = "Auto-created from load request #$request_id" . ($admin_note ? " - $admin_note" : "");
                $transfer_status = 'Completed'; // Set to completed directly
                
                $stmt = $conn->prepare("INSERT INTO transfers (transfer_source_warehouse_id, transfer_destination_warehouse_id, transfer_status, transfer_initiated_by_user_id, transfer_notes, transfer_created_at, transfer_updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
                $stmt->bind_param('iisis', $transfer_group['source_warehouse_id'], $transfer_group['destination_warehouse_id'], $transfer_status, $user_id, $transfer_notes);
                $stmt->execute();
                
                $transfer_id = $conn->insert_id;
                
                // Create transfer items
                foreach ($transfer_group['items'] as $item) {
                    $stmt = $conn->prepare("INSERT INTO transfer_items (transfer_id, inventory_id, transfer_item_quantity) VALUES (?, ?, ?)");
                    $stmt->bind_param('iii', $transfer_id, $item['inventory_id'], $item['quantity']);
                    $stmt->execute();
                    
                    // Since transfer is completed, move inventory from source to destination
                    // Decrease from source warehouse
                    $stmt = $conn->prepare("UPDATE inventory SET inventory_quantity = inventory_quantity - ? WHERE inventory_id = ? AND inventory_quantity >= ?");
                    $stmt->bind_param('iii', $item['quantity'], $item['inventory_id'], $item['quantity']);
                    $stmt->execute();
                    
                    if ($stmt->affected_rows == 0) {
                        throw new Exception("Insufficient inventory for item ID {$item['inventory_id']}");
                    }
                    
                    // Add to destination warehouse (create new inventory record)
                    // Get original inventory details for cloning
                    $stmt = $conn->prepare("SELECT variant_id, packaging_type_id, inventory_production_date FROM inventory WHERE inventory_id = ?");
                    $stmt->bind_param('i', $item['inventory_id']);
                    $stmt->execute();
                    $orig_inv = $stmt->get_result()->fetch_assoc();
                    
                    if ($orig_inv) {
                        // Check if similar inventory already exists in destination
                        $stmt = $conn->prepare("SELECT inventory_id FROM inventory WHERE warehouse_id = ? AND variant_id = ? AND packaging_type_id = ? AND inventory_production_date = ?");
                        $stmt->bind_param('iiss', $transfer_group['destination_warehouse_id'], $orig_inv['variant_id'], $orig_inv['packaging_type_id'], $orig_inv['inventory_production_date']);
                        $stmt->execute();
                        $dest_inv_result = $stmt->get_result();
                        $dest_inv = $dest_inv_result->fetch_assoc();
                        
                        if ($dest_inv) {
                            // Update existing inventory
                            $stmt = $conn->prepare("UPDATE inventory SET inventory_quantity = inventory_quantity + ? WHERE inventory_id = ?");
                            $stmt->bind_param('ii', $item['quantity'], $dest_inv['inventory_id']);
                            $stmt->execute();
                        } else {
                            // Create new inventory record in destination
                            $stmt = $conn->prepare("INSERT INTO inventory (warehouse_id, variant_id, packaging_type_id, inventory_quantity, inventory_production_date) VALUES (?, ?, ?, ?, ?)");
                            $stmt->bind_param('iiiis', $transfer_group['destination_warehouse_id'], $orig_inv['variant_id'], $orig_inv['packaging_type_id'], $item['quantity'], $orig_inv['inventory_production_date']);
                            $stmt->execute();
                        }
                    }
                }
            }
        }

        // Commit transaction
        $conn->commit();
        
        $response_data = ['request_id' => (int)$request_id, 'status' => $status];
        if ($status === 'Approved' && !empty($allocations)) {
            $response_data['transfers_created'] = count($transfers_by_warehouse);
        }
        
        print_success('Request updated and transfers created successfully', $response_data);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) { $conn->close(); }
}
?>
