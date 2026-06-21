import { api } from '../utils/axiosInstance.js';
export const getAllRefunds = (params) => api.get('/refunds', params);
export const createRefund = (data) => api.post('/refunds', data);
export const deleteRefund = (id) => api.delete(`/refunds/${id}`);

// PHP-compatible aliases
export const getClientRefunds = (params) => getAllRefunds(params);
export const getClientRefundDetail = (id) => api.get('/refunds/' + id);
export const addClientRefund = createRefund;
export const updateClientRefund = (id, data) => api.put('/refunds/' + id, data);
