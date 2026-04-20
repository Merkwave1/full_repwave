// src/apis/base_units.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllBaseUnits = async () => {
  const url = buildApiUrl("base_units/get_all.php");
  const response = await apiClient.get(url);
  if (response.status === "success" && Array.isArray(response.data)) {
    return response.data;
  } else {
    throw new Error(response.message || "Failed to retrieve base units.");
  }
};

export const addBaseUnit = async (baseUnitName) => {
  const url = buildApiUrl("base_units/add.php");
  const formData = new FormData();
  formData.append('base_units_name', baseUnitName);

  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add base unit.");
  }
};

export const updateBaseUnit = async (unitId, baseUnitName) => {
  const url = buildApiUrl("base_units/update.php");
  const formData = new FormData();
  formData.append('base_units_id', unitId);
  formData.append('base_units_name', baseUnitName);

  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update base unit.");
  }
};

export const deleteBaseUnit = async (unitId) => {
  const url = buildApiUrl("base_units/delete.php");
  const formData = new FormData();
  formData.append('base_units_id', unitId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete base unit.");
  }
};
