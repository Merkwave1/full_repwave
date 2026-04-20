// src/services/paymentsApi.js
import { apiClient } from '../utils/apiClient.js';

/**
 * Client Payments API Service
 * Handles all client payments related API calls
 */

export const paymentsApi = {
  /**
   * Get all payments with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise} API response
   */
  getAll: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters if provided
      if (filters.client_id) queryParams.append('client_id', filters.client_id);
      if (filters.method_id) queryParams.append('method_id', filters.method_id);
      if (filters.from_date) queryParams.append('from_date', filters.from_date);
      if (filters.to_date) queryParams.append('to_date', filters.to_date);
      
      const queryString = queryParams.toString();
      const url = `payments/get_all.php${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      
      return response;
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  /**
   * Get a single payment by ID with full details
   * @param {number} paymentId - Payment ID
   * @returns {Promise} API response
   */
  getById: async (paymentId) => {
    try {
      const response = await apiClient.get(`payments/get_detail.php?id=${paymentId}`);
      
      return response;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  },

  /**
   * Create a new payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise} API response
   */
  create: async (paymentData) => {
    try {
      const response = await apiClient.post('payments/add.php', paymentData);
      
      return response;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Update an existing payment
   * @param {number} paymentId - Payment ID
   * @param {Object} paymentData - Updated payment data
   * @returns {Promise} API response
   */
  update: async (paymentId, paymentData) => {
    try {
      const response = await apiClient.post('payments/update.php', {
        ...paymentData,
        payments_id: paymentId,
      });
      
      return response;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  /**
   * Delete a payment
   * @param {number} paymentId - Payment ID
   * @returns {Promise} API response
   */
  delete: async (paymentId) => {
    try {
      const response = await apiClient.post('payments/delete.php', {
        payments_id: paymentId,
      });
      
      return response;
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },

  /**
   * Get payment methods for dropdown
   * @returns {Promise} API response
   */
  getPaymentMethods: async () => {
    try {
      const response = await apiClient.get('payment_methods/get_all.php');
      
      return response;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  },

  /**
   * Get payment statistics
   * @param {Object} filters - Filter options
   * @returns {Promise} Processed statistics
   */
  getStatistics: async (filters = {}) => {
    try {
      const payments = await paymentsApi.getAll(filters);
      
      if (!payments.success || !payments.data) {
        return {
          totalPayments: 0,
          totalAmount: 0,
          methodCounts: {},
          averagePayment: 0,
        };
      }
      
      const totalPayments = payments.data.length;
      const totalAmount = payments.data.reduce((sum, payment) => sum + parseFloat(payment.payments_amount || 0), 0);
      const methodCounts = payments.data.reduce((acc, payment) => {
        const method = payment.payment_methods_name || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});
      const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0;
      
      return {
        totalPayments,
        totalAmount,
        methodCounts,
        averagePayment,
      };
    } catch (error) {
      console.error('Error calculating payment statistics:', error);
      return {
        totalPayments: 0,
        totalAmount: 0,
        methodCounts: {},
        averagePayment: 0,
      };
    }
  },

  /**
   * Get client payments summary
   * @param {number} clientId - Client ID
   * @returns {Promise} API response
   */
  getClientSummary: async (clientId) => {
    try {
      const response = await paymentsApi.getAll({ client_id: clientId });
      
      if (!response.success || !response.data) {
        return {
          totalPaid: 0,
          paymentsCount: 0,
          lastPaymentDate: null,
          methods: {},
        };
      }
      
      const totalPaid = response.data.reduce((sum, payment) => sum + parseFloat(payment.payments_amount || 0), 0);
      const paymentsCount = response.data.length;
      const lastPaymentDate = response.data.length > 0 ? 
        response.data.sort((a, b) => new Date(b.payments_date) - new Date(a.payments_date))[0].payments_date : null;
      const methods = response.data.reduce((acc, payment) => {
        const method = payment.payment_methods_name || 'unknown';
        acc[method] = (acc[method] || 0) + parseFloat(payment.payments_amount || 0);
        return acc;
      }, {});
      
      return {
        totalPaid,
        paymentsCount,
        lastPaymentDate,
        methods,
      };
    } catch (error) {
      console.error('Error fetching client payment summary:', error);
      return {
        totalPaid: 0,
        paymentsCount: 0,
        lastPaymentDate: null,
        methods: {},
      };
    }
  },
};
