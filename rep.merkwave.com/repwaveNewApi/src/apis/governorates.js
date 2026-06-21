import { api } from '../utils/axiosInstance.js';
export const getAllGovernorates = (params) => api.get('/lookups/governorates', params);

// PHP-compatible CRUD
export const addGovernorate = (data) => api.post('/lookups/governorates', data);
export const updateGovernorate = (id, data) => api.put('/lookups/governorates/' + id, data);
export const deleteGovernorate = (id) => api.delete('/lookups/governorates/' + id);
