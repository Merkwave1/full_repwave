import { api } from '../utils/axiosInstance.js';
export const getAllPackagingTypes = () => api.get('/packaging-types');
export const createPackagingType = (data) => api.post('/packaging-types', data);
export const updatePackagingType = (id, data) => api.put(`/packaging-types/${id}`, data);
export const deletePackagingType = (id) => api.delete(`/packaging-types/${id}`);

// PHP-compatible aliases
export const addPackagingType = createPackagingType;
