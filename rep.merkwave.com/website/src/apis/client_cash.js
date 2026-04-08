import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getClientCashMovements = async (filters = {}) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl('client_cash/get_all.php');
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);

  if (filters.type && filters.type !== 'all') {
    formData.append('type', filters.type);
  }
  if (filters.client_id) {
    formData.append('client_id', filters.client_id);
  }
  if (filters.payment_method_id) {
    formData.append('payment_method_id', filters.payment_method_id);
  }
  if (filters.safe_id) {
    formData.append('safe_id', filters.safe_id);
  }
  if (filters.from_date) {
    formData.append('from_date', filters.from_date);
  }
  if (filters.to_date) {
    formData.append('to_date', filters.to_date);
  }
  if (typeof filters.search === 'string' && filters.search.trim() !== '') {
    formData.append('search', filters.search.trim());
  }
  if (filters.page) {
    formData.append('page', String(filters.page));
  }
  if (filters.limit) {
    formData.append('limit', String(filters.limit));
  }

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to fetch client cash movements');
  }
  return response;
};

export default getClientCashMovements;
