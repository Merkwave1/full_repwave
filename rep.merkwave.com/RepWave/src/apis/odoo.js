import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from './auth.js';

/**
 * Build API URL for Odoo integration endpoints
 */
function buildOdooApiUrl(endpoint, params = {}) {
    const companyName = getCompanyName();
    if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
    
    const url = new URL(`${API_BASE_URL}${companyName}/odoo/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            url.searchParams.set(k, v);
        }
    });
    return url.toString();
}

/**
 * Get Odoo sync logs with pagination and filters
 * @param {Object} options - Query options
 * @param {number} options.page - Current page number
 * @param {number} options.perPage - Items per page
 * @param {string} options.status - Filter by status (all/success/failed)
 * @param {string} options.searchTerm - Search term for client/partner IDs
 * @param {string} options.dateFrom - Start date filter (YYYY-MM-DD)
 * @param {string} options.dateTo - End date filter (YYYY-MM-DD)
 * @returns {Promise<Object>} Response with logs, stats, and pagination
 */
export const getOdooSyncLogs = async ({
    page = 1,
    perPage = 10,
    status = 'all',
    searchTerm = '',
    dateFrom = '',
    dateTo = ''
} = {}) => {
    try {
        const params = {
            page,
            per_page: perPage
        };
        
        if (status && status !== 'all') params.status = status;
        if (searchTerm) params.search = searchTerm;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        
        const url = buildOdooApiUrl('get_sync_logs.php', params);
        const response = await apiClient.get(url);
        
        if (response.status === 'success') {
            return {
                logs: response.data?.logs ?? [],
                stats: response.data?.stats ?? { total: 0, successful: 0, failed: 0, success_rate: 0 },
                pagination: response.data?.pagination ?? { total_count: 0, total_pages: 1, current_page: page, per_page: perPage }
            };
        }
        
        throw new Error(response.message || 'Failed to fetch Odoo sync logs');
    } catch (error) {
        console.error('❌ Error in getOdooSyncLogs:', error);
        throw error;
    }
};

/**
 * Test Odoo connection with provided credentials
 * @param {Object} credentials - Odoo connection details
 * @param {string} credentials.url - Odoo server URL
 * @param {string} credentials.database - Database name
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 * @returns {Promise<Object>} Connection test result
 */
export const testOdooConnection = async (credentials) => {
    try {
        const url = buildOdooApiUrl('test_connection.php');
        const response = await apiClient.post(url, credentials);
        
        if (response.status === 'success') {
            return response;
        }
        
        throw new Error(response.message || 'Failed to test Odoo connection');
    } catch (error) {
        console.error('❌ Error in testOdooConnection:', error);
        throw error;
    }
};

/**
 * Build API URL for product sync logs endpoint
 */
function buildProductSyncApiUrl(endpoint, params = {}) {
    const companyName = getCompanyName();
    if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
    
    const url = new URL(`${API_BASE_URL}${companyName}/sync_logs/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            url.searchParams.set(k, v);
        }
    });
    return url.toString();
}

/**
 * Get Product sync logs with pagination and filters
 * @param {Object} options - Query options
 * @param {number} options.page - Current page number
 * @param {number} options.perPage - Items per page
 * @param {string} options.status - Filter by status (all/success/failed)
 * @param {string} options.searchTerm - Search term for variant name or IDs
 * @param {string} options.dateFrom - Start date filter (YYYY-MM-DD)
 * @param {string} options.dateTo - End date filter (YYYY-MM-DD)
 * @returns {Promise<Object>} Response with logs, stats, and pagination
 */
export const getProductSyncLogs = async ({
    page = 1,
    perPage = 10,
    status = 'all',
    searchTerm = '',
    dateFrom = '',
    dateTo = ''
} = {}) => {
    try {
        const params = {
            page,
            per_page: perPage
        };
        
        if (status && status !== 'all') params.status = status;
        if (searchTerm) params.search = searchTerm;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        
        const url = buildProductSyncApiUrl('product_sync_logs.php', params);
        const response = await apiClient.get(url);
        
        if (response.status === 'success') {
            return {
                logs: response.data?.logs ?? [],
                stats: response.data?.stats ?? { 
                    total_syncs: 0, 
                    successful_syncs: 0, 
                    failed_syncs: 0, 
                    success_rate: 0,
                    synced_variants: 0,
                    unsynced_variants: 0
                },
                pagination: response.data?.pagination ?? { 
                    total_count: 0, 
                    total_pages: 1, 
                    current_page: page, 
                    per_page: perPage 
                }
            };
        }
        
        throw new Error(response.message || 'Failed to fetch product sync logs');
    } catch (error) {
        console.error('❌ Error in getProductSyncLogs:', error);
        throw error;
    }
};

