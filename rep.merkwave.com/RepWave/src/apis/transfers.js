// src/apis/transfers.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js'; // Import getUserUUID

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Fetches all inventory transfers.
 * @returns {Promise<Array>} A promise that resolves to an array of transfer objects.
 */
export const getAllTransfers = async () => {
  const url = buildApiUrl("transfers/get_all.php");
  try {
    const response = await apiClient.get(url);
    // MODIFIED: Expecting the array directly under response.data
    if (response.status === "success" && Array.isArray(response.data)) {
      return response.data; // Return the array directly
    } else if (response.status === "success" && response.data && Array.isArray(response.data.transfers)) {
      // Fallback for older API responses that might have a 'transfers' key
      return response.data.transfers;
    } else {
      return []; // Return empty array if structure is unexpected
    }
  } catch (error) {
    console.error(`Error fetching all transfers from ${url}:`, error);
    throw error;
  }
};

/**
 * Fetch transfers with server-side pagination and optional filters.
 * @param {{page?:number, limit?:number, status?:string, source_warehouse_id?:number|string, destination_warehouse_id?:number|string}} params
 * @returns {Promise<{data: Array, pagination: {total:number, per_page:number, page:number, total_pages:number}}>} 
 */
export const getTransfersPaginated = async (params = {}) => {
  const { page = 1, limit = 10, status, source_warehouse_id, destination_warehouse_id } = params;
  const urlBase = buildApiUrl('transfers/get_all.php');
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  if (status) qs.set('status', status);
  if (source_warehouse_id) qs.set('source_warehouse_id', String(source_warehouse_id));
  if (destination_warehouse_id) qs.set('destination_warehouse_id', String(destination_warehouse_id));
  const url = `${urlBase}?${qs.toString()}`;

  const response = await apiClient.get(url);
  if (response.status === 'success') {
    const data = Array.isArray(response.data) ? response.data : (response.data?.transfers || []);
    const p = response.pagination || {};
    const pagination = {
      total: Number(p.total ?? p.total_items ?? 0),
      per_page: Number(p.per_page ?? p.limit ?? limit),
      page: Number(p.page ?? p.current_page ?? page),
      total_pages: Number(p.total_pages ?? (Number.isFinite(Number(p.total ?? 0)) && Number(p.per_page ?? limit) ? Math.max(1, Math.ceil(Number(p.total ?? 0)/Number(p.per_page ?? limit))) : 1)),
    };
    return { data, pagination };
  }
  throw new Error(response.message || 'فشل في تحميل بيانات التحويلات');
};

/**
 * Fetches detailed information for a specific inventory transfer.
 * @param {number} transferId - The ID of the transfer to fetch details for.
 * @returns {Promise<Object>} A promise that resolves to the detailed transfer data.
 */
export const getTransferDetails = async (transferId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl(`transfers/get_detail.php?users_uuid=${users_uuid}&transfer_id=${transferId}`);

  const response = await apiClient.get(url);
  if (response.status === "success" && response.data) {
    return response.data; // The detailed transfer data is directly in response.data
  } else {
    throw new Error(response.message || `Failed to retrieve details for transfer with ID ${transferId}.`);
  }
};


/**
 * Adds a new inventory transfer.
 * @param {Object} transferData - The data for the new transfer.
 * @param {number} transferData.source_warehouse_id - The ID of the source warehouse.
 * @param {number} transferData.destination_warehouse_id - The ID of the destination warehouse.
 * @param {string} transferData.status - The status of the transfer (e.g., "Pending", "In Transit", "Completed").
 * @param {string} [transferData.notes] - Optional notes for the transfer.
 * @param {Array<Object>} transferData.items - An array of transfer items, each with inventory_id and quantity.
 * @returns {Promise<string>} A promise that resolves to a success message or rejects with an error.
 */
export const addTransfer = async (transferData) => {
  const url = buildApiUrl("transfers/add.php");
  // Ensure users_uuid is present on the query string as some server endpoints read it from $_GET
  const users_uuid = getUserUUID();
  const urlWithUuid = users_uuid ? `${url}${url.includes('?') ? '&' : '?'}users_uuid=${encodeURIComponent(users_uuid)}` : url;
  const formData = new FormData();

  formData.append('source_warehouse_id', transferData.source_warehouse_id);
  formData.append('destination_warehouse_id', transferData.destination_warehouse_id);
  formData.append('status', transferData.status);
  formData.append('notes', transferData.notes || '');
  
  // Stringify the items array as required by the API
  if (transferData.items && Array.isArray(transferData.items)) {
    formData.append('items', JSON.stringify(transferData.items));
  } else {
    formData.append('items', '[]'); // Send empty array if no items
  }

  try {
  const response = await apiClient.postFormData(urlWithUuid, formData);
    if (response.status === "success") {
      return response.message;
    } else {
      throw new Error(response.message || "Failed to add transfer.");
    }
  } catch (error) {
    console.error(`Error adding transfer to ${url}:`, error);
    throw error;
  }
};

/**
 * Updates an existing inventory transfer's status.
 * @param {number} transferId - The ID of the transfer to update.
 * @param {string} newStatus - The new status for the transfer (e.g., "In Transit", "Completed").
 * @returns {Promise<string>} A promise that resolves to a success message or rejects with an error.
 */
export const updateTransferStatus = async (transferId, newStatus) => {
  const url = buildApiUrl("transfers/update.php");
  const users_uuid_update = getUserUUID();
  const urlWithUuidUpdate = users_uuid_update ? `${url}${url.includes('?') ? '&' : '?'}users_uuid=${encodeURIComponent(users_uuid_update)}` : url;
  const formData = new FormData();
  formData.append('transfer_id', transferId);
  formData.append('status', newStatus);

  try {
  const response = await apiClient.postFormData(urlWithUuidUpdate, formData);
    if (response.status === "success") {
      return response.message;
    } else {
      throw new Error(response.message || "Failed to update transfer status.");
    }
  } catch (error) {
    console.error(`Error updating transfer status for ID ${transferId}:`, error);
    throw error;
  }
};

/**
 * Edits an existing inventory transfer's notes and items.
 * This is only allowed for transfers in 'Pending' status.
 * @param {number} transferId - The ID of the transfer to edit.
 * @param {Object} editData - The data for the transfer edit.
 * @param {string} [editData.notes] - Optional new notes for the transfer.
 * @param {Array<Object>} editData.items - The full new array of transfer items.
 * @returns {Promise<string>} A promise that resolves to a success message or rejects with an error.
 */
export const editTransfer = async (transferId, editData) => {
  const url = buildApiUrl("transfers/edit.php"); // New endpoint
  const users_uuid_edit = getUserUUID();
  const urlWithUuidEdit = users_uuid_edit ? `${url}${url.includes('?') ? '&' : '?'}users_uuid=${encodeURIComponent(users_uuid_edit)}` : url;
  const formData = new FormData();
  formData.append('transfer_id', transferId);
  formData.append('notes', editData.notes || '');
  formData.append('items', JSON.stringify(editData.items || [])); // Ensure items are stringified

  try {
  const response = await apiClient.postFormData(urlWithUuidEdit, formData);
    if (response.status === "success") {
      return response.message;
    } else {
      throw new Error(response.message || "Failed to edit transfer.");
    }
  } catch (error) {
    console.error(`Error editing transfer for ID ${transferId}:`, error);
    throw error;
  }
};
