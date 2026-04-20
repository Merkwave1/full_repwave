// src/apis/client_types.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllClientTypes = async () => {
  const url = buildApiUrl('client_types/get_all.php');
  const response = await apiClient.get(url);
  if (response.status === 'success' && Array.isArray(response.data)) {
    return response.data.map((item) => ({
      ...item,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 0
    }));
  }
  throw new Error(response.message || 'Failed to retrieve client types.');
};

export const addClientType = async (name, sortOrder = 0) => {
  const url = buildApiUrl('client_types/add.php');
  const formData = new FormData();
  formData.append('client_type_name', name);
  formData.append('client_type_sort_order', Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') {
    return {
      ...response.data,
      sort_order: Number.isFinite(Number(response.data?.sort_order)) ? Number(response.data.sort_order) : 0
    };
  }
  throw new Error(response.message || 'Failed to add client type.');
};

export const updateClientType = async (id, name, sortOrder = 0) => {
  const url = buildApiUrl('client_types/update.php');
  const formData = new FormData();
  formData.append('client_type_id', id);
  formData.append('client_type_name', name);
  formData.append('client_type_sort_order', Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') {
    return {
      ...response.data,
      sort_order: Number.isFinite(Number(response.data?.sort_order)) ? Number(response.data.sort_order) : 0
    };
  }
  throw new Error(response.message || 'Failed to update client type.');
};

export const deleteClientType = async (id) => {
  const url = buildApiUrl('client_types/delete.php');
  const formData = new FormData();
  formData.append('client_type_id', id);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') return true;
  throw new Error(response.message || 'Failed to delete client type.');
};
