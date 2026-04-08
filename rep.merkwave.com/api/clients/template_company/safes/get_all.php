<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID from request
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Get user ID and role from UUID
    $user_stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
    if (!$user_stmt) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    
    $user_stmt->bind_param("s", $users_uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    
    if ($user_result->num_rows === 0) {
        print_failure("Error: Invalid user UUID.");
    }
    
    $user_row = $user_result->fetch_assoc();
    $user_id = (int)$user_row['users_id'];
    // Basic validation: ensure resolved user id is valid
    if (empty($user_id) || !is_int($user_id) || $user_id <= 0) {
        print_failure("Error: Invalid user resolved from UUID.");
    }

    // Normalize role values to handle common variants (storekeeper, store, sales_rep, rep, etc.)
    $raw_role = strtolower(trim((string)$user_row['users_role'] ?? ''));
    if (in_array($raw_role, ['sales_rep', 'rep'])) {
        $user_role = 'rep';
    } elseif (in_array($raw_role, ['storekeeper', 'store', 'store_keeper'])) {
        $user_role = 'store_keeper';
    } elseif (in_array($raw_role, ['admin', 'administrator', 'superadmin'])) {
        $user_role = 'admin';
    } else {
        // Keep whatever the database has (allows custom roles) but normalized to lowercase
        $user_role = $raw_role;
    }
    $user_name = $user_row['users_name'];
    error_log("[SAFES][get_all] Request by UUID={$users_uuid} -> user_id={$user_id} role={$user_role}");
    $user_stmt->close();

    // If user is a rep, ensure they have a rep safe
    if ($user_role === 'rep') {
        // Check if rep already has a safe
        $check_safe_stmt = $conn->prepare("SELECT COUNT(*) as safe_count FROM safes WHERE safes_rep_user_id = ? AND safes_type = 'rep'");
        if (!$check_safe_stmt) {
            throw new Exception("Prepare failed for safe check: " . $conn->error);
        }
        
        $check_safe_stmt->bind_param("i", $user_id);
        $check_safe_stmt->execute();
        $safe_result = $check_safe_stmt->get_result();
        $safe_row = $safe_result->fetch_assoc();
        $check_safe_stmt->close();
        
        // If rep doesn't have a safe, create one
        if ($safe_row['safe_count'] == 0) {
            $safe_name = $user_name . " - Rep Safe";
            $safe_description = "Auto-created safe for sales representative " . $user_name;
            $create_safe_stmt = $conn->prepare("INSERT INTO safes (safes_name, safes_description, safes_balance, safes_type, safes_rep_user_id, safes_payment_method_id, safes_is_active) VALUES (?, ?, 0.00, 'rep', ?, 1, 1)");
            if (!$create_safe_stmt) {
                throw new Exception("Prepare failed for safe creation: " . $conn->error);
            }
            
            $create_safe_stmt->bind_param("ssi", $safe_name, $safe_description, $user_id);
            if (!$create_safe_stmt->execute()) {
                throw new Exception("Failed to create representative safe: " . $create_safe_stmt->error);
            }
            $create_safe_stmt->close();
            
            // Log the safe creation
            error_log("Created new safe for rep: $user_name (ID: $user_id) - Safe: $safe_name");
        }
    }

    // If user is a store_keeper, ensure they have a store_keeper safe
    if ($user_role === 'store_keeper') {
        // Check if store_keeper already has a safe
        $check_safe_stmt = $conn->prepare("SELECT COUNT(*) as safe_count FROM safes WHERE safes_rep_user_id = ? AND safes_type = 'store_keeper'");
        if (!$check_safe_stmt) {
            throw new Exception("Prepare failed for safe check: " . $conn->error);
        }
        
        $check_safe_stmt->bind_param("i", $user_id);
        $check_safe_stmt->execute();
        $safe_result = $check_safe_stmt->get_result();
        $safe_row = $safe_result->fetch_assoc();
        $check_safe_stmt->close();
        
        // If store_keeper doesn't have a safe, create one
        if ($safe_row['safe_count'] == 0) {
            $safe_name = $user_name . " - Store Keeper Safe";
            $safe_description = "Auto-created safe for store keeper " . $user_name;
            $create_safe_stmt = $conn->prepare("INSERT INTO safes (safes_name, safes_description, safes_balance, safes_type, safes_rep_user_id, safes_payment_method_id, safes_is_active) VALUES (?, ?, 0.00, 'store_keeper', ?, 1, 1)");
            if (!$create_safe_stmt) {
                throw new Exception("Prepare failed for safe creation: " . $conn->error);
            }
            
            $create_safe_stmt->bind_param("ssi", $safe_name, $safe_description, $user_id);
            if (!$create_safe_stmt->execute()) {
                throw new Exception("Failed to create store keeper safe: " . $create_safe_stmt->error);
            }
            $create_safe_stmt->close();
            
            // Log the safe creation
            error_log("Created new safe for store_keeper: $user_name (ID: $user_id) - Safe: $safe_name");
        }
    }

    // If user is a cash role, ensure they have a cash safe
    if ($user_role === 'cash') {
        // Check if cash user already has a safe
        $check_safe_stmt = $conn->prepare("SELECT COUNT(*) as safe_count FROM safes WHERE safes_rep_user_id = ? AND safes_type = 'cash'");
        if (!$check_safe_stmt) {
            throw new Exception("Prepare failed for safe check: " . $conn->error);
        }
        
        $check_safe_stmt->bind_param("i", $user_id);
        $check_safe_stmt->execute();
        $safe_result = $check_safe_stmt->get_result();
        $safe_row = $safe_result->fetch_assoc();
        $check_safe_stmt->close();
        
        // If cash user doesn't have a safe, create one
        if ($safe_row['safe_count'] == 0) {
            $safe_name = $user_name . " - Cash Safe";
            $safe_description = "Auto-created safe for cash role " . $user_name;
            $create_safe_stmt = $conn->prepare("INSERT INTO safes (safes_name, safes_description, safes_balance, safes_type, safes_rep_user_id, safes_payment_method_id, safes_is_active) VALUES (?, ?, 0.00, 'cash', ?, 1, 1)");
            if (!$create_safe_stmt) {
                throw new Exception("Prepare failed for safe creation: " . $conn->error);
            }
            
            $create_safe_stmt->bind_param("ssi", $safe_name, $safe_description, $user_id);
            if (!$create_safe_stmt->execute()) {
                throw new Exception("Failed to create cash safe: " . $create_safe_stmt->error);
            }
            $create_safe_stmt->close();
            
            // Log the safe creation
            error_log("Created new safe for cash role: $user_name (ID: $user_id) - Safe: $safe_name");
        }
    }

    $sql = "
        SELECT 
            s.safes_id,
            s.safes_name,
            s.safes_description,
            s.safes_balance,
            s.safes_type,
            s.safes_rep_user_id,
            s.safes_payment_method_id,
            s.safes_is_active,
            s.safes_color,
            s.safes_odoo_journal_id,
            s.safes_created_at,
            s.safes_updated_at,
            u.users_name as rep_name,
            pm.payment_methods_name as payment_method_name,
            pm.payment_methods_description as payment_method_description,
            pm.payment_methods_type as payment_method_type,
            COALESCE(pending_counts.pending_count, 0) AS pending_transactions_count
        FROM safes s
        LEFT JOIN users u ON s.safes_rep_user_id = u.users_id
        LEFT JOIN payment_methods pm ON s.safes_payment_method_id = pm.payment_methods_id
        LEFT JOIN (
            SELECT safe_transactions_safe_id, COUNT(*) AS pending_count
            FROM safe_transactions
            WHERE safe_transactions_status = 'pending'
            GROUP BY safe_transactions_safe_id
        ) AS pending_counts ON pending_counts.safe_transactions_safe_id = s.safes_id
    ";

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    // Filter safes based on user role
    if ($user_role === 'rep') {
        // Reps can see: their own rep safes plus active main/company safes (for transfers)
        $where_clauses[] = "((s.safes_rep_user_id = ? AND s.safes_type = 'rep') OR (s.safes_type = 'company' AND s.safes_is_active = 1))";
        $bind_types .= "i";
        $bind_params[] = $user_id;
    } elseif ($user_role === 'store_keeper') {
        // Store keepers can see their own store safes plus active main/company safes
        $where_clauses[] = "((s.safes_rep_user_id = ? AND s.safes_type = 'store_keeper') OR (s.safes_type = 'company' AND s.safes_is_active = 1))";
        $bind_types .= "i";
        $bind_params[] = $user_id;
    } elseif ($user_role === 'cash') {
        // Cash users can see safes explicitly assigned to them in user_safes table
        $where_clauses[] = "s.safes_id IN (SELECT safe_id FROM user_safes WHERE user_id = ?)";
        $bind_types .= "i";
        $bind_params[] = $user_id;
    } else {
        // Admins and other roles can see all safes
    }

    if (!empty($where_clauses)) {
        $sql .= " WHERE " . implode(" AND ", $where_clauses);
    }

    $sql .= " ORDER BY s.safes_type ASC, s.safes_name ASC";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        // Debug log of types and params to assist in diagnosing binding issues
        error_log("[SAFES][get_all] Binding params: types=" . $bind_types . " params=" . json_encode($bind_params));
        $stmt->bind_param($bind_types, ...$bind_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $safes = [];
    $total_pending_transactions = 0;
    while ($row = $result->fetch_assoc()) {
        $row['pending_transactions_count'] = (int)($row['pending_transactions_count'] ?? 0);
        $total_pending_transactions += $row['pending_transactions_count'];
        $safes[] = $row;
    }

    print_success("Safes retrieved successfully.", [
        'safes' => $safes,
        'pending_totals' => $total_pending_transactions,
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>