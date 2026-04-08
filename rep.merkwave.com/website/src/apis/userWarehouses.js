// src/apis/userWarehouses.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!API_BASE_URL || !companyName) {
    throw new Error("API_BASE_URL or companyName is missing for API call.");
  }
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Get all warehouses assigned to a specific user
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} Array of warehouse assignments
 */
export const getUserWarehouses = async (userId) => {
  try {
    const url = buildApiUrl(`user_warehouses/get_user_warehouses.php?user_id=${userId}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success" && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المخازن المخصصة للمستخدم');
    }
  } catch (error) {
    console.error('Error fetching user warehouses:', error);
    throw new Error(error.message || 'فشل في جلب المخازن المخصصة للمستخدم');
  }
};

/**
 * Update warehouses assigned to a user
 * @param {number} userId - The user ID
 * @param {Array<number>} warehouseIds - Array of warehouse IDs to assign
 * @returns {Promise<Object>} Response from server
 */
export const updateUserWarehouses = async (userId, warehouseIds) => {
  try {
    const url = buildApiUrl('user_warehouses/update_user_warehouses.php');
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('warehouse_ids', JSON.stringify(warehouseIds));
    
    const response = await apiClient.postFormData(url, formData);
    
    if (response.status === "success") {
      return response;
    } else {
      throw new Error(response.message || 'فشل في تحديث المخازن المخصصة للمستخدم');
    }
  } catch (error) {
    console.error('Error updating user warehouses:', error);
    throw new Error(error.message || 'فشل في تحديث المخازن المخصصة للمستخدم');
  }
};
