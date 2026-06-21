import { api } from '../utils/axiosInstance.js';
export const getAllTransfers = (params) => api.get('/transfers', params);
export const createTransfer = (data) => api.post('/transfers', data);
export const updateTransferStatus = (id, status) => api.patch(`/transfers/${id}/status`, { status });
export const deleteTransfer = (id) => api.delete(`/transfers/${id}`);

// PHP-compatible aliases
export const addTransfer = createTransfer;
export const editTransfer = (id, data) => api.put('/transfers/' + id, data);
export const getTransfersPaginated = (params) => getAllTransfers(params);
export const getTransferDetails = (id) => api.get('/transfers/' + id);
