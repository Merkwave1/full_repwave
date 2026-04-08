// src/apis/governorates.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllGovernorates = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.country_id) queryParams.append('country_id', params.country_id);
  if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
  if (params.search) queryParams.append('search', params.search);
  
  const url = buildApiUrl(`governorates/get_all.php${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  const response = await apiClient.get(url);
  
  // Handle new response format: {status: "success", message: "...", data: {...}}
  if (response.status === 'success' && response.data) {
    // Return the governorates array from data.governorates
    return response.data.governorates || [];
  } else {
    throw new Error(response.message || 'Failed to retrieve governorates.');
  }
};

export const addGovernorate = async (governorateData) => {
  const url = buildApiUrl('governorates/add.php');
  const response = await apiClient.post(url, {
    // Send both Arabic and English names used by the UI
    name_ar: governorateData.name_ar,
    name_en: governorateData.name_en,
    code: governorateData.code || null,
    country_id: governorateData.country_id,
    sort_order: governorateData.sort_order || 0,
    is_active: governorateData.is_active !== undefined ? governorateData.is_active : 1
  });
  
  // Handle new response format: {status: "success", message: "...", data: {...}}
  if (response.status === 'success') {
    return response.data;
  }
  throw new Error(response.message || 'Failed to add governorate.');
};

export const updateGovernorate = async (id, governorateData) => {
  const url = buildApiUrl('governorates/update.php');
  const payload = { id };
  
  if (governorateData.name_ar !== undefined) payload.name_ar = governorateData.name_ar;
  if (governorateData.name_en !== undefined) payload.name_en = governorateData.name_en;
  if (governorateData.code !== undefined) payload.code = governorateData.code;
  if (governorateData.country_id !== undefined) payload.country_id = governorateData.country_id;
  if (governorateData.sort_order !== undefined) payload.sort_order = governorateData.sort_order;
  if (governorateData.is_active !== undefined) payload.is_active = governorateData.is_active;
  
  const response = await apiClient.put(url, payload);
  
  // Handle new response format: {status: "success", message: "...", data: {...}}
  if (response.status === 'success') {
    return response.data;
  }
  throw new Error(response.message || 'Failed to update governorate.');
};

export const deleteGovernorate = async (id) => {
  const url = buildApiUrl('governorates/delete.php');
  const response = await apiClient.delete(url, { id });
  
  // Handle new response format: {status: "success", message: "...", data: {...}}
  if (response.status === 'success') {
    return response;
  }
  throw new Error(response.message || 'Failed to delete governorate.');
};
