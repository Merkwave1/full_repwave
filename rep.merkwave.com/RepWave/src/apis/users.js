// src/apis/users.js
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
 * Fetches all users from the API.
 * Now requests a high limit to retrieve all users if backend supports it.
 * @returns {Promise<Array>} A promise that resolves to an array of user objects.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function getAllUsers() {
  // Request a high limit to ensure all users are fetched.
  // Adjust this limit if you expect more than 1000 users, or if the API has a specific 'all' parameter.
  const url = buildApiUrl("users/get_all.php"); // Added limit parameter
  try {
    const result = await apiClient.get(url);
    if (result.status === "success" && Array.isArray(result.data)) {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to retrieve users.");
    }
  } catch (error) {
    console.error('Error in getAllUsers API call:', error);
    throw error;
  }
}

/**
 * Fetches a single user by ID from the API.
 * @param {string} userId The ID of the user to fetch.
 * @returns {Promise<Object>} A promise that resolves to a single user object.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function getUserById(userId) {
  const url = buildApiUrl(`users/get_by_id.php?users_id=${userId}`); // Assuming API supports get_by_id.php
  try {
    const result = await apiClient.get(url);
    if (result.status === "success" && result.data) {
      return result.data; // Assuming data directly contains the user object
    } else {
      throw new Error(result.message || `Failed to retrieve user with ID ${userId}.`);
    }
  } catch (error) {
    console.error(`Error in getUserById API call for ID ${userId}:`, error);
    throw error;
  }
}

/**
 * Adds a new user via the API with all specified fields.
 * @param {Object} userData The user data including name, email, password, role, phone, nationalId, status, and image.
 * @returns {Promise<Object>} A promise that resolves to the API response.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function addUser(userData) {
  const url = buildApiUrl("users/add.php");
  const formData = new FormData();
  formData.append('users_name', userData.users_name || '');
  formData.append('users_email', userData.users_email || '');
  formData.append('users_password', userData.users_password || '');
  // Normalize role: accept 'admin', 'rep', 'store_keeper', or 'cash'.
  // Support legacy 'sales_rep' by mapping it to 'rep'. Any other value defaults to 'rep'.
  let normalizedRole;
  if (userData.users_role === 'admin') normalizedRole = 'admin';
  else if (userData.users_role === 'sales_rep' || userData.users_role === 'rep') normalizedRole = 'rep';
  else if (userData.users_role === 'store_keeper' || userData.users_role === 'storekeeper') normalizedRole = 'store_keeper';
  else if (userData.users_role === 'cash') normalizedRole = 'cash';
  else normalizedRole = 'rep';
  formData.append('users_role', normalizedRole);
  formData.append('users_phone', userData.users_phone || '');
  formData.append('users_national_id', userData.users_national_id || '');
  formData.append('users_status', userData.users_status ?? 1); // Default to 1

  if (userData.users_image) {
    formData.append('users_image', userData.users_image); // Append File object
  }

  try {
    const result = await apiClient.postFormData(url, formData);
    if (result.status === "success") {
      return result;
    } else {
      throw new Error(result.message || "Failed to add user.");
    }
  } catch (error) {
    console.error('Error in addUser API call:', error);
    throw error;
  }
}

/**
 * Updates an existing user via the API with all specified fields.
 * @param {Object} userData The user data including id, name, email, password (optional), role, phone, nationalId, status, and image.
 * @returns {Promise<Object>} A promise that resolves to the API response.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function updateUser(userData) {
  const url = buildApiUrl("users/update.php");
  const formData = new FormData();
  formData.append('users_id', userData.users_id); // Required for update
  formData.append('users_name', userData.users_name || '');
  formData.append('users_email', userData.users_email || '');
  if (userData.users_password) { // Password might be optional for update
    formData.append('users_password', userData.users_password);
  }
  // Normalize role on update: accept 'admin', 'rep', 'store_keeper', or 'cash'.
  let normalizedUpdateRole;
  if (userData.users_role === 'admin') normalizedUpdateRole = 'admin';
  else if (userData.users_role === 'sales_rep' || userData.users_role === 'rep') normalizedUpdateRole = 'rep';
  else if (userData.users_role === 'store_keeper' || userData.users_role === 'storekeeper') normalizedUpdateRole = 'store_keeper';
  else if (userData.users_role === 'cash') normalizedUpdateRole = 'cash';
  else normalizedUpdateRole = 'rep';
  formData.append('users_role', normalizedUpdateRole);
  formData.append('users_phone', userData.users_phone || '');
  formData.append('users_national_id', userData.users_national_id || '');
  formData.append('users_status', userData.users_status ?? 1);

  if (userData.users_image) {
    // If it's a File object, append it. If it's a string (existing URL), don't re-upload.
    // Backend should handle if image field is missing or empty on update.
    if (userData.users_image instanceof File) {
      formData.append('users_image', userData.users_image);
    }
    // If you need to explicitly clear an image, you might send a flag like 'clear_image': true
  }

  try {
    const result = await apiClient.postFormData(url, formData);
    if (result.status === "success") {
      return result;
    } else {
      throw new Error(result.message || "Failed to update user.");
    }
  } catch (error) {
    console.error('Error in updateUser API call:', error);
    throw error;
  }
}

/**
 * Deletes a user via the API.
 * @param {number} userId The ID of the user to delete.
 * @returns {Promise<Object>} A promise that resolves to the API response.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function deleteUser(userId) {
  const url = buildApiUrl("users/delete.php");
  const formData = new FormData();
  formData.append('users_id', userId);

  try {
    const result = await apiClient.postFormData(url, formData);
    if (result.status === "success") {
      return result;
    } else {
      // Normalize backend message for FK constraint if present
      const rawMsg = result.message || '';
      const fkPatterns = [
        'foreign key constraint fails',
        'Cannot delete or update a parent row',
        'constraint fails'
      ];
      const isFk = fkPatterns.some(p => rawMsg.toLowerCase().includes(p));
      if (isFk) {
        throw new Error('لا يمكن حذف المستخدم لأنه مرتبط بسجلات أخرى (عملاء / طلبات). قم بإعادة إسناد أو حذف السجلات المرتبطة أولاً.');
      }
      throw new Error(rawMsg || "Failed to delete user.");
    }
  } catch (error) {
    console.error('Error in deleteUser API call:', error);
    // Intercept foreign key errors coming from network layer too
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('foreign key') || msg.includes('parent row')) {
      throw new Error('لا يمكن حذف المستخدم: مرتبط بعملاء أو بيانات أخرى.');
    }
    throw error;
  }
}

/**
 * Fetches all representatives (users with user_type = 'representative') from the API.
 * @returns {Promise<Array>} A promise that resolves to an array of representative user objects.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function getRepresentatives() {
  const url = buildApiUrl("users/get_all.php?user_type=representative&limit=1000");
  try {
    const result = await apiClient.get(url);
    if (result.status === "success" && Array.isArray(result.data)) {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to retrieve representatives.");
    }
  } catch (error) {
    console.error('Error in getRepresentatives API call:', error);
    throw error;
  }
}
