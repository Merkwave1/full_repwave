// src/apis/settings.js
// This file contains API functions related to system settings management.

import { apiClient } from '../utils/apiClient.js';

/**
 * Get all system settings
 */
export async function getAllSettings() {
  try {
    // Use the company-specific endpoint that already exists in auth.js
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      throw new Error('Company name not found in localStorage');
    }
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    const settingsUrl = `${API_BASE_URL}${companyName}/settings/get_all.php`;
    const response = await apiClient.get(settingsUrl);
    
    if (response.status === "success" && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to fetch settings');
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    throw error;
  }
}

/**
 * Get a specific setting by key
 */
export async function getSettingByKey(key) {
  try {
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      throw new Error('Company name not found in localStorage');
    }
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    const settingUrl = `${API_BASE_URL}${companyName}/settings/get_by_key.php?settings_key=${encodeURIComponent(key)}`;
    const response = await apiClient.get(settingUrl);
    
    if (response.status === "success" && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to fetch setting');
    }
  } catch (error) {
    console.error(`Failed to fetch setting for key ${key}:`, error);
    throw error;
  }
}

/**
 * Update a specific setting
 */
export async function updateSetting(key, value, description = null, type = null) {
  try {
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      throw new Error('Company name not found in localStorage');
    }
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    const updateUrl = `${API_BASE_URL}${companyName}/settings/update.php`;
    
    // Prepare form data as expected by your PHP backend
    const formData = new FormData();
    formData.append('settings_key', key);
    formData.append('settings_value', value);
    
    if (description !== null) {
      formData.append('settings_description', description);
    }
    
    if (type !== null) {
      formData.append('settings_type', type);
    }
    
    const response = await apiClient.postFormData(updateUrl, formData);
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to update setting');
    }
  } catch (error) {
    console.error(`Failed to update setting ${key}:`, error);
    throw error;
  }
}

/**
 * Update multiple settings at once
 */
export async function updateMultipleSettings(settings) {
  try {
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      throw new Error('Company name not found in localStorage');
    }
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    const bulkUpdateUrl = `${API_BASE_URL}${companyName}/settings/bulk_update.php`;
    
    // Check if any setting value is a File object (for image uploads)
    const hasFileUpload = Object.values(settings).some(value => value instanceof File);
    
    if (hasFileUpload) {
      // Use FormData for file uploads
      const formData = new FormData();
      
      // Convert settings object to the format expected by PHP backend
      let settingsData = settings;
      if (Array.isArray(settings)) {
        settingsData = {};
        settings.forEach(setting => {
          if (setting.settings_key && setting.settings_value !== undefined) {
            settingsData[setting.settings_key] = setting.settings_value;
          }
        });
      }
      
      // Append each setting to FormData
      Object.entries(settingsData).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value);
        }
      });
      
      const response = await fetch(bulkUpdateUrl, {
        method: 'POST',
        body: formData,
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Network error or non-JSON response from bulk update. HTTP Status: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(result?.message || `HTTP Error ${response.status}: ${response.statusText}`);
      }

      if (result && result.status === "success") {
        return result.data;
      } else {
        throw new Error(result?.message || 'Failed to update settings');
      }
    } else {
      // Use JSON for regular settings (no file uploads)
      let settingsData = settings;
      if (Array.isArray(settings)) {
        settingsData = {};
        settings.forEach(setting => {
          if (setting.settings_key && setting.settings_value !== undefined) {
            settingsData[setting.settings_key] = setting.settings_value;
          }
        });
      }
      
      // Send raw JSON data as expected by bulk_update.php
      const response = await fetch(bulkUpdateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Network error or non-JSON response from bulk update. HTTP Status: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(result?.message || `HTTP Error ${response.status}: ${response.statusText}`);
      }

      if (result && result.status === "success") {
        return result.data;
      } else {
        throw new Error(result?.message || 'Failed to update settings');
      }
    }
  } catch (error) {
    console.error('Failed to update multiple settings:', error);
    throw error;
  }
}

/**
 * Create a new setting
 */
