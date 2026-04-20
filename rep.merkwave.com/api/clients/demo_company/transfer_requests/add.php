<?php
/**
 * transfer_requests/add.php
 * Create a pending transfer request from a sales rep without binding to inventory_id.
 * Admin will later allocate available inventory batches and set production dates.
 *
 * Expected POST:
 * - source_warehouse_id (int)
 * - destination_warehouse_id (int)
 * - note (string, optional)
 * - items: JSON array of { variant_id:int, packaging_type_id:int, quantity:float, note?:string }
 *
 * Returns: { status, message, data: { request_id, items_count } }
 */

require_once '../db_connect.php';
require_once '../notifications/notify_helpers.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {

    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    $source_warehouse_id      = $_POST['source_warehouse_id'] ?? null;
    $destination_warehouse_id = $_POST['destination_warehouse_id'] ?? null;
    $note                     = $_POST['note'] ?? null;
    $items_json               = $_POST['items'] ?? '[]';
    $items                    = json_decode($items_json, true);

    if (empty($user_id)) {
        print_failure("Invalid session. Please login again.");
    }
    if (empty($source_warehouse_id) || !is_numeric($source_warehouse_id) || empty($destination_warehouse_id) || !is_numeric($destination_warehouse_id)) {
        print_failure("Error: Valid 'Source' and 'Destination' Warehouse IDs are required.");
    }
    if ($source_warehouse_id == $destination_warehouse_id) {
        print_failure("Error: Source and destination warehouses cannot be the same.");
    }
    if (empty($items) || !is_array($items)) {
        print_failure("Error: At least one item is required to create a request.");
    }

    // Fetch user info for notification
    $user_name = 'مستخدم';
    $stmt_user = $conn->prepare("SELECT users_name FROM users WHERE users_id = ? LIMIT 1");
    if ($stmt_user) {
        $stmt_user->bind_param("i", $user_id);
        $stmt_user->execute();
        $result_user = $stmt_user->get_result();
        if ($result_user->num_rows > 0) {
            $row_user = $result_user->fetch_assoc();
            $user_name = $row_user['users_name'] ?? 'مستخدم';
        }
        $stmt_user->close();
    }

    // Fetch warehouse names for notification
    $source_warehouse_name = 'مخزن #' . $source_warehouse_id;
    $destination_warehouse_name = 'مخزن #' . $destination_warehouse_id;
    
    $stmt_wh = $conn->prepare("SELECT warehouse_id, warehouse_name FROM warehouse WHERE warehouse_id IN (?, ?)");
    if ($stmt_wh) {
        $stmt_wh->bind_param("ii", $source_warehouse_id, $destination_warehouse_id);
        $stmt_wh->execute();
        $result_wh = $stmt_wh->get_result();
        while ($row_wh = $result_wh->fetch_assoc()) {
            if ($row_wh['warehouse_id'] == $source_warehouse_id) {
                $source_warehouse_name = $row_wh['warehouse_name'];
            }
            if ($row_wh['warehouse_id'] == $destination_warehouse_id) {
                $destination_warehouse_name = $row_wh['warehouse_name'];
            }
        }
        $stmt_wh->close();
    }

    $conn->begin_transaction();

    // Create main request
    $stmt_req = $conn->prepare("INSERT INTO transfer_requests (request_source_warehouse_id, request_destination_warehouse_id, request_status, request_notes, request_created_by_user_id) VALUES (?, ?, 'Pending', ?, ?)");
    $stmt_req->bind_param("iisi", $source_warehouse_id, $destination_warehouse_id, $note, $user_id);
    $stmt_req->execute();
    $request_id = $stmt_req->insert_id;
    $stmt_req->close();

    // Insert items
    $stmt_item = $conn->prepare("INSERT INTO transfer_request_items (request_id, variant_id, packaging_type_id, requested_quantity, request_item_note) VALUES (?, ?, ?, ?, ?)");

    $count = 0;
    foreach ($items as $item) {
        $variant_id        = $item['variant_id'] ?? null;
        $packaging_type_id = $item['packaging_type_id'] ?? null;
        $quantity          = $item['quantity'] ?? null;
        $item_note         = $item['note'] ?? null;

        if (empty($variant_id) || !is_numeric($variant_id) || empty($packaging_type_id) || !is_numeric($packaging_type_id) || !is_numeric($quantity) || $quantity <= 0) {
            throw new Exception("Invalid item data. Each item must include valid variant_id, packaging_type_id and quantity > 0.");
        }

        $stmt_item->bind_param("iiids", $request_id, $variant_id, $packaging_type_id, $quantity, $item_note);
        $stmt_item->execute();
        $count++;
    }
    $stmt_item->close();

    $conn->commit();
    
    // Send notification to admin about the new transfer request
    try {
        $title = 'طلب نقل بضاعة جديد';
        $body = sprintf(
            '%s أنشأ طلب نقل بضاعة من %s إلى %s بعدد %d صنف ويحتاج إلى موافقتك.',
            $user_name,
            $source_warehouse_name,
            $destination_warehouse_name,
            $count
        );
        $data = [
            'request_id' => $request_id,
            'source_warehouse_id' => $source_warehouse_id,
            'source_warehouse_name' => $source_warehouse_name,
            'destination_warehouse_id' => $destination_warehouse_id,
            'destination_warehouse_name' => $destination_warehouse_name,
            'items_count' => $count,
            'requested_by_user_id' => $user_id,
            'requested_by_user_name' => $user_name,
            'status' => 'Pending',
            'note' => $note,
        ];
        create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'high', 'transfer_requests', $request_id);
    } catch (Throwable $notifyEx) {
        error_log('Failed to create transfer request notification: ' . $notifyEx->getMessage());
    }
    
    print_success("Transfer request created successfully.", [
        'request_id' => $request_id,
        'items_count' => $count
    ]);

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn->connect_errno === 0) {
        $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
