// src/apis/client_refunds.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getClientRefunds = async (filters = {}) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  const url = buildApiUrl('client_refunds/get_all.php');
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  if (filters.client_id) formData.append('client_id', filters.client_id);
  if (filters.payment_method_id) formData.append('payment_method_id', filters.payment_method_id);
  if (filters.safe_id) formData.append('safe_id', filters.safe_id);
  if (filters.date_from) formData.append('date_from', filters.date_from);
  if (filters.date_to) formData.append('date_to', filters.date_to);
  if (filters.search) formData.append('search', filters.search);
  if (filters.limit) formData.append('limit', String(filters.limit));
  if (filters.page && filters.limit) {
    const offset = (Number(filters.page) - 1) * Number(filters.limit);
    formData.append('offset', String(offset));
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status !== 'success') throw new Error(response.message || 'Failed to fetch client refunds');
  return response;
};

export const getClientRefundDetail = async (id) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  const url = buildApiUrl('client_refunds/get_detail.php');
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('client_refunds_id', id);
  const response = await apiClient.postFormData(url, formData);
  if (response.status !== 'success') throw new Error(response.message || 'Failed to fetch client refund detail');
  return response;
};

export const addClientRefund = async (data) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  const url = buildApiUrl('client_refunds/add.php');
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('client_refunds_client_id', data.client_id);
  formData.append('client_refunds_amount', data.amount);
  formData.append('client_refunds_method_id', data.payment_method_id);
  if (data.safe_id) formData.append('client_refunds_safe_id', data.safe_id);
  if (data.refund_date) formData.append('client_refunds_date', data.refund_date);
  if (data.notes) formData.append('client_refunds_notes', data.notes);
  const response = await apiClient.postFormData(url, formData);
  if (response.status !== 'success') throw new Error(response.message || 'Failed to add client refund');
  return response;
};

export const updateClientRefund = async (id, data) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  const url = buildApiUrl('client_refunds/update.php');
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('client_refunds_id', id);
  formData.append('client_refunds_client_id', data.client_id);
  formData.append('client_refunds_amount', data.amount);
  formData.append('client_refunds_method_id', data.payment_method_id);
  if (data.safe_id) formData.append('client_refunds_safe_id', data.safe_id);
  if (data.refund_date) formData.append('client_refunds_date', data.refund_date);
  if (data.notes) formData.append('client_refunds_notes', data.notes);
  const response = await apiClient.postFormData(url, formData);
  if (response.status !== 'success') throw new Error(response.message || 'Failed to update client refund');
  return response;
};

export const deleteClientRefund = async (id) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  const url = buildApiUrl('client_refunds/delete.php');
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('client_refunds_id', id);
  const response = await apiClient.postFormData(url, formData);
  if (response.status !== 'success') throw new Error(response.message || 'Failed to delete client refund');
  return response;
};
