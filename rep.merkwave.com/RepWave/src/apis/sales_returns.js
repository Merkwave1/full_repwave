// src/apis/sales_returns.js
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
 * Add a new sales return
 */
export const addSalesReturn = async (returnData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("sales_returns/add.php");
  const formData = new FormData();
  
  // Add user UUID
  formData.append('users_uuid', users_uuid);
  
  // Add return data matching your backend structure
  formData.append('returns_client_id', returnData.client_id);
  if (returnData.order_id) {
    formData.append('returns_sales_order_id', returnData.order_id);
  }
  formData.append('returns_date', returnData.return_date);
  formData.append('returns_status', returnData.status || 'Processed');
  
  if (returnData.reason) {
    formData.append('returns_reason', returnData.reason);
  }
  if (returnData.notes) {
    formData.append('returns_notes', returnData.notes);
  }
  if (returnData.total_amount) {
    formData.append('returns_total_amount', returnData.total_amount);
  }
  if (returnData.visit_id) {
    formData.append('sales_returns_visit_id', returnData.visit_id);
  }
  if (returnData.manual_discount != null) {
    formData.append('manual_discount', returnData.manual_discount);
  }
  
  // Add return items
  if (returnData.items && returnData.items.length > 0) {
    formData.append('items', JSON.stringify(returnData.items));
  }

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to add sales return');
  }
  return response;
};

/**
 * Update an existing sales return
 */
export const updateSalesReturn = async (id, returnData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("sales_returns/update.php");
  const formData = new FormData();
  
  // Resolve return ID from args/payload and validate
  const rid = id ?? returnData?.returns_id ?? returnData?.sales_returns_id ?? returnData?.id;
  if (!rid) throw new Error('Sales Return ID is required.');

  // Add user UUID and return ID
  formData.append('users_uuid', users_uuid);
  formData.append('returns_id', String(rid));
  
  // Append only defined fields to avoid sending 'undefined'
  if (returnData?.client_id != null) {
    formData.append('returns_client_id', String(returnData.client_id));
  }
  if (Object.prototype.hasOwnProperty.call(returnData || {}, 'order_id')) {
    // If you need to clear order link, pass order_id as null/'' from caller
    if (returnData.order_id != null && returnData.order_id !== '') {
      formData.append('returns_sales_order_id', String(returnData.order_id));
    } else {
      // To explicitly clear, still send the key as empty string so backend sets NULL
      formData.append('returns_sales_order_id', '');
    }
  }
  if (returnData?.return_date) {
    formData.append('returns_date', returnData.return_date);
  }
  if (returnData?.status) {
    formData.append('returns_status', returnData.status);
  }
  if (Object.prototype.hasOwnProperty.call(returnData || {}, 'reason')) {
    formData.append('returns_reason', returnData.reason ?? '');
  }
  if (Object.prototype.hasOwnProperty.call(returnData || {}, 'notes')) {
    formData.append('returns_notes', returnData.notes ?? '');
  }
  if (Object.prototype.hasOwnProperty.call(returnData || {}, 'total_amount')) {
    formData.append('returns_total_amount', String(returnData.total_amount ?? ''));
  }
  if (Object.prototype.hasOwnProperty.call(returnData || {}, 'visit_id')) {
    if (returnData.visit_id != null && returnData.visit_id !== '') {
      formData.append('sales_returns_visit_id', String(returnData.visit_id));
    } else {
      formData.append('sales_returns_visit_id', '');
    }
  }
  if (Object.prototype.hasOwnProperty.call(returnData || {}, 'manual_discount')) {
    formData.append('manual_discount', String(returnData.manual_discount ?? ''));
  }
  
  // Add return items (replace existing)
  if (Array.isArray(returnData?.items) && returnData.items.length > 0) {
    formData.append('items', JSON.stringify(returnData.items));
  }

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to update sales return');
  }
  return response;
};

/**
 * Delete a sales return
 */
export const deleteSalesReturn = async (id) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("sales_returns/delete.php");
  const formData = new FormData();
  
  formData.append('users_uuid', users_uuid);
  formData.append('returns_id', id);

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to delete sales return');
  }
  return response;
};

/**
 * Get all sales returns (uses sales_returns/get_all.php)
 */
export const getAllSalesReturns = async (filters = {}) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  // Use the new endpoint that returns all (admin: all, reps: own)
  let url = buildApiUrl("sales_returns/get_all.php");

  // Add query parameters
  const params = new URLSearchParams();
  params.append('users_uuid', users_uuid);

  if (filters.client_id) params.append('client_id', filters.client_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.search) params.append('search', filters.search);
  if (filters.sales_order_id) params.append('sales_order_id', filters.sales_order_id);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  url += `?${params.toString()}`;

  const response = await apiClient.get(url);
  if (response.status === "success" && response.data) {
    // Backend returns { pagination, data }
    return response.data;
  } else {
    throw new Error(response.message || 'Failed to fetch sales returns');
  }
};

/**
 * Get sales return details (still uses get.php?id=)
 */
export const getSalesReturnDetails = async (id) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  let url = buildApiUrl("sales_returns/get.php");
  url += `?users_uuid=${users_uuid}&id=${id}`;

  const response = await apiClient.get(url);
  if (response.status === "success" && response.data) {
    return response.data;
  } else {
    throw new Error(response.message || 'Failed to fetch sales return details');
  }
};