/**
 * Get Sales Order sync logs with pagination and filters
 * @param {Object} options - Query options
 * @param {number} options.page - Current page number
 * @param {number} options.perPage - Items per page
 * @param {string} options.status - Filter by status (all/success/failed)
 * @param {string} options.action - Filter by action (all/create/update)
 * @param {string} options.searchTerm - Search term for order IDs, client name
 * @param {string} options.dateFrom - Start date filter (YYYY-MM-DD)
 * @param {string} options.dateTo - End date filter (YYYY-MM-DD)
 * @returns {Promise<Object>} Response with logs, stats, and pagination
 */
export const getSalesOrderSyncLogs = async ({
    page = 1,
    perPage = 10,
    status = 'all',
    action = 'all',
    searchTerm = '',
    dateFrom = '',
    dateTo = ''
} = {}) => {
    try {
        const params = {
            page,
            per_page: perPage
        };
        
        if (status && status !== 'all') params.status = status;
        if (action && action !== 'all') params.action = action;
        if (searchTerm) params.search = searchTerm;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        
        const url = buildOdooApiUrl('get_sales_order_sync_logs.php', params);
        const response = await apiClient.get(url);
        
        if (response.status === 'success') {
            return {
                logs: response.data?.logs ?? [],
                stats: response.data?.stats ?? { 
                    total: 0, 
                    successful: 0, 
                    failed: 0, 
                    creates: 0,
                    updates: 0,
                    success_rate: 0,
                    synced_orders: 0,
                    unsynced_orders: 0
                },
                pagination: response.data?.pagination ?? { 
                    total_count: 0, 
                    total_pages: 1, 
                    current_page: page, 
                    per_page: perPage 
                }
            };
        }
        
        throw new Error(response.message || 'Failed to fetch sales order sync logs');
    } catch (error) {
        console.error('❌ Error in getSalesOrderSyncLogs:', error);
        throw error;
    }
};

/**
 * Get Payment sync logs with pagination and filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Response with logs, stats, and pagination
 */
export const getPaymentSyncLogs = async ({
    page = 1,
    perPage = 10,
    status = 'all',
    action = 'all',
    searchTerm = '',
    dateFrom = '',
    dateTo = ''
} = {}) => {
    try {
        const params = {
            page,
            limit: perPage
        };
        
        if (status && status !== 'all') params.status = status;
        if (action && action !== 'all') params.action = action;
        if (searchTerm) params.search = searchTerm;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        
        const url = buildOdooApiUrl('get_payment_sync_logs.php', params);
        const response = await apiClient.get(url);
        
        if (response.status === 'success') {
            return {
                logs: response.data?.logs ?? [],
                stats: response.data?.statistics ?? { 
                    total: 0, 
                    success: 0, 
                    failed: 0, 
                    created: 0,
                    updated: 0
                },
                pagination: response.data?.pagination ?? { 
                    total: 0, 
                    total_pages: 1, 
                    current_page: page, 
                    per_page: perPage 
                }
            };
        }
        
        throw new Error(response.message || 'Failed to fetch payment sync logs');
    } catch (error) {
        console.error('❌ Error in getPaymentSyncLogs:', error);
        throw error;
    }
};

/**
 * Get Safe Transfer sync logs with pagination and filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Response with logs, stats, and pagination
 */
export const getSafeTransferSyncLogs = async ({
    page = 1,
    perPage = 10,
    status = 'all',
    action = 'all',
    searchTerm = '',
    dateFrom = '',
    dateTo = ''
} = {}) => {
    try {
        const params = {
            page,
            limit: perPage
        };
        
        if (status && status !== 'all') params.status = status;
        if (action && action !== 'all') params.action = action;
        if (searchTerm) params.search = searchTerm;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        
        const url = buildOdooApiUrl('get_safe_transfer_sync_logs.php', params);
        const response = await apiClient.get(url);
        
        if (response.status === 'success') {
            return {
                logs: response.data?.logs ?? [],
                stats: response.data?.statistics ?? { 
                    total: 0, 
                    success: 0, 
                    failed: 0, 
                    created: 0,
                    updated: 0
                },
                pagination: response.data?.pagination ?? { 
                    total: 0, 
                    total_pages: 1, 
                    current_page: page, 
                    per_page: perPage 
                }
            };
        }
        
        throw new Error(response.message || 'Failed to fetch safe transfer sync logs');
    } catch (error) {
        console.error('❌ Error in getSafeTransferSyncLogs:', error);
        throw error;
    }
};

/**
 * Get unified Transaction sync logs (payments + safe transfers)
 * All financial transactions synced to Odoo as journal entries
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Response with logs, stats, and pagination
 */
