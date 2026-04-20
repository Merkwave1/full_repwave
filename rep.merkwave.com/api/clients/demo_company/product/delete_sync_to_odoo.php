<?php
/**
 * Manual Product Sync API Endpoint
 * 
 * Allows manual triggering of product variant sync to Odoo.
 * 
 * POST Parameters:
 * - variant_id: Sync a specific variant
 * - bulk: Set to 'true' to sync all unsynced variants
 * - limit: For bulk sync, limit number of variants (default: 100)
 * 
 * @author RepWave Integration
 * @version 1.0
 */

require_once '../db_connect.php';
require_once '../odoo/sync_products.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    // Validate user session
    validate_user_session();
    
    // Check if user is admin
    $current_user_role = $GLOBALS['current_user_role'] ?? '';
    if ($current_user_role !== 'admin') {
        print_failure('Only administrators can manually sync products to Odoo.');
        exit;
    }
    
    // Check if Odoo integration is enabled
    if (!isOdooIntegrationEnabled()) {
        print_failure('Odoo integration is disabled. Enable it in settings first.');
        exit;
    }
    
    // Get parameters
    $variant_id = isset($_POST['variant_id']) ? (int)$_POST['variant_id'] : null;
    $bulk = isset($_POST['bulk']) && $_POST['bulk'] === 'true';
    $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 100;
    
    if (!$variant_id && !$bulk) {
        print_failure('Either variant_id or bulk=true is required.');
        exit;
    }
    
    // Check Odoo connection settings
    $odoo_settings = getOdooSettings();
    if (!$odoo_settings) {
        print_failure('Odoo integration is not configured. Please configure Odoo settings first.');
        exit;
    }
    
    if ($bulk) {
        // Bulk sync unsynced variants
        $results = bulkSyncUnsynceVariants($limit);
        
        print_success("Bulk product sync completed.", [
            'total_processed' => $results['total'],
            'successful' => $results['success'],
            'failed' => $results['failed'],
            'success_rate' => $results['total'] > 0 ? round(($results['success'] / $results['total']) * 100, 2) : 0,
            'details' => $results['details']
        ]);
        
    } else {
        // Sync single variant
        $odoo_product_id = syncVariantById($variant_id);
        
        if ($odoo_product_id) {
            print_success("Product variant synced successfully to Odoo.", [
                'php_variant_id' => $variant_id,
                'odoo_product_id' => $odoo_product_id
            ]);
        } else {
            print_failure("Failed to sync product variant to Odoo. Check sync logs for details.");
        }
    }
    
} catch (Exception $e) {
    error_log('Manual product sync error: ' . $e->getMessage());
    print_failure('Error syncing product: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

// getOdooSettings() is already defined in functions.php (included via db_connect.php)
