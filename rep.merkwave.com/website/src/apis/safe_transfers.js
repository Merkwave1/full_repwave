// src/apis/safe_transfers.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getSafeTransfers = async (filters = {}) => {
  try {
    let queryParams = '';
    if (filters.safe_id) {
      queryParams += `?safe_id=${filters.safe_id}`;
    }
    if (filters.user_id) {
      queryParams += queryParams ? `&user_id=${filters.user_id}` : `?user_id=${filters.user_id}`;
    }
    
    const url = buildApiUrl(`safe_transfers/get_all.php${queryParams}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success") {
      return { transfers: response.data || [] };
    } else {
      throw new Error(response.message || "Failed to retrieve safe transfers.");
    }
  } catch (error) {
    console.error('Error fetching safe transfers:', error);
    throw error;
  }
};

// Server-side paginated fetch
export const getSafeTransfersPaginated = async ({ safeId, userId, page = 1, limit = 10, dateRange, outDestSafeId, inDestSafeId, status, transferId, search } = {}) => {
  try {
    const params = new URLSearchParams();
    if (safeId) params.set('safe_id', safeId);
    if (userId) params.set('user_id', userId);
    if (dateRange) params.set('date_range', dateRange);
    if (outDestSafeId) params.set('out_dest_safe_id', outDestSafeId);
    if (inDestSafeId) params.set('in_dest_safe_id', inDestSafeId);
    if (status) params.set('status', status);
    if (transferId) params.set('transfer_id', transferId);
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('limit', limit);
    const url = buildApiUrl(`safe_transfers/get_all.php?${params.toString()}`);
    const response = await apiClient.get(url);
    if (response.status === 'success') {
      return {
        data: response.data || [],
        pagination: response.pagination || null,
      };
    }
    throw new Error(response.message || 'Failed to retrieve paginated safe transfers.');
  } catch (error) {
    console.error('Error fetching paginated safe transfers:', error);
    throw error;
  }
};

export const getSafeTransferDetails = async (transferId) => {
  try {
    const url = buildApiUrl(`safe_transfers/get_detail.php?id=${transferId}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to retrieve transfer details.");
    }
  } catch (error) {
    console.error('Error fetching transfer details:', error);
    throw error;
  }
};

export const addSafeTransfer = async (transferData) => {
  try {
    const uuid = getUserUUID();
    const url = buildApiUrl("safe_transfers/add.php");
    const response = await apiClient.post(url, {
      ...transferData,
      users_uuid: uuid
    });
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to add safe transfer.");
    }
  } catch (error) {
    console.error('Error adding safe transfer:', error);
    throw error;
  }
};
