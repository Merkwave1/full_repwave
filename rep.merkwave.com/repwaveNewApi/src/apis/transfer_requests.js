import { api } from '../utils/axiosInstance.js';
export const getAllTransferRequests = (params) => api.get('/transfer-requests', params);
export const createTransferRequest = (data) => api.post('/transfer-requests', data);
export const updateTransferRequestStatus = (id, status) => api.patch(`/transfer-requests/${id}/status`, { status });
export const deleteTransferRequest = (id) => api.delete(`/transfer-requests/${id}`);
// PHP-compatible alias
export const allocateTransferRequest = (id, data) => api.patch('/transfer-requests/' + id + '/status', data);