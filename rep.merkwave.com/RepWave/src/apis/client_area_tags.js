// src/apis/client_area_tags.js
import { apiClient } from '../utils/apiClient.js'; // Corrected path
import { getCompanyName } from '../apis/auth.js'; // Corrected path

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllClientAreaTags = async () => {
  const url = buildApiUrl("client_area_tags/get_all.php");
  const response = await apiClient.get(url);
  if (response.status === "success" && Array.isArray(response.data)) {
    return response.data.map((item) => ({
      ...item,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 0
    }));
  } else {
    throw new Error(response.message || "Failed to retrieve client area tags.");
  }
};

export const addClientAreaTag = async (name, sortOrder = 0) => {
  const url = buildApiUrl("client_area_tags/add.php");
  const formData = new FormData();
  formData.append('client_area_tag_name', name);
  formData.append('client_area_tag_sort_order', Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') {
    return {
      ...response.data,
      sort_order: Number.isFinite(Number(response.data?.sort_order)) ? Number(response.data.sort_order) : 0
    };
  }
  throw new Error(response.message || 'Failed to add client area tag.');
};

export const updateClientAreaTag = async (id, name, sortOrder = 0) => {
  const url = buildApiUrl("client_area_tags/update.php");
  const formData = new FormData();
  formData.append('client_area_tag_id', id);
  formData.append('client_area_tag_name', name);
  formData.append('client_area_tag_sort_order', Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') {
    return {
      ...response.data,
      sort_order: Number.isFinite(Number(response.data?.sort_order)) ? Number(response.data.sort_order) : 0
    };
  }
  throw new Error(response.message || 'Failed to update client area tag.');
};

export const deleteClientAreaTag = async (id) => {
  const url = buildApiUrl("client_area_tags/delete.php");
  const formData = new FormData();
  formData.append('client_area_tag_id', id);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') {
    return true;
  }
  throw new Error(response.message || 'Failed to delete client area tag.');
};
