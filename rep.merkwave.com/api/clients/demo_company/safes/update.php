<?php
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../functions.php';

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow PUT or POST requests
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['PUT', 'POST'], true)) {
    echo json_encode(['status' => 'error', 'message' => 'Only PUT or POST requests are allowed']);
    exit;
}

try {
    // Get and validate UUID
    $headers = getallheaders();
    $uuid = $headers['User-UUID'] ?? null;
    
    // Capture raw input before decoding (used for both PUT and POST JSON bodies)
    $rawInput = file_get_contents('php://input');

    // Attempt to decode JSON payload first
    $input_data = [];
    if ($rawInput) {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            $input_data = $decoded;
        }
    }

    // For traditional POST form submissions, merge $_POST data
    if (empty($input_data) && !empty($_POST)) {
        $input_data = $_POST;
    }

    if (!$uuid) {
        // Fallback to UUID provided inside payload
        $uuid = $input_data['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    }

    if (!$uuid) {
        echo json_encode(['status' => 'error', 'message' => 'UUID is required']);
        exit;
    }

    // Get user info by UUID
    $stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
    $stmt->bind_param("s", $uuid);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_info = $result->fetch_assoc();
    
    if (!$user_info) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid UUID']);
        exit;
    }

    // Check permissions - only managers, admins and cash role can update safes
    if (!in_array($user_info['users_role'], ['manager', 'admin', 'cash'])) {
        echo json_encode(['status' => 'error', 'message' => 'Access denied: Insufficient permissions']);
        exit;
    }

    // Get safe ID from URL parameter
    $safe_id = $_GET['id'] ?? null;
    if (!$safe_id) {
        echo json_encode(['status' => 'error', 'message' => 'Safe ID is required']);
        exit;
    }

    if (empty($input_data)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid or empty input data']);
        exit;
    }

    // Check if safe exists
    $safe_check_stmt = $conn->prepare("SELECT safes_id, safes_name, safes_type, safes_rep_user_id FROM safes WHERE safes_id = ?");
    $safe_check_stmt->bind_param("i", $safe_id);
    $safe_check_stmt->execute();
    $result = $safe_check_stmt->get_result();
    $existing_safe = $result->fetch_assoc();

    if (!$existing_safe) {
        echo json_encode(['status' => 'error', 'message' => 'Safe not found']);
        exit;
    }

    $current_type = $existing_safe['safes_type'];
    $current_rep_user_id = $existing_safe['safes_rep_user_id'] !== null ? (int)$existing_safe['safes_rep_user_id'] : null;

    // Prepare update fields
    $update_fields = [];
    $update_params = [];

    $valid_types = ['company', 'rep', 'store_keeper'];
    $new_type = $current_type;

    if (array_key_exists('type', $input_data)) {
        $incoming_type = is_string($input_data['type']) ? trim($input_data['type']) : $input_data['type'];
        if ($incoming_type === null || $incoming_type === '') {
            echo json_encode(['status' => 'error', 'message' => "Field 'type' cannot be empty"]);
            exit;
        }

        if (!in_array($incoming_type, $valid_types, true)) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid safe type. Must be one of: ' . implode(', ', $valid_types)]);
            exit;
        }

        $new_type = $incoming_type;
        $update_fields[] = "safes_type = ?";
        $update_params[] = $new_type;
    }

    // Validate and prepare fields for update
    if (isset($input_data['name']) && trim($input_data['name']) !== '') {
        $name = trim($input_data['name']);
        
        // Check if name already exists (excluding current safe)
        $name_check_stmt = $conn->prepare("SELECT safes_id FROM safes WHERE safes_name = ? AND safes_id != ?");
        $name_check_stmt->bind_param("si", $name, $safe_id);
        $name_check_stmt->execute();
        $result = $name_check_stmt->get_result();
        if ($result->fetch_assoc()) {
            echo json_encode(['status' => 'error', 'message' => 'Safe name already exists']);
            exit;
        }
        
        $update_fields[] = "safes_name = ?";
        $update_params[] = $name;
    }

    if (isset($input_data['description'])) {
        $update_fields[] = "safes_description = ?";
        $update_params[] = trim($input_data['description']);
    }

    if (isset($input_data['payment_method_id'])) {
        $payment_method_id = intval($input_data['payment_method_id']);
        
        // Validate payment_method_id exists and is active
        $pm_check_stmt = $conn->prepare("SELECT payment_methods_id FROM payment_methods WHERE payment_methods_id = ? AND payment_methods_is_active = 1");
        $pm_check_stmt->bind_param("i", $payment_method_id);
        $pm_check_stmt->execute();
        $result = $pm_check_stmt->get_result();
        if (!$result->fetch_assoc()) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid payment method or payment method is not active']);
            exit;
        }
        
        $update_fields[] = "safes_payment_method_id = ?";
        $update_params[] = $payment_method_id;
    }

    if (isset($input_data['color'])) {
        $color = trim($input_data['color']);
        
        // Validate color (must match enum values)
        $valid_colors = ['white', 'black', 'lightgray', 'gray', 'blue', 'green', 'red', 'yellow', 'orange', 'beige'];
        if (!in_array($color, $valid_colors)) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid color. Must be one of: ' . implode(', ', $valid_colors)]);
            exit;
        }
        
        $update_fields[] = "safes_color = ?";
        $update_params[] = $color;
    }

    $rep_user_id_provided = array_key_exists('rep_user_id', $input_data);
    $rep_user_id_to_set = $current_rep_user_id;
    $should_update_rep_user = false;

    if ($new_type === 'company') {
        if ($rep_user_id_provided && $input_data['rep_user_id'] !== null && $input_data['rep_user_id'] !== '') {
            echo json_encode(['status' => 'error', 'message' => 'Company safes cannot be assigned to a representative']);
            exit;
        }

        if ($current_rep_user_id !== null || $rep_user_id_provided) {
            $rep_user_id_to_set = null;
            $should_update_rep_user = true;
        }
    } else {
        $needs_rep = in_array($new_type, ['rep', 'store_keeper'], true);
        if ($rep_user_id_provided) {
            $provided_rep = $input_data['rep_user_id'];

            if ($provided_rep === null || (is_string($provided_rep) && trim($provided_rep) === '') || $provided_rep === '') {
                echo json_encode(['status' => 'error', 'message' => 'rep_user_id is required for the selected safe type']);
                exit;
            }

            $rep_user_id = intval($provided_rep);
            
            $user_check_stmt = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_id = ?");
            $user_check_stmt->bind_param("i", $rep_user_id);
            $user_check_stmt->execute();
            $result = $user_check_stmt->get_result();
            $user_row = $result->fetch_assoc();
            if (!$user_row) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid rep_user_id']);
                exit;
            }

            $db_role = strtolower(trim((string)$user_row['users_role']));
            if ($new_type === 'rep' && !in_array($db_role, ['rep', 'sales_rep'], true)) {
                echo json_encode(['status' => 'error', 'message' => 'Selected user is not a sales representative']);
                exit;
            }

            if ($new_type === 'store_keeper' && !in_array($db_role, ['store_keeper', 'store', 'storekeeper'], true)) {
                echo json_encode(['status' => 'error', 'message' => 'Selected user is not a store keeper']);
                exit;
            }

            $rep_user_id_to_set = $rep_user_id;
            $should_update_rep_user = true;
        } elseif ($needs_rep) {
            if ($current_rep_user_id === null) {
                echo json_encode(['status' => 'error', 'message' => 'rep_user_id is required for the selected safe type']);
                exit;
            }

            if ($new_type !== $current_type) {
                $user_check_stmt = $conn->prepare("SELECT users_role FROM users WHERE users_id = ?");
                $user_check_stmt->bind_param("i", $current_rep_user_id);
                $user_check_stmt->execute();
                $result = $user_check_stmt->get_result();
                $user_row = $result->fetch_assoc();
                if (!$user_row) {
                    echo json_encode(['status' => 'error', 'message' => 'Existing representative user record not found']);
                    exit;
                }

                $db_role = strtolower(trim((string)$user_row['users_role']));
                if ($new_type === 'rep' && !in_array($db_role, ['rep', 'sales_rep'], true)) {
                    echo json_encode(['status' => 'error', 'message' => 'Existing assigned user is not a sales representative']);
                    exit;
                }

                if ($new_type === 'store_keeper' && !in_array($db_role, ['store_keeper', 'store', 'storekeeper'], true)) {
                    echo json_encode(['status' => 'error', 'message' => 'Existing assigned user is not a store keeper']);
                    exit;
                }
            }
        }
    }

    if ($should_update_rep_user) {
        $update_fields[] = "safes_rep_user_id = ?";
        $update_params[] = $rep_user_id_to_set;
    }

    // Remove meta fields that should not be persisted directly
    unset($input_data['users_uuid']);

    if (isset($input_data['is_active'])) {
        $update_fields[] = "safes_is_active = ?";
        $update_params[] = intval($input_data['is_active']);
    }

    // If no fields to update
    if (empty($update_fields)) {
        echo json_encode(['status' => 'error', 'message' => 'No valid fields to update']);
        exit;
    }

    // Add updated_at field
    $update_fields[] = "safes_updated_at = NOW()";

    // Build and execute update query
    $update_query = "UPDATE safes SET " . implode(", ", $update_fields) . " WHERE safes_id = ?";
    $update_params[] = $safe_id;

    $update_stmt = $conn->prepare($update_query);
    
    // Build parameter types string
    $types = "";
    foreach ($update_params as $param) {
        if (is_int($param)) {
            $types .= "i";
        } elseif (is_float($param)) {
            $types .= "d";
        } else {
            $types .= "s";
        }
    }
    
    $update_stmt->bind_param($types, ...$update_params);
    $update_stmt->execute();

    // Get updated safe data
    $updated_safe_stmt = $conn->prepare("
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
            s.safes_created_at,
            s.safes_updated_at,
            u.users_name as rep_user_name,
            pm.payment_methods_name as payment_method_name,
            pm.payment_methods_description as payment_method_description,
            pm.payment_methods_type as payment_method_type
        FROM safes s
        LEFT JOIN users u ON s.safes_rep_user_id = u.users_id
        LEFT JOIN payment_methods pm ON s.safes_payment_method_id = pm.payment_methods_id
        WHERE s.safes_id = ?
    ");
    
    $updated_safe_stmt->bind_param("i", $safe_id);
    $updated_safe_stmt->execute();
    $result = $updated_safe_stmt->get_result();
    $updated_safe = $result->fetch_assoc();

    echo json_encode([
        'status' => 'success',
        'message' => 'Safe updated successfully',
        'data' => [
            'safes_id' => (int)$updated_safe['safes_id'],
            'safes_name' => $updated_safe['safes_name'],
            'safes_description' => $updated_safe['safes_description'],
            'safes_balance' => (float)$updated_safe['safes_balance'],
            'safes_type' => $updated_safe['safes_type'],
            'safes_rep_user_id' => $updated_safe['safes_rep_user_id'] !== null ? (int)$updated_safe['safes_rep_user_id'] : null,
            'safes_payment_method_id' => (int)$updated_safe['safes_payment_method_id'],
            'safes_is_active' => (int)$updated_safe['safes_is_active'],
            'safes_color' => $updated_safe['safes_color'],
            'safes_created_at' => $updated_safe['safes_created_at'],
            'safes_updated_at' => $updated_safe['safes_updated_at'],
            'rep_user_name' => $updated_safe['rep_user_name'],
            'payment_method_name' => $updated_safe['payment_method_name'],
            'payment_method_description' => $updated_safe['payment_method_description'],
            'payment_method_type' => $updated_safe['payment_method_type']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
