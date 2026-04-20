// src/apis/userSafes.js
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
 * Get all safes assigned to a specific user
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} Array of safe assignments
 */
export const getUserSafes = async (userId) => {
  try {
    const url = buildApiUrl(`user_safes/get_user_safes.php?user_id=${userId}`);
    const response = await apiClient.get(url);
    
    if (response.status === "success" && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الخزن المخصصة للمستخدم');
    }
  } catch (error) {
    console.error('Error fetching user safes:', error);
    throw new Error(error.message || 'فشل في جلب الخزن المخصصة للمستخدم');
  }
};

/**
 * Update safes assigned to a user
 * @param {number} userId - The user ID
 * @param {Array<number>} safeIds - Array of safe IDs to assign
 * @returns {Promise<Object>} Response from server
 */
export const updateUserSafes = async (userId, safeIds) => {
  try {
    const url = buildApiUrl('user_safes/update_user_safes.php');
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('safe_ids', JSON.stringify(safeIds));
    
    const response = await apiClient.postFormData(url, formData);
    
    if (response.status === "success") {
      return response;
    } else {
      throw new Error(response.message || 'فشل في تحديث الخزن المخصصة للمستخدم');
    }
  } catch (error) {
    console.error('Error updating user safes:', error);
    throw new Error(error.message || 'فشل في تحديث الخزن المخصصة للمستخدم');
  }
};
