<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Filters
    $safe_id = $_GET['safe_id'] ?? $_POST['safe_id'] ?? null; // Filter by a specific safe (either side)
    $user_id = $_GET['user_id'] ?? $_POST['user_id'] ?? null; // Filter by user who initiated
    // Date range in a single field (e.g., "2025-08-01,2025-08-31"); also support date_from/date_to
    $date_range = $_GET['date_range'] ?? $_POST['date_range'] ?? null;
    $date_from = $_GET['date_from'] ?? $_POST['date_from'] ?? null;
    $date_to   = $_GET['date_to']   ?? $_POST['date_to']   ?? null;
    if ($date_range && (empty($date_from) && empty($date_to))) {
        $normalizedRange = trim($date_range);
        if ($normalizedRange !== '') {
            // Split on comma/semicolon/pipe or explicit "to" / " - " separators without breaking ISO dates (e.g. 2025-10-15)
            $parts = preg_split('/\s*[;,|]\s*|\s+to\s+|\s+(?:-|–)\s+/i', $normalizedRange);
            if (is_array($parts) && !empty($parts)) {
                $parts = array_values(array_filter(array_map('trim', $parts), function ($value) {
                    return $value !== '';
                }));
                if (count($parts) >= 1) {
                    $date_from = $parts[0];
                }
                if (count($parts) >= 2) {
                    $date_to = $parts[1];
                }
            }
        }
    }
    
    // Normalize empty strings to null for date filters
    $date_from = ($date_from !== null && trim($date_from) !== '') ? trim($date_from) : null;
    $date_to = ($date_to !== null && trim($date_to) !== '') ? trim($date_to) : null;
    
    $out_dest_safe_id = $_GET['out_dest_safe_id'] ?? $_POST['out_dest_safe_id'] ?? null; // destination safe for outbound
    $in_dest_safe_id  = $_GET['in_dest_safe_id']  ?? $_POST['in_dest_safe_id']  ?? null; // source safe (الخزنة المحول منها)
    $status_filter    = $_GET['status'] ?? $_POST['status'] ?? null; // status: pending|approved|rejected
    $transfer_id      = $_GET['transfer_id'] ?? $_POST['transfer_id'] ?? null; // explicit transfer id (transfer_out id)
    $search_term      = $_GET['search'] ?? $_POST['search'] ?? null;

    // Pagination
    $page = isset($_GET['page']) && is_numeric($_GET['page']) && (int)$_GET['page'] > 0 ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) && (int)$_GET['limit'] > 0 ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $destinationSafeIdExpr = "CASE\n        WHEN st_out.safe_transactions_related_id IS NOT NULL THEN NULL\n        WHEN st_out.safe_transactions_reference LIKE 'TRANSFER_OUT_TO_%' THEN CAST(SUBSTRING(st_out.safe_transactions_reference, 17) AS UNSIGNED)\n        ELSE NULL\n    END";

    // Base SQL (only transfer_out rows; join inferred transfer_in partner)
    $sql_base = "
        FROM safe_transactions st_out
        JOIN safes s_source ON st_out.safe_transactions_safe_id = s_source.safes_id
        LEFT JOIN safe_transactions st_in ON (
            (st_out.safe_transactions_related_id IS NOT NULL AND st_in.safe_transactions_id = st_out.safe_transactions_related_id)
            OR (
                st_out.safe_transactions_related_id IS NULL
                AND st_in.safe_transactions_type = 'transfer_in'
                AND st_in.safe_transactions_amount = st_out.safe_transactions_amount
                AND st_in.safe_transactions_safe_id = (" . $destinationSafeIdExpr . ")
                AND st_in.safe_transactions_reference = CONCAT('TRANSFER_IN_FROM_', st_out.safe_transactions_safe_id)
            )
        )
        LEFT JOIN safes s_destination ON s_destination.safes_id = COALESCE(st_in.safe_transactions_safe_id, (" . $destinationSafeIdExpr . "))
        LEFT JOIN users u_out ON st_out.safe_transactions_created_by = u_out.users_id
        LEFT JOIN users u_in ON st_in.safe_transactions_created_by = u_in.users_id
        LEFT JOIN users u_out_approved ON st_out.safe_transactions_approved_by = u_out_approved.users_id
        LEFT JOIN users u_in_approved ON st_in.safe_transactions_approved_by = u_in_approved.users_id
        WHERE st_out.safe_transactions_type = 'transfer_out'
    ";

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($safe_id) && is_numeric($safe_id)) {
        $where_clauses[] = "(st_out.safe_transactions_safe_id = ? OR (" . $destinationSafeIdExpr . ") = ?)";
        $bind_types .= "ii";
        $bind_params[] = (int)$safe_id;
        $bind_params[] = (int)$safe_id;
    } else if (!empty($safe_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Error: Invalid Safe ID provided.']);
        exit;
    }

    if (!empty($user_id) && is_numeric($user_id)) {
        $where_clauses[] = "st_out.safe_transactions_created_by = ?";
        $bind_types .= "i";
        $bind_params[] = (int)$user_id;
    } else if (!empty($user_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Error: Invalid User ID provided.']);
        exit;
    }

    // Date range filter (applies to st.safe_transactions_date)
    if (!empty($date_from) && !empty($date_to)) {
        $where_clauses[] = "(st_out.safe_transactions_date BETWEEN ? AND ?)";
        $bind_types .= "ss";
        $bind_params[] = $date_from;
        $bind_params[] = $date_to . (strlen($date_to) === 10 ? ' 23:59:59' : '');
    } else if (!empty($date_from)) {
        $where_clauses[] = "(st_out.safe_transactions_date >= ?)";
        $bind_types .= "s";
        $bind_params[] = $date_from;
    } else if (!empty($date_to)) {
        $where_clauses[] = "(st_out.safe_transactions_date <= ?)";
        $bind_types .= "s";
        $bind_params[] = $date_to . (strlen($date_to) === 10 ? ' 23:59:59' : '');
    }

    // Destination filters
    if (!empty($out_dest_safe_id)) {
        if (!is_numeric($out_dest_safe_id)) {
            echo json_encode(['status' => 'error', 'message' => 'Error: Invalid Out Destination Safe ID.']);
            exit;
        }
        $where_clauses[] = "(COALESCE(st_in.safe_transactions_safe_id, (" . $destinationSafeIdExpr . ")) = ?)";
        $bind_types .= "i";
        $bind_params[] = (int)$out_dest_safe_id;
    }
    if (!empty($in_dest_safe_id)) {
        if (!is_numeric($in_dest_safe_id)) {
            echo json_encode(['status' => 'error', 'message' => 'Error: Invalid In Destination Safe ID.']);
            exit;
        }
        $where_clauses[] = "(st_out.safe_transactions_safe_id = ?)";
        $bind_types .= "i";
        $bind_params[] = (int)$in_dest_safe_id;
    }

    // Search term (matches names, reference, amount, and optionally transaction IDs)
    $search_numeric = null;
    if (!empty($search_term)) {
        $search_term = trim($search_term);
        if ($search_term === '') {
            $search_term = null;
        } elseif (ctype_digit($search_term)) {
            $search_numeric = (int)$search_term;
        }
    }

    if (!empty($search_term)) {
        $components = [];
        $bindSegmentTypes = '';
        $bindSegmentParams = [];

        $components[] = 'u_out.users_name LIKE ?';
        $bindSegmentTypes .= 's';
        $bindSegmentParams[] = '%' . $search_term . '%';

        $components[] = 's_source.safes_name LIKE ?';
        $bindSegmentTypes .= 's';
        $bindSegmentParams[] = '%' . $search_term . '%';

        $components[] = 's_destination.safes_name LIKE ?';
        $bindSegmentTypes .= 's';
        $bindSegmentParams[] = '%' . $search_term . '%';

        $components[] = 'st_out.safe_transactions_reference LIKE ?';
        $bindSegmentTypes .= 's';
        $bindSegmentParams[] = '%' . $search_term . '%';

        $components[] = 'CAST(st_out.safe_transactions_amount AS CHAR) LIKE ?';
        $bindSegmentTypes .= 's';
        $bindSegmentParams[] = '%' . $search_term . '%';

        if ($search_numeric !== null) {
            $components[] = 'st_out.safe_transactions_id = ?';
            $components[] = '(st_in.safe_transactions_id IS NOT NULL AND st_in.safe_transactions_id = ?)';
            $bindSegmentTypes .= 'ii';
            $bindSegmentParams[] = $search_numeric;
            $bindSegmentParams[] = $search_numeric;
        }

        $where_clauses[] = '(' . implode(' OR ', $components) . ')';
        $bind_types .= $bindSegmentTypes;
        array_push($bind_params, ...$bindSegmentParams);
    }

    // Status filter (match against transfer_out_status or transfer_in_status)
    if (!empty($status_filter)) {
        $sf = strtolower(trim($status_filter));
        if (!in_array($sf, ['pending','approved','rejected'], true)) {
            echo json_encode(['status' => 'error', 'message' => 'Error: Invalid status filter.']);
            exit;
        }
        $where_clauses[] = "(LOWER(COALESCE(st_out.safe_transactions_status, st_in.safe_transactions_status, '')) = ? OR (st_out.safe_transactions_status IS NULL AND st_in.safe_transactions_status = ?))";
        $bind_types .= 'ss';
        $bind_params[] = $sf;
        $bind_params[] = $sf;
    }

    // Explicit transfer id filter (filters by transfer_out id)
    if (!empty($transfer_id)) {
        if (!is_numeric($transfer_id)) {
            echo json_encode(['status' => 'error', 'message' => 'Error: Invalid transfer_id provided.']);
            exit;
        }
        $where_clauses[] = "(st_out.safe_transactions_id = ? OR (st_in.safe_transactions_id IS NOT NULL AND st_in.safe_transactions_id = ?))";
        $bind_types .= 'ii';
        $bind_params[] = (int)$transfer_id;
        $bind_params[] = (int)$transfer_id;
    }

    // Build count query
    $sql_count = "SELECT COUNT(*) AS cnt " . $sql_base;
    if (!empty($where_clauses)) {
        $sql_count .= " AND " . implode(" AND ", $where_clauses);
    }
    $stmt_count = $conn->prepare($sql_count);
    if (!$stmt_count) { throw new Exception('Prepare failed (count): ' . $conn->error); }
    if (!empty($bind_params)) {
        $stmt_count->bind_param($bind_types, ...$bind_params);
    }
    $stmt_count->execute();
    $res_count = $stmt_count->get_result();
    $rowc = $res_count->fetch_assoc();
    $total_items = (int)($rowc['cnt'] ?? 0);
    $stmt_count->close();

    // Data query with paging
    $sql_select = "
        SELECT 
            st_out.safe_transactions_id AS transfer_out_id,
            st_out.safe_transactions_safe_id AS source_safe_id,
            s_source.safes_name AS source_safe_name,
            s_source.safes_type AS source_safe_type,
            COALESCE(st_in.safe_transactions_safe_id, (" . $destinationSafeIdExpr . ")) AS destination_safe_id,
            s_destination.safes_name AS destination_safe_name,
            s_destination.safes_type AS destination_safe_type,
            st_out.safe_transactions_amount AS transfer_amount,
            st_out.safe_transactions_date AS transfer_out_date,
            st_out.safe_transactions_created_by AS transfer_out_created_by,
            u_out.users_name AS transfer_out_user_name,
            st_out.safe_transactions_description AS transfer_out_notes,
            st_out.safe_transactions_reference AS transfer_out_reference,
            st_out.safe_transactions_created_at AS transfer_out_created_at,
            st_out.safe_transactions_balance_before AS source_balance_before,
            st_out.safe_transactions_balance_after AS source_balance_after,
            st_out.safe_transactions_status AS transfer_out_status,
            st_out.safe_transactions_related_id AS transfer_related_id,
            st_out.safe_transactions_related_table AS transfer_related_table,
            st_out.safe_transactions_approved_by AS transfer_out_approved_by,
            st_out.safe_transactions_odoo_id AS transfer_out_odoo_id,
            u_out_approved.users_name AS transfer_out_approved_by_name,
            st_out.safe_transactions_approved_date AS transfer_out_approved_date,
            st_in.safe_transactions_id AS transfer_in_id,
            st_in.safe_transactions_date AS transfer_in_date,
            st_in.safe_transactions_created_by AS transfer_in_created_by,
            u_in.users_name AS transfer_in_user_name,
            st_in.safe_transactions_reference AS transfer_in_reference,
            st_in.safe_transactions_description AS transfer_in_notes,
            st_in.safe_transactions_balance_before AS destination_balance_before,
            st_in.safe_transactions_balance_after AS destination_balance_after,
            st_in.safe_transactions_created_at AS transfer_in_created_at,
            st_in.safe_transactions_amount AS transfer_in_amount,
            st_in.safe_transactions_status AS transfer_in_status,
            st_in.safe_transactions_approved_by AS transfer_in_approved_by,
            st_in.safe_transactions_odoo_id AS transfer_in_odoo_id,
            u_in_approved.users_name AS transfer_in_approved_by_name,
            st_in.safe_transactions_approved_date AS transfer_in_approved_date
        " . $sql_base;
    if (!empty($where_clauses)) {
        $sql_select .= " AND " . implode(" AND ", $where_clauses);
    }
    $sql_select .= " ORDER BY st_out.safe_transactions_date DESC, st_out.safe_transactions_id DESC LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql_select);
    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    // Bind params + paging params
    if (!empty($bind_params)) {
        $bind_types_paged = $bind_types . 'ii';
        $bind_params_paged = array_merge($bind_params, [$limit, $offset]);
        $stmt->bind_param($bind_types_paged, ...$bind_params_paged);
    } else {
        $stmt->bind_param('ii', $limit, $offset);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $transfers = [];
    while ($row = $result->fetch_assoc()) {
        $destinationSafeId = isset($row['destination_safe_id']) && $row['destination_safe_id'] !== null
            ? (int)$row['destination_safe_id']
            : null;

        $transferOutStatus = $row['transfer_out_status'] ?? null;
        $transferInStatus = $row['transfer_in_status'] ?? null;
        $overallStatus = $transferOutStatus;
        if ($transferInStatus === 'rejected' || $transferOutStatus === 'rejected') {
            $overallStatus = 'rejected';
        } elseif ($transferInStatus === 'pending' || $transferOutStatus === 'pending') {
            $overallStatus = 'pending';
        } elseif ($transferOutStatus === null && $transferInStatus !== null) {
            $overallStatus = $transferInStatus;
        }

        $transfers[] = [
            'safe_transactions_id' => (int)$row['transfer_out_id'],
            'transfer_out_id' => (int)$row['transfer_out_id'],
            'transfer_in_id' => isset($row['transfer_in_id']) && $row['transfer_in_id'] !== null ? (int)$row['transfer_in_id'] : null,
            'affected_safe_id' => (int)$row['source_safe_id'],
            'affected_safe_name' => $row['source_safe_name'],
            'affected_safe_type' => $row['source_safe_type'],
            'safe_transactions_counterpart_safe_id' => $destinationSafeId,
            'counterpart_safe_name' => $row['destination_safe_name'] ?? null,
            'counterpart_safe_type' => $row['destination_safe_type'] ?? null,
            'safe_transactions_type' => 'transfer_out',
            'safe_transactions_amount' => $row['transfer_amount'],
            'safe_transactions_date' => $row['transfer_out_date'],
            'safe_transactions_created_by' => $row['transfer_out_created_by'] ? (int)$row['transfer_out_created_by'] : null,
            'user_name' => $row['transfer_out_user_name'],
            'safe_transactions_notes' => $row['transfer_out_notes'],
            'safe_transactions_reference' => $row['transfer_out_reference'],
            'safe_transactions_created_at' => $row['transfer_out_created_at'],
            'source_balance_before' => $row['source_balance_before'],
            'source_balance_after' => $row['source_balance_after'],
            'destination_balance_before' => $row['destination_balance_before'] ?? null,
            'destination_balance_after' => $row['destination_balance_after'] ?? null,
            'transfer_in_reference' => $row['transfer_in_reference'] ?? null,
            'transfer_in_notes' => $row['transfer_in_notes'] ?? null,
            'transfer_in_date' => $row['transfer_in_date'] ?? null,
            'transfer_in_created_by' => isset($row['transfer_in_created_by']) && $row['transfer_in_created_by'] !== null ? (int)$row['transfer_in_created_by'] : null,
            'transfer_in_created_at' => $row['transfer_in_created_at'] ?? null,
            'transfer_in_amount' => $row['transfer_in_amount'] ?? null,
            'transfer_in_user_name' => $row['transfer_in_user_name'] ?? null,
            'transfer_out_status' => $transferOutStatus,
            'transfer_in_status' => $transferInStatus,
            'transfer_status' => $overallStatus,
            'safe_transactions_status' => $transferOutStatus,
            'safe_transactions_related_id' => isset($row['transfer_related_id']) ? (int)$row['transfer_related_id'] : null,
            'safe_transactions_related_table' => $row['transfer_related_table'] ?? null,
            'transfer_out_approved_by' => isset($row['transfer_out_approved_by']) ? (int)$row['transfer_out_approved_by'] : null,
            'transfer_out_approved_by_name' => $row['transfer_out_approved_by_name'] ?? null,
            'transfer_out_approved_date' => $row['transfer_out_approved_date'] ?? null,
            'transfer_in_approved_by' => isset($row['transfer_in_approved_by']) ? (int)$row['transfer_in_approved_by'] : null,
            'transfer_in_approved_by_name' => $row['transfer_in_approved_by_name'] ?? null,
            'transfer_in_approved_date' => $row['transfer_in_approved_date'] ?? null,
            'transfer_out_odoo_id' => isset($row['transfer_out_odoo_id']) ? (int)$row['transfer_out_odoo_id'] : null,
            'transfer_in_odoo_id' => isset($row['transfer_in_odoo_id']) ? (int)$row['transfer_in_odoo_id'] : null,
        ];
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Safe transfers retrieved successfully.',
        'data' => $transfers,
        'count' => count($transfers),
        'pagination' => [
            'total' => $total_items,
            'per_page' => $limit,
            'page' => $page,
            'total_pages' => ($limit > 0 ? max(1, (int)ceil($total_items / $limit)) : 1)
        ]
    ]);

} catch (Exception | TypeError $e) {
    echo json_encode(['status' => 'error', 'message' => 'Internal Error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
