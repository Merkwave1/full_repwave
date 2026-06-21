// src/services/paymentsApi.js
import { api } from '../utils/axiosInstance.js';

export const paymentsApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.client_id)  params.append('clientId',  filters.client_id);
    if (filters.method_id)  params.append('methodId',  filters.method_id);
    if (filters.from_date)  params.append('fromDate',  filters.from_date);
    if (filters.to_date)    params.append('toDate',    filters.to_date);
    const qs = params.toString();
    return api.get(`/payments${qs ? `?${qs}` : ''}`);
  },

  getById: async (paymentId) => api.get(`/payments/${paymentId}`),

  create: async (paymentData) => api.post('/payments', paymentData),

  update: async (paymentId, paymentData) => api.put(`/payments/${paymentId}`, paymentData),

  delete: async (paymentId) => api.delete(`/payments/${paymentId}`),

  getPaymentMethods: async () => api.get('/lookups/payment-methods'),
};