export const getTransactionSyncLogs = async ({
    page = 1,
    perPage = 10,
    status = 'all',
    type = 'all',
    searchTerm = '',
    dateFrom = '',
    dateTo = ''
} = {}) => {
    try {
        const params = {
            page,
            perPage
        };
        
        if (status && status !== 'all') params.status = status;
        if (type && type !== 'all') params.type = type;
        if (searchTerm) params.searchTerm = searchTerm;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        
        const url = buildOdooApiUrl('get_transaction_sync_logs.php', params);
        const response = await apiClient.get(url);
        
        if (response.status === 'success') {
            return {
                logs: response.logs ?? [],
                stats: response.stats ?? { 
                    total: 0, 
                    success: 0, 
                    failed: 0,
                    payments: { total: 0, success: 0, failed: 0 },
                    transfers: { total: 0, success: 0, failed: 0 }
                },
                pagination: response.pagination ?? { 
                    total: 0, 
                    total_pages: 1, 
                    current_page: page, 
                    per_page: perPage 
                }
            };
        }
        
        throw new Error(response.message || 'Failed to fetch transaction sync logs');
    } catch (error) {
        console.error('❌ Error in getTransactionSyncLogs:', error);
        throw error;
    }
};

/**
 * Get Inventory sync logs (deliveries + internal transfers)
 * All inventory operations synced to Odoo as stock.picking records
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Response with logs, stats, and pagination
 */
export const getInventorySyncLogs = async ({
    page = 1,
    perPage = 10,
    status = 'all',
    type = 'all',
    searchTerm = '',
    dateFrom = '',
    dateTo = ''
} = {}) => {
    try {
        const params = {
            page,
            perPage
        };
        
        if (status && status !== 'all') params.status = status;
        if (type && type !== 'all') params.type = type;
        if (searchTerm) params.searchTerm = searchTerm;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        
        const url = buildOdooApiUrl('get_inventory_sync_logs.php', params);
        const response = await apiClient.get(url);
        
        if (response.status === 'success') {
            return {
                logs: response.logs ?? [],
                stats: response.stats ?? { 
                    total: 0, 
                    success: 0, 
                    failed: 0,
                    deliveries: { total: 0, success: 0, failed: 0 },
                    transfers: { total: 0, success: 0, failed: 0 }
                },
                pagination: response.pagination ?? { 
                    total: 0, 
                    total_pages: 1, 
                    current_page: page, 
                    per_page: perPage 
                }
            };
        }
        
        throw new Error(response.message || 'Failed to fetch inventory sync logs');
    } catch (error) {
        console.error('❌ Error in getInventorySyncLogs:', error);
        throw error;
    }
};

/**
 * Import users/employees from Odoo
 * @param {Object} options - Import options
 * @param {string} options.mode - 'update' or 'replace'
 * @param {boolean} options.dry_run - If true, don't make changes
 * @returns {Promise<Object>} Import results with statistics
 */
export const importUsersFromOdoo = async ({ mode = 'update', dry_run = false } = {}) => {
    try {
        const url = buildOdooApiUrl('import_users.php');
        const response = await apiClient.post(url, { mode, dry_run });
        
        if (response.status === 'success') {
            return {
                status: 'success',
                message: response.message,
                data: response.data
            };
        }
        
        throw new Error(response.message || 'Failed to import users from Odoo');
    } catch (error) {
        console.error('❌ Error in importUsersFromOdoo:', error);
        throw error;
    }
};

/**
 * Generic import function for any entity from Odoo
 * @param {string} entity - Entity type to import (e.g., 'users', 'clients', 'products')
 * @param {Object} options - Import options
 * @param {string} options.mode - 'update' or 'replace'
 * @param {boolean} options.dry_run - If true, don't make changes
 * @returns {Promise<Object>} Import results with statistics
 */
export const importFromOdoo = async (entity, { mode = 'update', dry_run = false } = {}) => {
    try {
        const endpoint = `import_${entity}.php`;
        const url = buildOdooApiUrl(endpoint);
        const response = await apiClient.post(url, { mode, dry_run });
        
        if (response.status === 'success') {
            return {
                status: 'success',
                message: response.message,
                data: response.data
            };
        }
        
        throw new Error(response.message || `Failed to import ${entity} from Odoo`);
    } catch (error) {
        console.error(`❌ Error in importFromOdoo (${entity}):`, error);
        throw error;
    }
};

/**
 * Delete imported data for specific entities
 * Data is deleted in reverse order to respect foreign key constraints
 * @param {string} entity - Entity type to delete (e.g., 'clients', 'products')
 * @returns {Promise<Object>} Delete results with statistics
 */
export const deleteOdooData = async (entity) => {
    try {
        const url = buildOdooApiUrl('delete_data.php');
        const response = await apiClient.post(url, { entity });
        
        if (response.status === 'success') {
            return {
                status: 'success',
                message: response.message,
                data: response.data
            };
        }
        
        throw new Error(response.message || `Failed to delete ${entity} data`);
    } catch (error) {
        console.error(`❌ Error in deleteOdooData (${entity}):`, error);
        throw error;
    }
};

export default {
    getOdooSyncLogs,
    testOdooConnection,
    getProductSyncLogs,
    getSalesOrderSyncLogs,
    getPaymentSyncLogs,
    getSafeTransferSyncLogs,
    getTransactionSyncLogs,
    getInventorySyncLogs,
    importUsersFromOdoo,
    importFromOdoo,
    deleteOdooData
};
