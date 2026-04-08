// src/apis/client_payments.js
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
 * Add a new client payment
 */
export const addClientPayment = async (paymentData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("client_payments/add.php");
  const formData = new FormData();
  
  // Add user UUID
  formData.append('users_uuid', users_uuid);
  
  // Add required payment data
  formData.append('client_payments_client_id', paymentData.client_id);
  formData.append('client_payments_amount', paymentData.amount);
  formData.append('client_payments_method_id', paymentData.payment_method_id);
  if (paymentData.safe_id) formData.append('client_payments_safe_id', paymentData.safe_id);
  if (paymentData.payment_date) formData.append('client_payments_date', paymentData.payment_date);
  
  // Optional fields
  if (paymentData.reference_number) formData.append('client_payments_reference_number', paymentData.reference_number);
  if (paymentData.notes) formData.append('client_payments_notes', paymentData.notes);

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to add client payment');
  }
  return response;
};

/**
 * Update an existing client payment
 */
export const updateClientPayment = async (id, paymentData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("client_payments/update.php");
  const formData = new FormData();
  
  // Add user UUID and ID
  formData.append('users_uuid', users_uuid);
  formData.append('client_payments_id', id);
  
  // Add required payment data
  formData.append('client_payments_client_id', paymentData.client_id);
  formData.append('client_payments_amount', paymentData.amount);
  formData.append('client_payments_method_id', paymentData.payment_method_id);
  if (paymentData.safe_id) formData.append('client_payments_safe_id', paymentData.safe_id);
  if (paymentData.payment_date) formData.append('client_payments_date', paymentData.payment_date);
  
  // Optional fields
  if (paymentData.reference_number) formData.append('client_payments_reference_number', paymentData.reference_number);
  if (paymentData.notes) formData.append('client_payments_notes', paymentData.notes);

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to update client payment');
  }
  return response;
};

/**
 * Delete a client payment
 */
export const deleteClientPayment = async (id) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("client_payments/delete.php");
  const formData = new FormData();
  
  formData.append('users_uuid', users_uuid);
  formData.append('client_payments_id', id);

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to delete client payment');
  }
  return response;
};

/**
 * Get all client payments
 */
export const getAllClientPayments = async () => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("client_payments/get_all.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to fetch client payments');
  }
  return response;
};

/**
 * Get client payments with optional filters
 */
export const getClientPayments = async (filters = {}) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("client_payments/get_all.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  
  // Add filters if provided
  if (filters.client_id) {
    formData.append('client_id', filters.client_id);
  }
  if (filters.payment_method_id) {
    formData.append('payment_method_id', filters.payment_method_id);
  }
  if (filters.safe_id) {
    formData.append('safe_id', filters.safe_id);
  }
  if (filters.date_from) {
    formData.append('date_from', filters.date_from);
  }
  if (filters.date_to) {
    formData.append('date_to', filters.date_to);
  }
  // Optional: search
  if (filters.search) {
    formData.append('search', filters.search);
  }
  // Pagination via limit/offset
  if (filters.limit) {
    formData.append('limit', String(filters.limit));
  }
  if (filters.page && filters.limit) {
    const offset = (Number(filters.page) - 1) * Number(filters.limit);
    formData.append('offset', String(offset));
  }

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to fetch client payments');
  }
  return response;
};

/**
 * Get client payment details
 */
export const getClientPaymentDetails = async (id) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("client_payments/get_detail.php");
  const formData = new FormData();
  
  formData.append('users_uuid', users_uuid);
  formData.append('client_payments_id', id);

  const response = await apiClient.postFormData(url, formData);
  if (response.status !== "success") {
    throw new Error(response.message || 'Failed to fetch client payment details');
  }
  return response;
};
