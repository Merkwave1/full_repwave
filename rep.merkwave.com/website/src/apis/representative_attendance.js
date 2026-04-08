// src/apis/representative_attendance.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from './auth.js';

/**
 * Build API URL for generic endpoints
 */
function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Build base URL for representative reports with common auth params (ADMIN ENDPOINTS)
 */
function buildReportsUrl(params = {}) {
  const userDataRaw = localStorage.getItem('userData');
  if (!userDataRaw) throw new Error('userData not found in localStorage');

  let users_uuid;
  try {
    const userData = JSON.parse(userDataRaw);
    users_uuid = userData.users_uuid;
  } catch (e) {
    console.error('❌ Error parsing userData JSON:', e);
    throw new Error('userData in localStorage is not valid JSON');
  }
  if (!users_uuid) throw new Error('users_uuid not found in userData');

  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');

  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');

  const url = new URL(`${API_BASE_URL}${companyName}/reports/representatives.php`);
  url.searchParams.set('users_uuid', users_uuid);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

/**
 * Get overview statistics for all representatives (ADMIN)
 * @returns {Promise<Object>} Overview statistics
 */
export async function getRepresentativesOverview() {
  try {
    const url = buildReportsUrl({ section: 'overview' });
    const response = await apiClient.get(url);
    
    if (response.status === 'success') {
      return response.data;
    }
    throw new Error(response.message || 'Failed to retrieve overview statistics');
  } catch (error) {
    console.error('Error in getRepresentativesOverview:', error);
    throw error;
  }
}

/**
 * Get attendance history for all representatives (ADMIN)
 * @param {Object} params - Query parameters
 * @param {number} params.userId - Optional: Filter by specific user ID
 * @param {string} params.status - Optional: Filter by attendance status (active, completed, break, ended)
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} Attendance records with pagination
 */
export async function getAllRepresentativesAttendance({ userId, status, startDate, endDate, page = 1, limit = 100 } = {}) {
  try {
    const params = {
      section: 'attendance',
      page: String(page),
      limit: String(limit)
    };
    
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (userId) params.user_id = String(userId);
    if (status) params.status = status;
    
    const url = buildReportsUrl(params);
    const response = await apiClient.get(url);
    
    if (response.status === 'success') {
      return {
        items: response.data?.items || [],
        pagination: response.data?.pagination || { page, limit, total: 0 }
      };
    }
    throw new Error(response.message || 'Failed to retrieve attendance data');
  } catch (error) {
    console.error('Error in getAllRepresentativesAttendance:', error);
    throw error;
  }
}

/**
 * Get break logs for a specific attendance record (ADMIN)
 * @param {Object} params - Query parameters
 * @param {number} params.attendanceId - Attendance ID
 * @returns {Promise<Array>} Break logs
 */
export async function getBreakLogs({ attendanceId } = {}) {
  try {
    if (!attendanceId) {
      throw new Error('Attendance ID is required');
    }
    
    const params = {
      section: 'break_logs',
      attendance_id: String(attendanceId)
    };
    
    const url = buildReportsUrl(params);
    const response = await apiClient.get(url);
    
    if (response.status === 'success') {
      return response.data?.break_logs || [];
    }
    throw new Error(response.message || 'Failed to retrieve break logs');
  } catch (error) {
    console.error('Error in getBreakLogs:', error);
    throw error;
  }
}

/**
 * Get last location for all representatives from rep_location_tracking (ADMIN)
 * @returns {Promise<Object>} Last location for each representative
 */
export async function getRepresentativesLastLocation() {
  try {
    const url = buildReportsUrl({ section: 'location' });
    const response = await apiClient.get(url);
    
    if (response.status === 'success') {
      return {
        items: response.data?.items || [],
        total: response.data?.total || 0
      };
    }
    throw new Error(response.message || 'Failed to retrieve representatives location');
  } catch (error) {
    console.error('Error in getRepresentativesLastLocation:', error);
    throw error;
  }
}

/**
 * Get location history for a specific representative from rep_location_tracking (ADMIN)
 * @param {Object} params - Query parameters
 * @param {number} params.userId - Representative user ID
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} Location history with pagination
 */
export async function getRepLocationHistory({ userId, timeRange, startDate, endDate, page = 1, limit = 100 } = {}) {
  try {
    if (!userId) {
      throw new Error('User ID is required for location history');
    }
    
    const params = {
      section: 'location_history',
      user_id: String(userId),
      page: String(page),
      limit: String(limit)
    };
    
    // Use time_range for preset ranges (24h, week, month) OR custom dates
    if (timeRange) {
      params.time_range = timeRange; // API will handle datetime filtering
    } else if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    
    const url = buildReportsUrl(params);
    const response = await apiClient.get(url);
    
    if (response.status === 'success') {
      return {
        items: response.data?.items || [],
        pagination: response.data?.pagination || { page, limit, total: 0 }
      };
    }
    throw new Error(response.message || 'Failed to retrieve location history');
  } catch (error) {
    console.error('Error in getRepLocationHistory:', error);
    throw error;
  }
}

/**
 * Get representative location history from visits
 * @param {Object} params - Query parameters
 * @param {number} params.repId - Representative ID
 * @param {string} params.dateFrom - Start date
 * @param {string} params.dateTo - End date
 * @returns {Promise<Object>} Location history data
 */
export async function getRepresentativeLocationHistory({ repId, dateFrom, dateTo } = {}) {
  try {
    const params = new URLSearchParams();
    if (repId) params.set('rep_id', String(repId));
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    
    const userDataRaw = localStorage.getItem('userData');
    if (!userDataRaw) throw new Error('userData not found in localStorage');
    
    const userData = JSON.parse(userDataRaw);
    const users_uuid = userData.users_uuid;
    if (!users_uuid) throw new Error('users_uuid not found in userData');
    
    params.set('users_uuid', users_uuid);
    
    const url = buildApiUrl(`visits/get_all.php?${params.toString()}`);
    const response = await apiClient.get(url);
    
    if (response.status === 'success') {
      return {
        items: response.data?.visits || [],
        pagination: response.data?.pagination || {}
      };
    }
    throw new Error(response.message || 'Failed to retrieve location history');
  } catch (error) {
    console.error('Error in getRepresentativeLocationHistory:', error);
    throw error;
  }
}
