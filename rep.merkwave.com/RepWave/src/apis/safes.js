// src/apis/safes.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getSafes = async () => {
  try {
    const url = buildApiUrl("safes/get_all.php");
    const response = await apiClient.get(url);
    if (response.status === "success" && response.data) {
      const payload = response.data;
      const safesArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.safes)
          ? payload.safes
          : [];

      const pendingTotals = typeof payload?.pending_totals === 'number'
        ? payload.pending_totals
        : Array.isArray(safesArray)
          ? safesArray.reduce((sum, safe) => sum + (Number(safe.pending_transactions_count) || 0), 0)
          : 0;

      return { safes: safesArray, pendingTotals };
    } else {
      throw new Error(response.message || "Failed to retrieve safes.");
    }
  } catch (error) {
    console.error('Error fetching safes:', error);
    throw error;
  }
};

export const getSafeDetails = async (id) => {
  try {
    const url = buildApiUrl(`safes/get_detail.php?id=${id}`);
    const response = await apiClient.get(url);
    if (response.status === "success") {
      return response;
    } else {
      throw new Error(response.message || "Failed to retrieve safe details.");
    }
  } catch (error) {
    console.error('Error fetching safe details:', error);
    throw error;
  }
};

export const addSafe = async (safeData) => {
  try {
    const uuid = getUserUUID();
    const url = buildApiUrl("safes/add.php");
    const response = await apiClient.post(url, {
      ...safeData,
      users_uuid: uuid
    });
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to add safe.");
    }
  } catch (error) {
    console.error('Error adding safe:', error);
    throw error;
  }
};

export const updateSafe = async (id, safeData) => {
  try {
    const uuid = getUserUUID();
    const url = buildApiUrl(`safes/update.php?id=${id}`);
    const response = await apiClient.post(url, {
      ...safeData,
      users_uuid: uuid,
    });
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to update safe.");
    }
  } catch (error) {
    console.error('Error updating safe:', error);
    throw error;
  }
};

export const deleteSafe = async (id) => {
  try {
    const url = buildApiUrl(`safes/delete.php`);
    const formData = new FormData();
    formData.append('safes_id', id);

    const response = await apiClient.postFormData(url, formData);
    if (response.status === "success") {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to delete safe.");
    }
  } catch (error) {
    console.error('Error deleting safe:', error);
    throw error;
  }
};
