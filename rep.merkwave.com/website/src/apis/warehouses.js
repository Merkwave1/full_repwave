// src/apis/warehouses.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllWarehouses = async (includeAllWarehouses = false) => {
  try {
    const users_uuid = getUserUUID();
    if (!users_uuid) throw new Error('User UUID is required. Please log in.');

    let url = buildApiUrl("warehouse/get_all.php");
    // Try different parameter variations that the backend might accept
    if (includeAllWarehouses) {
      url += `?users_uuid=${users_uuid}&include_all=1&all_warehouses=1&fetch_all=true`;
    } else {
      url += `?users_uuid=${users_uuid}`;
    }

    const response = await apiClient.get(url);
    
    if (response.status === "success" && Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to retrieve warehouses.");
    }
  } catch (error) {
    console.error('🚨 Warehouses API Error:', error);
    throw error;
  }
};

export const addWarehouse = async (warehouseData) => {
  const url = buildApiUrl("warehouse/add.php");
  const formData = new FormData();
  for (const key in warehouseData) {
    const val = warehouseData[key];
    // Skip undefined, null, or empty-string values to avoid sending warehouse_code as ''
    if (val === undefined || val === null) continue;
    if (typeof val === 'string' && val.trim() === '') continue;
    formData.append(key, val);
  }

  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    // Return backend data payload if present to allow caller to access generated warehouse_code
    return response.data || response.message || 'تم إضافة المخزن بنجاح!';
  } else {
    throw new Error(response.message || "Failed to add warehouse.");
  }
};

export const updateWarehouse = async (warehouseId, warehouseData) => {
  const url = buildApiUrl("warehouse/update.php");
  const formData = new FormData();
  formData.append('warehouse_id', warehouseId); // Ensure the ID is sent for update
  for (const key in warehouseData) {
    formData.append(key, warehouseData[key]);
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update warehouse.");
  }
};

export const deleteWarehouse = async (warehouseId) => {
  const url = buildApiUrl("warehouse/delete.php");
  const formData = new FormData();
  formData.append('warehouse_id', warehouseId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete warehouse.");
  }
};

// === WAREHOUSE REPORTS API FUNCTIONS ===

/**
 * Get comprehensive warehouse reports and analytics
 * @param {Object} params - Parameters including warehouse_id, report_type, date ranges, etc.
 * @returns {Promise<Object>} Comprehensive report data
 */
export const getComprehensiveReports = async (params = {}) => {
  try {
    const url = buildApiUrl("warehouse/comprehensive_reports.php");
    const response = await apiClient.post(url, params);
    
    if (response.status === true || response.status === 'success') {
      return response.data || response;
    }
    
    if (response.message && response.message.toLowerCase().includes('successfully')) {
      return response.data || response;
    }
    
    throw new Error(response.message || "Failed to retrieve comprehensive reports.");
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('successfully')) {
      return error.data || { message: error.message, status: 'success' };
    }
    throw error;
  }
};

/**
 * Get detailed inventory snapshot and analysis
 * @param {Object} params - Parameters including warehouse_id, analysis_depth, etc.
 * @returns {Promise<Object>} Inventory snapshot data
 */
export const getInventorySnapshot = async (params = {}) => {
  try {
    const url = buildApiUrl("warehouse/inventory_snapshot.php");
    const response = await apiClient.post(url, params);
    
    if (response.status === true || response.status === 'success') {
      return response.data || response;
    }
    
    if (response.message && response.message.toLowerCase().includes('successfully')) {
      return response.data || response;
    }
    
    throw new Error(response.message || "Failed to retrieve inventory snapshot.");
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('successfully')) {
      return error.data || { message: error.message, status: 'success' };
    }
    throw error;
  }
};

/**
 * Get movement tracking and history analysis
 * @param {Object} params - Parameters including warehouse_id, time_period, movement_types, etc.
 * @returns {Promise<Object>} Movement tracking data
 */
export const getMovementTracking = async (params = {}) => {
  try {
    const url = buildApiUrl("warehouse/movement_tracking.php");
    const response = await apiClient.post(url, params);
    
    if (response.status === true || response.status === 'success') {
      return response.data || response;
    }
    
    if (response.message && response.message.toLowerCase().includes('successfully')) {
      return response.data || response;
    }
    
    throw new Error(response.message || "Failed to retrieve movement tracking data.");
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('successfully')) {
      return error.data || { message: error.message, status: 'success' };
    }
    throw error;
  }
};

/**
 * Get performance analysis and KPIs
 * @param {Object} params - Parameters including warehouse_id, analysis_period, benchmark_type, etc.
 * @returns {Promise<Object>} Performance analysis data
 */
export const getPerformanceAnalysis = async (params = {}) => {
  try {
    const url = buildApiUrl("warehouse/performance_analysis.php");
    const response = await apiClient.post(url, params);
    
    if (response.status === true || response.status === 'success') {
      return response.data || response;
    }
    
    if (response.message && response.message.toLowerCase().includes('successfully')) {
      return response.data || response;
    }
    
    throw new Error(response.message || "Failed to retrieve performance analysis.");
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('successfully')) {
      return error.data || { message: error.message, status: 'success' };
    }
    throw error;
  }
};

/**
 * Get forecasting and planning analysis
 * @param {Object} params - Parameters including warehouse_id, forecast_period, analysis_type, etc.
 * @returns {Promise<Object>} Forecasting and planning data
 */
export const getForecastingPlanning = async (params = {}) => {
  try {
    const url = buildApiUrl("warehouse/forecasting_planning.php");
    const response = await apiClient.post(url, params);
    
    if (response.status === true || response.status === 'success') {
      return response.data || response;
    }
    
    if (response.message && response.message.toLowerCase().includes('successfully')) {
      return response.data || response;
    }
    
    throw new Error(response.message || "Failed to retrieve forecasting and planning data.");
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('successfully')) {
      return error.data || { message: error.message, status: 'success' };
    }
    throw error;
  }
};

/**
 * Get executive dashboard summary for warehouse operations
 * @param {Object} params - Parameters including warehouse_id, report_type, etc.
 * @returns {Promise<Object>} Dashboard summary data
 */
export const getDashboardSummary = async (params = {}) => {
  try {
    const url = buildApiUrl("warehouse/dashboard_summary.php");
    const response = await apiClient.post(url, params);
    
    // Handle both success scenarios
    if (response.status === true || response.status === 'success') {
      return response.data || response;
    }
    
    // If the error message contains "successfully", treat it as success
    if (response.message && response.message.toLowerCase().includes('successfully')) {
      return response.data || response;
    }
    
    throw new Error(response.message || "Failed to retrieve dashboard summary.");
  } catch (error) {
    // Check if the error message indicates success
    if (error.message && error.message.toLowerCase().includes('successfully')) {
      // Try to extract data from the error response
      return error.data || { message: error.message, status: 'success' };
    }
    throw error;
  }
};

/**
 * Get available warehouse reports information
 * @returns {Promise<Object>} Available reports structure and documentation
 */
export const getWarehouseReportsInfo = async () => {
  const url = buildApiUrl("warehouse/index.php");
  const response = await apiClient.get(url);
  if (response.status === true) {
    return response.data;
  } else {
    throw new Error(response.message || "Failed to retrieve reports information.");
  }
};
