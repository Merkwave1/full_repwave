// src/apis/notifications.js
import { apiClient } from '../utils/apiClient';
import { getCompanyName } from './auth.js';

/**
 * Get notifications for current user
 * @param {Object} params - Query parameters
 * @param {number|null} params.is_read - Filter by read status (0=unread, 1=read, null=all)
 * @param {number} params.page - Page number for pagination (1-based)
 * @returns {Promise<Object>} API response with notifications and unread count
 */
export const getNotifications = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.is_read !== undefined && params.is_read !== null) {
    queryParams.append('is_read', params.is_read);
  }
  if (params.page) {
    queryParams.append('page', params.page);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `notifications/get_all_admin.php?${queryString}`
    : 'notifications/get_all_admin.php';

  const response = await apiClient.get(endpoint);
  return response.data;
};

/**
 * Mark notification(s) as read
 * @param {Object} params - Parameters
 * @param {number|null} params.notification_id - Specific notification ID to mark as read
 * @param {boolean} params.mark_all_read - Mark all notifications as read
 * @returns {Promise<Object>} API response
 */
export const markNotificationRead = async (params = {}) => {
  // Prepare JSON data
  const requestData = {};
  
  // Add users_uuid
  const userDataRaw = localStorage.getItem('userData');
  if (userDataRaw) {
    const userData = JSON.parse(userDataRaw);
    if (userData.users_uuid) {
      requestData.users_uuid = userData.users_uuid;
    }
  }
  
  if (params.notification_id) {
    requestData.notification_id = params.notification_id;
  }
  if (params.mark_all_read) {
    requestData.mark_all_read = true;
  }

  
  try {
    const companyName = getCompanyName();
    if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
    
    // Use fetch directly to bypass any apiClient issues
    const response = await fetch(`${API_BASE_URL}${companyName}/notifications/mark_read_admin.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('🔔 Failed to parse JSON:', e);
      throw new Error(`Invalid JSON response: ${text}`);
    }
    
    return data;
  } catch (error) {
    console.error('🔔 markNotificationRead API error:', error);
    throw error;
  }
};

/**
 * Get unread notifications count only
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async () => {
  const response = await getNotifications({ is_read: 0, page: 1 });
  return response.data?.unread_count || 0;
};
