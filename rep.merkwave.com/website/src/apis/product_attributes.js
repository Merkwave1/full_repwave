// src/apis/product_attributes.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllProductAttributesWithValues = async () => {
  const url = buildApiUrl("product_attributes/get_all_with_values.php");
  const response = await apiClient.get(url);
  if (response.status === "success" && Array.isArray(response.data)) {
    return response.data;
  } else {
    throw new Error(response.message || "Failed to retrieve product attributes with values.");
  }
};

export const addProductAttributeWithValues = async (attributeName, attributeValues) => {
  const url = buildApiUrl("product_attributes/add_with_values.php");
  const formData = new FormData();
  formData.append('attribute_name', attributeName);

  // The backend expects a simple JSON array of strings, so we pass it directly.
  formData.append('attribute_values', JSON.stringify(attributeValues)); 

  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add product attribute with values.");
  }
};

export const updateProductAttributeWithValues = async (attributeId, attributeName, attributeValues) => {
  const url = buildApiUrl("product_attributes/update_with_values.php");
  const formData = new FormData();
  formData.append('attribute_id', attributeId);
  formData.append('attribute_name', attributeName);

  // The backend expects a simple JSON array of strings, so we pass it directly.
  formData.append('attribute_values', JSON.stringify(attributeValues));

  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update product attribute with values.");
  }
};

export const deleteProductAttribute = async (attributeId) => {
  const url = buildApiUrl("product_attributes/delete.php");
  const formData = new FormData();
  formData.append('attribute_id', attributeId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete product attribute.");
  }
};
