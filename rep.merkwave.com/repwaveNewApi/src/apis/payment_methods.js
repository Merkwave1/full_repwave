import { api } from '../utils/axiosInstance.js';
export const getPaymentMethods = () => api.get('/lookups/payment-methods');

// PHP-compatible CRUD
export const getPaymentMethodDetails = (id) => api.get('/lookups/payment-methods/' + id);
export const addPaymentMethod = (data) => api.post('/lookups/payment-methods', data);
export const updatePaymentMethod = (id, data) => api.put('/lookups/payment-methods/' + id, data);
export const deletePaymentMethod = (id) => api.delete('/lookups/payment-methods/' + id);
