import { api } from '../utils/axiosInstance.js';
export const getSupplierPayments = (params) => api.get('/supplier-payments', params);
export const createSupplierPayment = (data) => api.post('/supplier-payments', data);
export const deleteSupplierPayment = (id) => api.delete(`/supplier-payments/${id}`);

// PHP-compatible aliases
export const addSupplierPayment = createSupplierPayment;
export const getSupplierPaymentDetails = (id) => api.get('/supplier-payments/' + id);
export const updateSupplierPayment = (id, data) => api.put('/supplier-payments/' + id, data);
