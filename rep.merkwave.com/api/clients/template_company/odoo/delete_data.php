<?php
/**
 * Delete imported data from the system
 * 
 * Deletes data in reverse order to respect foreign key constraints:
 * - Dependent records are deleted first (e.g., orders before clients)
 * - This ensures referential integrity is maintained
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Get entity from request
$input = json_decode(file_get_contents('php://input'), true);
$entity = $input['entity'] ?? $_GET['entity'] ?? $_POST['entity'] ?? null;

if (!$entity) {
    echo json_encode([
        'status' => 'error',
        'message' => 'يرجى تحديد نوع البيانات المراد حذفها'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Delete records from a table with count
 */
function deleteFromTable($conn, $table, $where = null) {
    // Count first
    $countSql = "SELECT COUNT(*) as cnt FROM $table" . ($where ? " WHERE $where" : "");
    $result = $conn->query($countSql);
    $count = $result->fetch_assoc()['cnt'] ?? 0;
    
    if ($count > 0) {
        $deleteSql = "DELETE FROM $table" . ($where ? " WHERE $where" : "");
        $conn->query($deleteSql);
    }
    
    return $count;
}

try {
    $conn->begin_transaction();
    $deleted = 0;
    $message = '';
    $details = [];

    switch ($entity) {
        // === MOST DEPENDENT (Delete first) ===
        
        case 'purchase_returns':
            $deleted += deleteFromTable($conn, 'purchase_return_items');
            $deleted += deleteFromTable($conn, 'purchase_returns');
            $message = "تم حذف مرتجعات الشراء";
            break;
            
        case 'goods_receipts':
            $deleted += deleteFromTable($conn, 'goods_receipt_items');
            $deleted += deleteFromTable($conn, 'goods_receipts');
            $message = "تم حذف استلامات الشراء";
            break;
            
        case 'purchase_orders':
            // First delete dependent records
            $deleted += deleteFromTable($conn, 'purchase_return_items');
            $deleted += deleteFromTable($conn, 'purchase_returns');
            $deleted += deleteFromTable($conn, 'goods_receipt_items');
            $deleted += deleteFromTable($conn, 'goods_receipts');
            $deleted += deleteFromTable($conn, 'purchase_order_items');
            $deleted += deleteFromTable($conn, 'purchase_orders');
            $message = "تم حذف طلبات الشراء وجميع البيانات المرتبطة";
            break;
            
        case 'sales_returns':
        case 'credit_notes':
            $deleted += deleteFromTable($conn, 'sales_return_items');
            $deleted += deleteFromTable($conn, 'sales_returns');
            $message = "تم حذف مرتجعات البيع (الإشعارات الدائنة)";
            break;
            
        case 'sales_deliveries':
            $deleted += deleteFromTable($conn, 'sales_delivery_items');
            $deleted += deleteFromTable($conn, 'sales_deliveries');
            $message = "تم حذف تسليمات البيع";
            break;
            
        case 'sales_orders':
        case 'customer_invoices':
            // First delete dependent records
            $deleted += deleteFromTable($conn, 'sales_return_items');
            $deleted += deleteFromTable($conn, 'sales_returns');
            $deleted += deleteFromTable($conn, 'sales_delivery_items');
            $deleted += deleteFromTable($conn, 'sales_deliveries');
            $deleted += deleteFromTable($conn, 'sales_order_items');
            $deleted += deleteFromTable($conn, 'sales_orders');
            $message = "تم حذف طلبات البيع (فواتير العملاء) وجميع البيانات المرتبطة";
            break;
            
        case 'inventory':
            $deleted += deleteFromTable($conn, 'inventory');
            $message = "تم حذف بيانات المخزون";
            break;
            
        case 'warehouse':
            // First delete dependent data
            $deleted += deleteFromTable($conn, 'sales_delivery_items');
            $deleted += deleteFromTable($conn, 'sales_deliveries');
            $deleted += deleteFromTable($conn, 'inventory');
            $deleted += deleteFromTable($conn, 'warehouse');
            $message = "تم حذف المستودعات";
            break;
            
        case 'product_variants':
            // Delete dependent records first
            $deleted += deleteFromTable($conn, 'inventory');
            $deleted += deleteFromTable($conn, 'sales_delivery_items');
            $deleted += deleteFromTable($conn, 'sales_order_items');
            $deleted += deleteFromTable($conn, 'purchase_order_items');
            $deleted += deleteFromTable($conn, 'goods_receipt_items');
            $deleted += deleteFromTable($conn, 'product_variants');
            $message = "تم حذف متغيرات المنتجات";
            break;
            
        case 'products':
            // Delete all dependent records
            $deleted += deleteFromTable($conn, 'inventory');
            $deleted += deleteFromTable($conn, 'sales_delivery_items');
            $deleted += deleteFromTable($conn, 'sales_order_items');
            $deleted += deleteFromTable($conn, 'purchase_order_items');
            $deleted += deleteFromTable($conn, 'goods_receipt_items');
            $deleted += deleteFromTable($conn, 'product_variants');
            $deleted += deleteFromTable($conn, 'products');
            $message = "تم حذف المنتجات وجميع البيانات المرتبطة";
            break;
            
        case 'product_attribute_values':
            $deleted += deleteFromTable($conn, 'product_attribute_values');
            $message = "تم حذف قيم خصائص المنتجات";
            break;
            
        case 'product_attributes':
            $deleted += deleteFromTable($conn, 'product_attribute_values');
            $deleted += deleteFromTable($conn, 'product_attributes');
            $message = "تم حذف خصائص المنتجات";
            break;
            
        case 'categories':
            // Update products to remove category reference, then delete
            $conn->query("UPDATE products SET products_category_id = NULL");
            $deleted += deleteFromTable($conn, 'categories');
            $message = "تم حذف التصنيفات";
            break;
            
        case 'packaging_types':
            // Update dependent tables first
            $conn->query("UPDATE purchase_order_items SET purchase_order_items_packaging_type_id = NULL");
            $conn->query("UPDATE sales_order_items SET sales_order_items_packaging_type_id = NULL");
            $deleted += deleteFromTable($conn, 'packaging_types');
            $message = "تم حذف وحدات التعبئة";
            break;
            
        case 'base_units':
            // Update dependent tables first
            $conn->query("UPDATE purchase_order_items SET purchase_order_items_packaging_type_id = NULL");
            $conn->query("UPDATE sales_order_items SET sales_order_items_packaging_type_id = NULL");
            // Delete packaging_types first (they reference base_units)
            $deleted += deleteFromTable($conn, 'packaging_types');
            $deleted += deleteFromTable($conn, 'base_units');
            $message = "تم حذف وحدات القياس الأساسية";
            break;
            
        case 'suppliers':
            // Delete purchase-related data first
            $deleted += deleteFromTable($conn, 'purchase_return_items');
            $deleted += deleteFromTable($conn, 'purchase_returns');
            $deleted += deleteFromTable($conn, 'goods_receipt_items');
            $deleted += deleteFromTable($conn, 'goods_receipts');
            $deleted += deleteFromTable($conn, 'purchase_order_items');
            $deleted += deleteFromTable($conn, 'purchase_orders');
            $deleted += deleteFromTable($conn, 'suppliers');
            $message = "تم حذف الموردين وجميع البيانات المرتبطة";
            break;
        
        case 'safes':
            // Delete safes imported from Odoo (those with odoo_journal_id)
            // First delete related safe_transactions
            $conn->query("DELETE FROM safe_transactions WHERE safe_transactions_safe_id IN (SELECT safes_id FROM safes WHERE safes_odoo_journal_id IS NOT NULL)");
            // Delete related payments with safe_transactions
            $conn->query("DELETE FROM payments WHERE payments_safe_transaction_id IN (SELECT safe_transactions_id FROM safe_transactions WHERE safe_transactions_odoo_id IS NOT NULL)");
            // Delete related supplier_payments with safe_transactions
            $conn->query("DELETE FROM supplier_payments WHERE supplier_payments_safe_transaction_id IN (SELECT safe_transactions_id FROM safe_transactions WHERE safe_transactions_odoo_id IS NOT NULL)");
            $deleted += deleteFromTable($conn, 'safes', 'safes_odoo_journal_id IS NOT NULL');
            $message = "تم حذف الخزائن المستوردة من Odoo";
            break;
        
        case 'safe_transactions':
            // Delete safe transactions imported from Odoo
            // First delete related payments
            $conn->query("DELETE FROM payments WHERE payments_safe_transaction_id IN (SELECT safe_transactions_id FROM safe_transactions WHERE safe_transactions_odoo_id IS NOT NULL)");
            // Delete related supplier_payments  
            $conn->query("DELETE FROM supplier_payments WHERE supplier_payments_safe_transaction_id IN (SELECT safe_transactions_id FROM safe_transactions WHERE safe_transactions_odoo_id IS NOT NULL)");
            // Now delete safe transactions
            $deleted += deleteFromTable($conn, 'safe_transactions', 'safe_transactions_odoo_id IS NOT NULL');
            $message = "تم حذف معاملات الخزائن المستوردة من Odoo";
            break;
            
        case 'clients':
            // Delete all client-related data
            $deleted += deleteFromTable($conn, 'sales_return_items');
            $deleted += deleteFromTable($conn, 'sales_returns');
            $deleted += deleteFromTable($conn, 'sales_delivery_items');
            $deleted += deleteFromTable($conn, 'sales_deliveries');
            $deleted += deleteFromTable($conn, 'sales_order_items');
            $deleted += deleteFromTable($conn, 'sales_orders');
            $deleted += deleteFromTable($conn, 'payments');
            $deleted += deleteFromTable($conn, 'refunds');
            $deleted += deleteFromTable($conn, 'clients');
            $message = "تم حذف العملاء وجميع البيانات المرتبطة";
            break;
            
        case 'users':
            // Don't delete users with role 'admin' or the current user
            $deleted += deleteFromTable($conn, 'users', "users_role != 'Admin'");
            $message = "تم حذف المستخدمين (باستثناء المدراء)";
            break;
            
        case 'client_types':
            $conn->query("UPDATE clients SET clients_client_type_id = NULL");
            $deleted += deleteFromTable($conn, 'client_types');
            $message = "تم حذف أنواع العملاء";
            break;
            
        case 'client_industries':
            $conn->query("UPDATE clients SET clients_industry_id = NULL");
            $deleted += deleteFromTable($conn, 'client_industries');
            $message = "تم حذف قطاعات العملاء";
            break;
            
        case 'client_area_tags':
            $conn->query("UPDATE clients SET clients_area_tag_id = NULL");
            $deleted += deleteFromTable($conn, 'client_area_tags');
            $message = "تم حذف مناطق العملاء";
            break;
            
        case 'governorates':
            // clients table uses clients_city as text, not foreign key to governorates
            $deleted += deleteFromTable($conn, 'governorates');
            $message = "تم حذف المحافظات";
            break;
            
        case 'countries':
            // governorates has CASCADE delete, but delete them first to be safe
            $deleted += deleteFromTable($conn, 'governorates');
            $deleted += deleteFromTable($conn, 'countries');
            $message = "تم حذف الدول والمحافظات";
            break;

        // === DELETE ALL (Most dangerous - delete everything in reverse order) ===
        case 'all':
            // Phase 1: Transaction records
            $deleted += deleteFromTable($conn, 'purchase_return_items');
            $deleted += deleteFromTable($conn, 'purchase_returns');
            $deleted += deleteFromTable($conn, 'goods_receipt_items');
            $deleted += deleteFromTable($conn, 'goods_receipts');
            $deleted += deleteFromTable($conn, 'purchase_order_items');
            $deleted += deleteFromTable($conn, 'purchase_orders');
            $deleted += deleteFromTable($conn, 'sales_return_items');
            $deleted += deleteFromTable($conn, 'sales_returns');
            $deleted += deleteFromTable($conn, 'sales_delivery_items');
            $deleted += deleteFromTable($conn, 'sales_deliveries');
            $deleted += deleteFromTable($conn, 'sales_order_items');
            $deleted += deleteFromTable($conn, 'sales_orders');
            $deleted += deleteFromTable($conn, 'payments');
            $deleted += deleteFromTable($conn, 'supplier_payments');
            $deleted += deleteFromTable($conn, 'refunds');
            $deleted += deleteFromTable($conn, 'safe_transactions');
            $deleted += deleteFromTable($conn, 'safes');
            
            // Phase 2: Inventory
            $deleted += deleteFromTable($conn, 'inventory');
            $deleted += deleteFromTable($conn, 'warehouse');
            
            // Phase 3: Products
            $deleted += deleteFromTable($conn, 'product_variants');
            $deleted += deleteFromTable($conn, 'products');
            $deleted += deleteFromTable($conn, 'product_attribute_values');
            $deleted += deleteFromTable($conn, 'product_attributes');
            $deleted += deleteFromTable($conn, 'categories');
            $deleted += deleteFromTable($conn, 'packaging_types');
            $deleted += deleteFromTable($conn, 'base_units');
            
            // Phase 4: Partners
            $deleted += deleteFromTable($conn, 'suppliers');
            $deleted += deleteFromTable($conn, 'clients');
            
            // Phase 5: Users (except admins)
            $deleted += deleteFromTable($conn, 'users', "users_role != 'Admin'");
            
            // Phase 6: Reference data
            $conn->query("UPDATE clients SET clients_client_type_id = NULL");
            $deleted += deleteFromTable($conn, 'client_types');
            $deleted += deleteFromTable($conn, 'client_industries');
            $deleted += deleteFromTable($conn, 'client_area_tags');
            $deleted += deleteFromTable($conn, 'governorates');
            $deleted += deleteFromTable($conn, 'countries');
            
            $message = "تم حذف جميع البيانات المستوردة";
            break;
            
        default:
            throw new Exception("نوع البيانات غير معروف: $entity");
    }

    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => [
            'deleted_count' => $deleted,
            'entity' => $entity
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        'status' => 'error',
        'message' => 'خطأ أثناء الحذف: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
