// src/apis/dashboard.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Get comprehensive dashboard statistics and data (NEW)
 */
export const getComprehensiveDashboardData = async () => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl(`reports/dashboard_comprehensive.php?users_uuid=${users_uuid}`);
  console.log('Fetching comprehensive dashboard data from:', url);

  try {
    const response = await apiClient.get(url);
    console.log('API Response:', response);

    const payload = response && typeof response === 'object' && 'status' in response
      ? response
      : response?.data;

    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid response structure: missing data');
    }

    const { status, data, message } = payload;

    if (status === 'success' && data) {
      // If suppliers total balance is not present in the comprehensive payload,
      // try a lightweight secondary request to retrieve suppliers summary/balance.
      const hasSuppliersBalance = data.suppliers?.total_balance !== undefined || data.total_suppliers_balance !== undefined || data.suppliers_balance !== undefined;
      if (!hasSuppliersBalance) {
        try {
          const suppliersUrl = buildApiUrl(`reports/suppliers_summary.php?users_uuid=${users_uuid}`);
          console.log('Fetching suppliers summary from:', suppliersUrl);
          const supResp = await apiClient.get(suppliersUrl);
          const supPayload = supResp && typeof supResp === 'object' && 'status' in supResp ? supResp : supResp?.data;
          if (supPayload && supPayload.status === 'success' && supPayload.data) {
            // attempt to merge known keys
            const supData = supPayload.data;
            data.suppliers = data.suppliers ?? {};
            data.suppliers.total_balance = supData.total_balance ?? supData.suppliers_total_balance ?? supData.total_suppliers_balance ?? supData.suppliers_balance ?? data.suppliers.total_balance;
            console.log('Merged suppliers balance into dashboard data:', data.suppliers.total_balance);
          }
        } catch (supErr) {
          // don't fail the whole dashboard if suppliers summary is unavailable
          console.warn('Failed to fetch suppliers summary (non-fatal):', supErr?.message || supErr);
        }
      }

      return data;
    }

    throw new Error(message || 'فشل في جلب بيانات لوحة المعلومات');
  } catch (error) {
    console.error('Error fetching comprehensive dashboard data:', error);
    throw error;
  }
};

/**
 * Get dashboard statistics and data (LEGACY - for backward compatibility)
 */
export const getDashboardData = async () => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl(`reports/dashboard.php?users_uuid=${users_uuid}`);

  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};