export async function createSetting(key, value, description = null, type = 'string') {
  try {
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      throw new Error('Company name not found in localStorage');
    }
    
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  // Backend provides add.php (not create.php)
  const createUrl = `${API_BASE_URL}${companyName}/settings/add.php`;
    
    // Prepare form data as expected by your PHP backend
    const formData = new FormData();
    formData.append('settings_key', key);
    if (value !== undefined) formData.append('settings_value', value);
    if (description !== null && description !== undefined) {
      formData.append('settings_description', description);
    }
    if (type !== null && type !== undefined) {
      formData.append('settings_type', type);
    }
    
    const response = await apiClient.postFormData(createUrl, formData);
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to create setting');
    }
  } catch (error) {
    console.error(`Failed to create setting ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a setting
 */
export async function deleteSetting(key) {
  try {
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      throw new Error('Company name not found in localStorage');
    }
    
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    const deleteUrl = `${API_BASE_URL}${companyName}/settings/delete.php`;
    
    // Prepare form data as expected by your PHP backend
    const formData = new FormData();
    formData.append('settings_key', key);
    
    const response = await apiClient.postFormData(deleteUrl, formData);
    
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to delete setting');
    }
  } catch (error) {
    console.error(`Failed to delete setting ${key}:`, error);
    throw error;
  }
}

/**
 * Get settings grouped by category (based on naming convention)
 */
export async function getSettingsByCategory() {
  try {
    const allSettings = await getAllSettings();
    
    const categorizedSettings = {
      company: [],
      system: [],
      financial: [],
      inventory: [],
      business: [],
      mobile: [],
      visit: [],
      safe: [],
      warehouse: [],
      client: [],
      notifications: [],
      security: [],
      backup: [],
      reports: [],
      product: [],
      ui: [],
      integration: [],
      performance: [],
      advanced: []
    };

    allSettings.forEach(setting => {
      const key = setting.settings_key;
      
      if (key.startsWith('company_')) {
        categorizedSettings.company.push(setting);
      } else if (key.includes('users_limits') || key.includes('expiration_date') || key.includes('_limit') || key.includes('timezone') || key.includes('language') || key.includes('date_format') || key.includes('time_format') || key.includes('fiscal_year')) {
        categorizedSettings.system.push(setting);
      } else if (key.includes('currency') || key.includes('tax') || key.includes('payment') || key.includes('decimal')) {
        categorizedSettings.financial.push(setting);
      } else if (key.includes('stock') || key.includes('inventory') || key.includes('batch') || key.includes('reorder') || key.includes('expiry')) {
        categorizedSettings.inventory.push(setting);
      } else if (key.includes('approve') || key.includes('credit') || key.includes('order') || key.includes('invoice') || key.includes('return') || key.includes('discount') || key.includes('_prefix')) {
        categorizedSettings.business.push(setting);
      } else if (key.includes('gps') || key.includes('mobile') || key.includes('photo') || key.includes('location') || key.includes('offline') || key.includes('check_in') || key.includes('check_out')) {
        categorizedSettings.mobile.push(setting);
      } else if (key.includes('visit')) {
        categorizedSettings.visit.push(setting);
      } else if (key.includes('safe') || key.includes('expense') || key.includes('collection') || key.includes('deposit') || key.includes('closing')) {
        categorizedSettings.safe.push(setting);
      } else if (key.includes('warehouse') || key.includes('transfer') || key.includes('goods_receipt') || key.includes('adjustment') || key.includes('van')) {
        categorizedSettings.warehouse.push(setting);
      } else if (key.includes('client') || key.includes('overdue')) {
        categorizedSettings.client.push(setting);
      } else if (key.includes('notification') || key.includes('email') || key.includes('sms') || key.includes('push')) {
        categorizedSettings.notifications.push(setting);
      } else if (key.includes('security') || key.includes('password') || key.includes('session') || key.includes('login') || key.includes('lockout') || key.includes('authentication')) {
        categorizedSettings.security.push(setting);
      } else if (key.includes('backup') || key.includes('maintenance') || key.includes('retention')) {
        categorizedSettings.backup.push(setting);
      } else if (key.includes('report') || key.includes('analytics') || key.includes('dashboard')) {
        categorizedSettings.reports.push(setting);
      } else if (key.includes('product') || key.includes('barcode') || key.includes('variant') || key.includes('packaging')) {
        categorizedSettings.product.push(setting);
      } else if (key.includes('theme') || key.includes('items_per_page') || key.includes('help') || key.includes('tooltip')) {
        categorizedSettings.ui.push(setting);
      } else if (key.includes('api') || key.includes('webhook') || key.includes('integration')) {
        categorizedSettings.integration.push(setting);
      } else if (key.includes('cache') || key.includes('performance') || key.includes('optimization')) {
        categorizedSettings.performance.push(setting);
      } else {
        categorizedSettings.advanced.push(setting);
      }
    });

    return categorizedSettings;
  } catch (error) {
    console.error('Failed to get categorized settings:', error);
    throw error;
  }
}
