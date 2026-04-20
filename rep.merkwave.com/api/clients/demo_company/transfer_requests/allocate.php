<?php
/**
 * transfer_requests/allocate.php
 * Admin allocates inventory for a transfer request by creating a transfer and its items.
 * This does NOT move stock; stock adjustments happen on transfer status change (see transfers/update.php).
 *
 * POST:
 * - request_id (int)
 * - items: JSON array of { request_item_id:int, inventory_id:int, quantity:float }
 * - admin_note (string, optional)
 *
 * Validations:
 * - Admin auth required.
 * - Each allocation must belong to the provided request_id.
 * - inventory_id must be in the same source warehouse as the request.
 * - inventory.variant_id and packaging_type_id should match the request_item selection.
 */
require_once '../db_connect.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $request_id = $_POST['request_id'] ?? null;
    $items_json = $_POST['items'] ?? '[]';
    $admin_note = $_POST['admin_note'] ?? null;

    $items = json_decode($items_json, true);

    if (empty($request_id) || !is_numeric($request_id)) { print_failure('request_id is required'); }
    if (empty($items) || !is_array($items)) { print_failure('items array is required'); }

    // Load request header
    $stmt_req = $conn->prepare("SELECT request_id, request_source_warehouse_id, request_destination_warehouse_id, request_status FROM transfer_requests WHERE request_id = ?");
    $stmt_req->bind_param('i', $request_id);
    $stmt_req->execute();
    $req = $stmt_req->get_result()->fetch_assoc();
    $stmt_req->close();

    if (!$req) { print_failure('Request not found'); }
    $source_wh = (int)$req['request_source_warehouse_id'];
    $dest_wh   = (int)$req['request_destination_warehouse_id'];

    // Map request items for quick validation
    $reqItems = [];
    $stmt_items = $conn->prepare("SELECT request_item_id, variant_id, packaging_type_id, requested_quantity FROM transfer_request_items WHERE request_id = ?");
    $stmt_items->bind_param('i', $request_id);
    $stmt_items->execute();
    $res_items = $stmt_items->get_result();
    while ($row = $res_items->fetch_assoc()) { $reqItems[(int)$row['request_item_id']] = $row; }
    $stmt_items->close();

    if (empty($reqItems)) { print_failure('Request has no items'); }

    $conn->begin_transaction();

    // Create transfer header
    $note = "From Request #$request_id" . (!empty($admin_note) ? (" - " . $admin_note) : "");
    $stmt_t = $conn->prepare("INSERT INTO transfers (transfer_source_warehouse_id, transfer_destination_warehouse_id, transfer_status, transfer_notes) VALUES (?, ?, 'Pending', ?)");
    $stmt_t->bind_param('iis', $source_wh, $dest_wh, $note);
    $stmt_t->execute();
    $transfer_id = $stmt_t->insert_id;
    $stmt_t->close();

    // Prepare transfer_items insert
    $stmt_ti = $conn->prepare("INSERT INTO transfer_items (transfer_id, inventory_id, transfer_item_quantity) VALUES (?, ?, ?)");

    foreach ($items as $alloc) {
        $request_item_id = $alloc['request_item_id'] ?? null;
        $inventory_id    = $alloc['inventory_id'] ?? null;
        $quantity        = $alloc['quantity'] ?? null;

        if (empty($request_item_id) || empty($inventory_id) || !is_numeric($quantity) || $quantity <= 0) {
            throw new Exception('Invalid allocation entry');
        }

        if (!isset($reqItems[(int)$request_item_id])) { throw new Exception('Allocation refers to non-existent request_item'); }
        $req_item = $reqItems[(int)$request_item_id];

        // Load inventory to validate
        $stmt_inv = $conn->prepare("SELECT inventory_id, variant_id, packaging_type_id, warehouse_id FROM inventory WHERE inventory_id = ?");
        $stmt_inv->bind_param('i', $inventory_id);
        $stmt_inv->execute();
        $inv = $stmt_inv->get_result()->fetch_assoc();
        $stmt_inv->close();

        if (!$inv) { throw new Exception('Inventory not found: ' . $inventory_id); }
        if ((int)$inv['warehouse_id'] !== $source_wh) { throw new Exception('Inventory warehouse mismatch for inventory_id ' . $inventory_id); }
        if ((int)$inv['variant_id'] !== (int)$req_item['variant_id']) { throw new Exception('Variant mismatch between request_item and inventory'); }
        if ((int)$inv['packaging_type_id'] !== (int)$req_item['packaging_type_id']) { throw new Exception('Packaging mismatch between request_item and inventory'); }

        // Insert transfer item
        $stmt_ti->bind_param('iid', $transfer_id, $inventory_id, $quantity);
        $stmt_ti->execute();
    }

    $stmt_ti->close();

    // Mark request as Approved (allocated) and attach admin note
    $stmt_up = $conn->prepare("UPDATE transfer_requests SET request_status = 'Approved', request_admin_note = ?, request_updated_at = NOW() WHERE request_id = ?");
    $stmt_up->bind_param('si', $admin_note, $request_id);
    $stmt_up->execute();

    $conn->commit();

    print_success('Allocation completed; transfer created.', [ 'request_id' => (int)$request_id, 'transfer_id' => (int)$transfer_id ]);

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn->connect_errno === 0) { $conn->rollback(); }
    print_failure('Internal Error: ' . $e->getMessage() . ' At line ' . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) { $conn->close(); }
}
