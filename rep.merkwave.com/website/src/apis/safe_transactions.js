// src/apis/safe_transactions.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getSafeTransactions = async (safeId) => {
  try {
    const url = buildApiUrl(`safe_transactions/get_all.php?safe_id=${safeId}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success") {
      return { transactions: response.data || [] };
    } else {
      throw new Error(response.message || "Failed to retrieve safe transactions.");
    }
  } catch (error) {
    console.error('Error fetching safe transactions:', error);
    throw error;
  }
};

// Server-side paginated fetch
export const getSafeTransactionsPaginated = async ({ safeId, page = 1, limit = 10 }) => {
  if (!safeId) throw new Error('safeId is required');
  try {
    const url = buildApiUrl(`safe_transactions/get_all.php?safe_id=${safeId}&page=${page}&limit=${limit}`);
    const response = await apiClient.get(url);
    if (response.status === 'success') {
      return {
        data: response.data || [],
        pagination: response.pagination || null,
      };
    }
    throw new Error(response.message || 'Failed to retrieve paginated safe transactions.');
  } catch (error) {
    console.error('Error fetching paginated safe transactions:', error);
    throw error;
  }
};

export const addSafeTransaction = async (transactionData) => {
  try {
    const uuid = getUserUUID();
    const url = buildApiUrl("safe_transactions/add.php");
    const response = await apiClient.post(url, {
      ...transactionData,
      payment_method_id: transactionData.payment_method_id || 1, // Default to Cash if not provided
      users_uuid: uuid
    });
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to add safe transaction.");
    }
  } catch (error) {
    console.error('Error adding safe transaction:', error);
    throw error;
  }
};

export const getSafeTransactionDetails = async (transactionId) => {
  try {
    const url = buildApiUrl(`safe_transactions/get_detail.php?id=${transactionId}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to retrieve transaction details.");
    }
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    throw error;
  }
};

export const updateTransactionStatus = async (transactionId, status) => {
  try {
    const uuid = getUserUUID();
  const url = buildApiUrl('safe_transactions/update_status.php');
  const formData = new FormData();
  formData.append('transaction_id', transactionId);
  formData.append('status', status);
  formData.append('users_uuid', uuid);
  const response = await apiClient.postFormData(url, formData);
    
  if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to update transaction status.");
    }
  } catch (error) {
    console.error('Error updating transaction status:', error);
    throw error;
  }
};
