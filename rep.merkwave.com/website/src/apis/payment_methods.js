// src/apis/payment_methods.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getPaymentMethods = async () => {
  try {
    const url = buildApiUrl("payment_methods/get_all.php");
    const response = await apiClient.get(url);
    if (response.status === "success" && Array.isArray(response.data)) {
      return { payment_methods: response.data };
    } else {
      throw new Error(response.message || "Failed to retrieve payment methods.");
    }
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};

export const getPaymentMethodDetails = async (id) => {
  try {
    const url = buildApiUrl(`payment_methods/get_detail.php?id=${id}`);
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment method details:', error);
    throw error;
  }
};

export const addPaymentMethod = async (paymentMethodData) => {
  try {
    const url = buildApiUrl("payment_methods/add.php");
    const response = await apiClient.post(url, paymentMethodData);
    return response.data;
  } catch (error) {
    console.error('Error adding payment method:', error);
    throw error;
  }
};

export const updatePaymentMethod = async (id, paymentMethodData) => {
  try {
    const url = buildApiUrl(`payment_methods/update.php?id=${id}`);
    const response = await apiClient.put(url, paymentMethodData);
    return response.data;
  } catch (error) {
    console.error('Error updating payment method:', error);
    throw error;
  }
};

export const deletePaymentMethod = async (id) => {
  try {
    const url = buildApiUrl(`payment_methods/delete.php?id=${id}`);
    const response = await apiClient.delete(url);
    return response.data;
  } catch (error) {
    console.error('Error deleting payment method:', error);
    throw error;
  }
};
