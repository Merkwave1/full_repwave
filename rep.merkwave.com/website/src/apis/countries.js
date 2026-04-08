// src/apis/countries.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllCountries = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
  if (params.search) queryParams.append('search', params.search);
  
  const url = buildApiUrl(`countries/get_all.php${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  const response = await apiClient.get(url);
  
  // Handle new response format: {status: "success", message: "...", data: {countries: [...], count: N}}
  if (response.status === 'success' && response.data) {
    // Return the countries array from data.countries
    return response.data.countries || [];
  } else {
    throw new Error(response.message || 'Failed to retrieve countries.');
  }
};

export const getAllCountriesWithGovernorates = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
  if (params.search) queryParams.append('search', params.search);
  
  const url = buildApiUrl(`countries/get_all_with_governorates.php${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  const response = await apiClient.get(url);
  
  // Handle new response format: {status: "success", message: "...", data: {countries: [...], count: N}}
  if (response.status === 'success' && response.data) {
    // Return the countries array with nested governorates
    return response.data.countries || [];
  } else {
    throw new Error(response.message || 'Failed to retrieve countries with governorates.');
  }
};

export const addCountry = async (countryData) => {
  const url = buildApiUrl('countries/add.php');
  const response = await apiClient.post(url, {
    // The UI uses `name_ar` and `name_en`. Send both so backend can validate and store properly.
    name_ar: countryData.name_ar,
    name_en: countryData.name_en,
    code: countryData.code || null,
    sort_order: countryData.sort_order || 0,
    is_active: countryData.is_active !== undefined ? countryData.is_active : 1
  });
  
  // Handle new response format: {status: "success", message: "...", data: {...}}
  if (response.status === 'success') {
    return response.data;
  }
  throw new Error(response.message || 'Failed to add country.');
};

export const updateCountry = async (id, countryData) => {
  const url = buildApiUrl('countries/update.php');
  const payload = { id };
  
  if (countryData.name_ar !== undefined) payload.name_ar = countryData.name_ar;
  if (countryData.name_en !== undefined) payload.name_en = countryData.name_en;
  if (countryData.code !== undefined) payload.code = countryData.code;
  if (countryData.sort_order !== undefined) payload.sort_order = countryData.sort_order;
  if (countryData.is_active !== undefined) payload.is_active = countryData.is_active;
  
  const response = await apiClient.put(url, payload);
  
  // Handle new response format: {status: "success", message: "...", data: {...}}
  if (response.status === 'success') {
    return response.data;
  }
  throw new Error(response.message || 'Failed to update country.');
};

export const deleteCountry = async (id) => {
  const url = buildApiUrl('countries/delete.php');
  const response = await apiClient.delete(url, { id });
  
  // Handle new response format: {status: "success", message: "...", data: {...}}
  if (response.status === 'success') {
    return response;
  }
  throw new Error(response.message || 'Failed to delete country.');
};
