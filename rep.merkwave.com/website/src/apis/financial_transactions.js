// src/apis/financial_transactions.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getFinancialTransactions = async (params = {}) => {
  try {
    const uuid = getUserUUID();
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('users_uuid', uuid);
    
    // Pagination
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    // Search and filters
    if (params.search) queryParams.append('search', params.search);
    if (params.transaction_type) queryParams.append('transaction_type', params.transaction_type);
    if (params.payment_method_id) queryParams.append('payment_method_id', params.payment_method_id);
    if (params.safe_id) queryParams.append('safe_id', params.safe_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    
    const url = buildApiUrl(`financial_transactions/get_all.php?${queryParams.toString()}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to retrieve financial transactions.");
    }
  } catch (error) {
    console.error('Error fetching financial transactions:', error);
    throw error;
  }
};

export const getTransactionsSummary = async (params = {}) => {
  try {
    const uuid = getUserUUID();
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('users_uuid', uuid);
    
    // Filters for summary
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.safe_id) queryParams.append('safe_id', params.safe_id);
    
    const url = buildApiUrl(`financial_transactions/get_summary.php?${queryParams.toString()}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to retrieve transactions summary.");
    }
  } catch (error) {
    console.error('Error fetching transactions summary:', error);
    throw error;
  }
};
