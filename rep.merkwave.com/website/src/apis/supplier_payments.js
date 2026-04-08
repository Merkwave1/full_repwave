// src/apis/supplier_payments.js
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
 * Add a new supplier payment
 */
export const addSupplierPayment = async (paymentData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("supplier_payments/add.php");
  const formData = new FormData();
  
  // Add user UUID
  formData.append('users_uuid', users_uuid);
  
  // Add payment data
  formData.append('supplier_payments_supplier_id', paymentData.supplier_payments_supplier_id);
  formData.append('supplier_payments_method_id', paymentData.supplier_payments_method_id);
  formData.append('supplier_payments_amount', paymentData.supplier_payments_amount);
  formData.append('supplier_payments_date', paymentData.supplier_payments_date);
  formData.append('supplier_payments_safe_id', paymentData.supplier_payments_safe_id);
  
  if (paymentData.supplier_payments_transaction_id) {
    formData.append('supplier_payments_transaction_id', paymentData.supplier_payments_transaction_id);
  }
  if (paymentData.supplier_payments_notes) {
    formData.append('supplier_payments_notes', paymentData.supplier_payments_notes);
  }
  if (paymentData.supplier_payments_purchase_order_id) {
    formData.append('supplier_payments_purchase_order_id', paymentData.supplier_payments_purchase_order_id);
  }
  if (paymentData.supplier_payments_type) {
    formData.append('supplier_payments_type', paymentData.supplier_payments_type);
  }
  if (paymentData.supplier_payments_status) {
    formData.append('supplier_payments_status', paymentData.supplier_payments_status);
  }

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to add supplier payment');
  }

  return response;
};

/**
 * Get all supplier payments with optional filters
 */
export const getSupplierPayments = async (filters = {}) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("supplier_payments/get_all.php");
  const formData = new FormData();
  
  // Add user UUID
  formData.append('users_uuid', users_uuid);
  
  // Add filters
  if (filters.supplier_id) {
    formData.append('supplier_id', filters.supplier_id);
  }
  if (filters.start_date) {
    formData.append('start_date', filters.start_date);
  }
  if (filters.end_date) {
    formData.append('end_date', filters.end_date);
  }
  if (filters.search) {
    formData.append('search', filters.search);
  }
  if (filters.status) {
    formData.append('status', filters.status);
  }
  // Optional safe filter
  if (filters.safe_id) {
    formData.append('safe_id', filters.safe_id);
  }
  if (filters.limit) {
    formData.append('limit', filters.limit);
  }
  if (filters.offset) {
    formData.append('offset', filters.offset);
  }

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to fetch supplier payments');
  }

  return response.data;
};

/**
 * Get detailed information for a specific supplier payment
 */
export const getSupplierPaymentDetails = async (paymentId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("supplier_payments/get_detail.php");
  const formData = new FormData();
  
  // Add user UUID and payment ID
  formData.append('users_uuid', users_uuid);
  formData.append('id', paymentId);

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to fetch supplier payment details');
  }

  return response.data;
};

/**
 * Update an existing supplier payment
 */
export const updateSupplierPayment = async (paymentId, paymentData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("supplier_payments/update.php");
  const formData = new FormData();
  
  // Add user UUID and payment ID
  formData.append('users_uuid', users_uuid);
  formData.append('supplier_payments_id', paymentId);
  
  // Add payment data (only fields that are provided)
  if (paymentData.method_id !== undefined) {
    formData.append('supplier_payments_method_id', paymentData.method_id);
  }
  if (paymentData.amount !== undefined) {
    formData.append('supplier_payments_amount', paymentData.amount);
  }
  if (paymentData.date !== undefined) {
    formData.append('supplier_payments_date', paymentData.date);
  }
  if (paymentData.safe_id !== undefined) {
    formData.append('supplier_payments_safe_id', paymentData.safe_id);
  }
  if (paymentData.transaction_id !== undefined) {
    formData.append('supplier_payments_transaction_id', paymentData.transaction_id);
  }
  if (paymentData.notes !== undefined) {
    formData.append('supplier_payments_notes', paymentData.notes);
  }
  if (paymentData.purchase_order_id !== undefined) {
    formData.append('supplier_payments_purchase_order_id', paymentData.purchase_order_id);
  }
  if (paymentData.type !== undefined) {
    formData.append('supplier_payments_type', paymentData.type);
  }
  if (paymentData.status !== undefined) {
    formData.append('supplier_payments_status', paymentData.status);
  }

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to update supplier payment');
  }

  return response;
};

/**
 * Delete a supplier payment
 */
export const deleteSupplierPayment = async (paymentId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("supplier_payments/delete.php");
  const formData = new FormData();
  
  // Add user UUID and payment ID
  formData.append('users_uuid', users_uuid);
  formData.append('supplier_payments_id', paymentId);

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to delete supplier payment');
  }

  return response;
};
