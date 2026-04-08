// src/apis/categories.js
import { apiClient } from '../utils/apiClient.js'; // Corrected relative path
import { getCompanyName } from '../apis/auth.js'; // Corrected relative path

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllCategories = async () => {
  const url = buildApiUrl("category/get_all.php");
  const response = await apiClient.get(url);
  if (response.status === "success" && Array.isArray(response.data)) {
    return response.data;
  } else {
    throw new Error(response.message || "Failed to retrieve categories.");
  }
};

export const addCategory = async (categoryData) => {
  const url = buildApiUrl("category/add.php");
  const formData = new FormData();
  for (const key in categoryData) {
    formData.append(key, categoryData[key]);
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add category.");
  }
};

export const updateCategory = async (categoryId, categoryData) => {
  const url = buildApiUrl("category/update.php");
  const formData = new FormData();
  formData.append('categories_id', categoryId);
  for (const key in categoryData) {
    formData.append(key, categoryData[key]);
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update category.");
  }
};

export const deleteCategory = async (categoryId) => {
  const url = buildApiUrl("category/delete.php");
  const formData = new FormData();
  formData.append('categories_id', categoryId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete category.");
  }
};
