// src/apis/client_account_statement.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

// Get unified client account statement from backend
export const getClientAccountStatement = async ({ client_id, date_from, date_to }) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  if (!client_id) throw new Error('client_id is required');

  const url = buildApiUrl('reports/client_account_statement.php');
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('client_id', client_id);
  if (date_from) formData.append('date_from', date_from);
  if (date_to) formData.append('date_to', date_to);

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to fetch client account statement');
  }
  return response.data; // { client_id, client_name, totals, entries, filters }
};
