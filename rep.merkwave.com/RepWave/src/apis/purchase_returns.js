// src/apis/purchase_returns.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Add a new purchase return (simple version)
 */
export const addPurchaseReturnSimple = async (purchaseReturnData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("purchase_returns/add_simple.php");
  
  // Send as JSON directly
  const payload = {
    users_uuid,
    ...purchaseReturnData
  };

  const response = await apiClient.post(url, payload);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to add purchase return');
  }

  return response;
};

/**
 * Add a new purchase return
 */
export const addPurchaseReturn = async (purchaseReturnData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("purchase_returns/add.php");
  const formData = new FormData();
  
  // Add user UUID
  formData.append('users_uuid', users_uuid);
  
  // Add main purchase return data
  formData.append('purchase_returns_supplier_id', purchaseReturnData.supplier_id);
  if (purchaseReturnData.purchase_order_id) {
    formData.append('purchase_returns_purchase_order_id', purchaseReturnData.purchase_order_id);
  }
  formData.append('purchase_returns_date', purchaseReturnData.date);
  if (purchaseReturnData.reason) {
    formData.append('purchase_returns_reason', purchaseReturnData.reason);
  }
  formData.append('purchase_returns_status', purchaseReturnData.status);
  if (purchaseReturnData.notes) {
    formData.append('purchase_returns_notes', purchaseReturnData.notes);
  }
  
  // Add purchase return items as JSON string
  formData.append('purchase_return_items', JSON.stringify(purchaseReturnData.items));

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to add purchase return');
  }

  return response;
};

/**
 * Update an existing purchase return
 */
export const updatePurchaseReturn = async (purchaseReturnId, purchaseReturnData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("purchase_returns/update.php");
  const formData = new FormData();
  
  // Add user UUID
  formData.append('users_uuid', users_uuid);
  
  formData.append('purchase_returns_id', purchaseReturnId);
  formData.append('purchase_returns_supplier_id', purchaseReturnData.supplier_id);
  if (purchaseReturnData.purchase_order_id) {
    formData.append('purchase_returns_purchase_order_id', purchaseReturnData.purchase_order_id);
  }
  formData.append('purchase_returns_date', purchaseReturnData.date);
  if (purchaseReturnData.reason) {
    formData.append('purchase_returns_reason', purchaseReturnData.reason);
  }
  formData.append('purchase_returns_status', purchaseReturnData.status);
  if (purchaseReturnData.notes) {
    formData.append('purchase_returns_notes', purchaseReturnData.notes);
  }
  
  // Add purchase return items as JSON string
  formData.append('purchase_return_items', JSON.stringify(purchaseReturnData.items));

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to update purchase return');
  }

  return response;
};

/**
 * Delete a purchase return
 */
export const deletePurchaseReturn = async (purchaseReturnId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("purchase_returns/delete.php");
  const formData = new FormData();
  
  // Add user UUID
  formData.append('users_uuid', users_uuid);
  formData.append('purchase_returns_id', purchaseReturnId);

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to delete purchase return');
  }

  return response;
};

/**
 * Get all purchase returns with optional filters
 */
export const getPurchaseReturns = async () => {
  const url = buildApiUrl("purchase_returns/get_all.php");

  // Use GET request instead of POST to avoid CORS issues with UUID header
  const response = await apiClient.get(url);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to fetch purchase returns');
  }

  // Backend returns { purchase_returns: [...] } in the data field
  if (response.data && Array.isArray(response.data.purchase_returns)) {
    return response.data.purchase_returns;
  } else if (response.data === null || (typeof response.data === 'object' && !response.data.purchase_returns)) {
    // Empty response or no purchase_returns key
    return [];
  } else {
    return [];
  }
};

/**
 * Get detailed information for a specific purchase return
 */
export const getPurchaseReturnDetails = async (purchaseReturnId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("purchase_returns/get_detail.php");
  const formData = new FormData();
  
  // Add user UUID and purchase return ID
  formData.append('users_uuid', users_uuid);
  formData.append('id', purchaseReturnId);

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to fetch purchase return details');
  }

  return response.data;
};

// New: Paginated getter for purchase returns (server-side pagination)
export const getPurchaseReturnsPaginated = async ({ page = 1, limit = 10, status, supplier_id, date_from, date_to } = {}) => {
  const baseUrl = buildApiUrl("purchase_returns/get_all.php");
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (status) params.set('status', status); // supports CSV
  if (supplier_id) params.set('supplier_id', String(supplier_id));
  if (date_from) params.set('date_from', date_from);
  if (date_to) params.set('date_to', date_to);
  params.set('_ts', String(Date.now()));

  const url = `${baseUrl}?${params.toString()}`;
  try {
    const response = await apiClient.get(url);
    if (response.status === 'success') {
      const d = response.data || {};
      const list = Array.isArray(d.purchase_returns) ? d.purchase_returns : Array.isArray(response.purchase_returns) ? response.purchase_returns : [];
      const total = Number(d.total_count ?? d.total_items ?? d.count ?? 0);
      const p = d.pagination || null;
      const normalized = {
        data: list,
        pagination: p ? {
          current_page: Number(p.current_page ?? p.page ?? page),
          limit: Number(p.limit ?? p.per_page ?? limit),
          total_items: Number(p.total_items ?? total),
          total_pages: Number(p.total_pages ?? (Number.isFinite(total) && (limit>0) ? Math.max(1, Math.ceil(total/limit)) : 1))
        } : {
          current_page: Number(page),
          limit: Number(limit),
          total_items: total || list.length,
          total_pages: Number.isFinite(total) && (limit>0) ? Math.max(1, Math.ceil(total/limit)) : 1
        }
      };
      return normalized;
    }
    throw new Error(response.message || 'Failed to fetch purchase returns');
  } catch (error) {
    console.error('Error fetching paginated purchase returns:', error);
    throw error;
  }
};
