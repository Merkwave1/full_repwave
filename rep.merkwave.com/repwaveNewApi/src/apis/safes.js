import { api } from '../utils/axiosInstance.js';
export const getSafes = (params) => api.get('/safes', params);
export const getSafeById = (id) => api.get(`/safes/${id}`);
export const createSafe = (data) => api.post('/safes', data);
export const updateSafe = (id, data) => api.put(`/safes/${id}`, data);
export const deleteSafe = (id) => api.delete(`/safes/${id}`);

// PHP-compatible aliases
export const addSafe = createSafe;
export const getSafeDetails = getSafeById;
