// src/apis/representativeSettings.js
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
 * Fetches representative settings by user ID
 * @param {number} userId The ID of the user/representative
 * @returns {Promise<Object>} A promise that resolves to the settings object
 * @throws {Error} Throws an error if the API call fails
 */
export async function getRepresentativeSettings(userId) {
  const url = buildApiUrl(`representative_settings/get_by_user.php?user_id=${userId}`);
  try {
    const result = await apiClient.get(url);
    if (result.status === "success") {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to retrieve representative settings.");
    }
  } catch (error) {
    console.error('Error in getRepresentativeSettings API call:', error);
    throw error;
  }
}

/**
 * Updates or creates representative settings (upsert)
 * @param {Object} settingsData The settings data to update/create
 * @returns {Promise<Object>} A promise that resolves to the API response
 * @throws {Error} Throws an error if the API call fails
 */
export async function upsertRepresentativeSettings(settingsData) {
  // Build URL with query parameters
  const params = new URLSearchParams();
  Object.keys(settingsData).forEach(key => {
    if (settingsData[key] !== null && settingsData[key] !== undefined) {
      params.append(key, settingsData[key]);
    }
  });
  
  const url = buildApiUrl(`representative_settings/upsert.php?${params.toString()}`);
  try {
    const result = await apiClient.get(url);
    if (result.status === "success") {
      return result;
    } else {
      throw new Error(result.message || "Failed to update representative settings.");
    }
  } catch (error) {
    console.error('Error in upsertRepresentativeSettings API call:', error);
    throw error;
  }
}
