import { api } from '../utils/axiosInstance.js';
export const getSafeTransfers = (params) => api.get('/safes/transfers', params);
export const createSafeTransfer = (data) => api.post('/safes/transfers', data);

// PHP-compatible aliases
export const addSafeTransfer = createSafeTransfer;
export const getSafeTransfersPaginated = (params) => getSafeTransfers(params);
export const getSafeTransferDetails = (id) => api.get('/safes/transfers/' + id);
