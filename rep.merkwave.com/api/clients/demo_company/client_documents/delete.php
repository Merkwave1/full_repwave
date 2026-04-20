<?php
// Enables strict error reporting for mysqli
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once '../db_connect.php';

try {
    // Handle preflight requests quickly
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }

    // Collect POST data
    $client_document_id = $_POST['client_document_id'] ?? null;
    $users_uuid = $_POST['users_uuid'] ?? null;

    if (empty($client_document_id) || !is_numeric($client_document_id) || $client_document_id <= 0) {
        print_failure('Error: A valid document ID is required for deletion.');
    }

    if (empty($users_uuid)) {
        print_failure('Error: User UUID is required.');
    }

    // Resolve the requesting user to ensure the session is valid
    $user_stmt = $conn->prepare('SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1');
    if (!$user_stmt) {
        throw new Exception('Failed to prepare user lookup statement.');
    }

    $user_stmt->bind_param('s', $users_uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    $user_row = $user_result->fetch_assoc();
    $user_stmt->close();

    if (!$user_row) {
        print_failure('Error: Invalid user session. Please log in again.');
    }

    $requesting_user_id = (int) $user_row['users_id'];

    $conn->begin_transaction();

    try {
        // Fetch the document details to ensure it exists and to get file path for cleanup
        $stmt = $conn->prepare("
            SELECT client_document_client_id,
                   client_document_file_path
            FROM client_documents
            WHERE client_document_id = ?
        ");

        if (!$stmt) {
            throw new Exception('Failed to prepare document lookup statement.');
        }

        $stmt->bind_param('i', $client_document_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $document = $result->fetch_assoc();
        $stmt->close();

        if (!$document) {
            throw new Exception('Document not found or already deleted.');
        }

        // Delete the record
    $delete_stmt = $conn->prepare('DELETE FROM client_documents WHERE client_document_id = ?');
        if (!$delete_stmt) {
            throw new Exception('Failed to prepare delete statement.');
        }

        $delete_stmt->bind_param('i', $client_document_id);
        $delete_stmt->execute();

        if ($delete_stmt->affected_rows === 0) {
            throw new Exception('Unable to delete document record.');
        }

        $delete_stmt->close();

        // Attempt to remove the file from disk (best-effort)
        if (!empty($document['client_document_file_path'])) {
            $fileUrlPath = parse_url($document['client_document_file_path'], PHP_URL_PATH);
            if ($fileUrlPath) {
                global $company_name;
                $uploadsPrefix = '/api/clients/' . $company_name . '/uploads/';
                if (str_starts_with($fileUrlPath, $uploadsPrefix)) {
                    $relativePath = substr($fileUrlPath, strlen($uploadsPrefix));
                    $uploadsBase = realpath(__DIR__ . '/../uploads');
                    if ($uploadsBase) {
                        $fileSystemPath = $uploadsBase . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
                        if (file_exists($fileSystemPath) && is_file($fileSystemPath)) {
                            @unlink($fileSystemPath);
                        }
                    }
                }
            }
        }

        $conn->commit();

        print_success('Client document deleted successfully.');
    } catch (Exception $innerException) {
        $conn->rollback();
        throw $innerException;
    }
} catch (Exception | TypeError $e) {
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }
    if (isset($delete_stmt) && $delete_stmt instanceof mysqli_stmt) {
        $delete_stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
