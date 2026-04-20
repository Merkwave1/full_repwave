// src/apis/packaging_types.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllPackagingTypes = async () => {
  const url = buildApiUrl("packaging_types/get_all.php");
  const response = await apiClient.get(url);
  if (response.status === "success" && Array.isArray(response.data)) {
    return response.data;
  } else {
    throw new Error(response.message || "Failed to retrieve packaging types.");
  }
};

export const addPackagingType = async (packagingTypeData) => {
  const url = buildApiUrl("packaging_types/add.php");
  const formData = new FormData();
  for (const key in packagingTypeData) {
    formData.append(key, packagingTypeData[key]);
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add packaging type.");
  }
};

export const updatePackagingType = async (packagingTypeId, packagingTypeData) => {
  const url = buildApiUrl("packaging_types/update.php");
  const formData = new FormData();
  formData.append('packaging_types_id', packagingTypeId);
  for (const key in packagingTypeData) {
    formData.append(key, packagingTypeData[key]);
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update packaging type.");
  }
};

export const deletePackagingType = async (packagingTypeId) => {
  const url = buildApiUrl("packaging_types/delete.php");
  const formData = new FormData();
  formData.append('packaging_types_id', packagingTypeId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete packaging type.");
  }
};
