import { api } from '../utils/axiosInstance.js';
export const getAllPayments = (params) => api.get('/payments', params);
export const createPayment = (data) => api.post('/payments', data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);

// PHP-compatible aliases
export const addClientPayment = createPayment;
export const updateClientPayment = (id, data) => api.put('/payments/' + id, data);
export const getAllClientPayments = (params) => getAllPayments(params);
export const getClientPayments = (clientId, params) => api.get('/payments', { clientId, ...params });
export const getClientPaymentDetails = (id) => api.get('/payments/' + id);
