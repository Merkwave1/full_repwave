import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js'; // Import getUserUUID

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllProducts = async () => {
  const url = buildApiUrl("product/get_all.php");
  const response = await apiClient.get(url);
  if (response.status === "success" && response.data && Array.isArray(response.data.products)) {
    return response.data;
  } else {
    throw new Error(response.message || "Failed to retrieve products.");
  }
};

export const getAppProducts = async (forceApiRefresh = false) => {
  const cacheKey = 'appProducts';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.error("Failed to parse cached products data:", e);
      localStorage.removeItem(cacheKey);
    }
  }

  try {
    const response = await getAllProducts();
    if (response && Array.isArray(response.products)) {
      localStorage.setItem(cacheKey, JSON.stringify(response.products));
      return response.products;
    } else {
      throw new Error(response.message || "API response did not contain products array.");
    }
  } catch (error) {
    console.error('Error fetching products for caching:', error);
    throw error;
  }
};

/**
 * Adds a new product with its variants and images.
 * @param {FormData} productFormData - The FormData object, pre-built by the form component.
 * It should contain all product fields, variant data, and image files.
 */
export const addProduct = async (productFormData) => {
  // Updated to use add_with_variants.php for full variant and tax support
  const url = buildApiUrl("product/add_with_variants.php");
  
  // The productFormData is already prepared by the form, so we just send it.
  const response = await apiClient.postFormData(url, productFormData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add product.");
  }
};

/**
 * Updates an existing product.
 * @param {number} productId - The ID of the product to update.
 * @param {FormData} productFormData - The FormData object from the update form.
 */
export const updateProduct = async (productId, productFormData) => {
  const url = buildApiUrl("product/update.php");
  
  // The form should prepare the FormData. We just need to ensure the ID is set.
  productFormData.append('products_id', productId);

  const response = await apiClient.postFormData(url, productFormData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update product.");
  }
};

export const deleteProduct = async (productId) => {
  const url = buildApiUrl("product/delete.php");
  const formData = new FormData();
  formData.append('products_id', productId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete product.");
  }
};

export const getProductReports = async (reportType = 'overview') => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  // Use the comprehensive reports endpoint
  let url = buildApiUrl(`products/reports_comprehensive.php?users_uuid=${users_uuid}&report_type=${reportType}`);

  
  const response = await apiClient.get(url);
  
  
  if (response.status === "success" && response.data) {
    return response.data;
  } else {
    throw new Error(response.message || `Failed to retrieve ${reportType} reports.`);
  }
};

export const getInterestedProductClients = async (productId) => {
  if (!productId) throw new Error('Product ID is required.');

  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl(`products/interested_product_clients.php?products_id=${productId}&users_uuid=${users_uuid}`);
  const response = await apiClient.get(url);

  if (response.status === 'success' && response.data) {
    return response.data;
  }

  throw new Error(response.message || 'Failed to retrieve interested clients for this product.');
};
