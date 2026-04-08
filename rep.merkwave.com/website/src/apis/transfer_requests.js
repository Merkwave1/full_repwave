// src/apis/transfer_requests.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from './auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllTransferRequests = async ({ status = 'Pending', source_warehouse_id = '', destination_warehouse_id = '' } = {}) => {
  const qs = new URLSearchParams();
  if (status) qs.append('status', status);
  if (source_warehouse_id) qs.append('source_warehouse_id', source_warehouse_id);
  if (destination_warehouse_id) qs.append('destination_warehouse_id', destination_warehouse_id);
  const url = buildApiUrl(`transfer_requests/get_all.php${qs.toString() ? `?${qs.toString()}` : ''}`);
  try {
    const response = await apiClient.get(url);
    if (response.status === 'success') {
      return response.data || [];
    }
    return [];
  } catch (e) {
    console.error('Error fetching transfer requests:', e);
    throw e;
  }
};

export const updateTransferRequestStatus = async (request_id, status, admin_note = '', allocations = []) => {
  const url = buildApiUrl('transfer_requests/update_status.php');
  const formData = new FormData();
  formData.append('request_id', request_id);
  formData.append('status', status);
  formData.append('admin_note', admin_note || '');
  
  // If allocations are provided, add them to the form data
  if (allocations && allocations.length > 0) {
    formData.append('allocations', JSON.stringify(allocations));
  }
  
  const res = await apiClient.postFormData(url, formData);
  if (res.status === 'success') return res.message || 'تم التحديث';
  throw new Error(res.message || 'فشل تحديث الحالة');
};

export const allocateTransferRequest = async (request_id, items, admin_note = '') => {
  const url = buildApiUrl('transfer_requests/allocate.php');
  const formData = new FormData();
  formData.append('request_id', request_id);
  formData.append('items', JSON.stringify(items));
  formData.append('admin_note', admin_note || '');
  
  const res = await apiClient.postFormData(url, formData);
  if (res.status === 'success') return res.message || 'تم التخصيص بنجاح';
  throw new Error(res.message || 'فشل في التخصيص');
};
