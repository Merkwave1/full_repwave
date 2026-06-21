import { api } from '../utils/axiosInstance.js';
export const getAllBaseUnits = () => api.get('/lookups/base-units');
export const createBaseUnit = (data) => api.post('/lookups/base-units', data);
export const deleteBaseUnit = (id) => api.delete(`/lookups/base-units/${id}`);

// PHP-compatible aliases
export const addBaseUnit = createBaseUnit;
export const updateBaseUnit = (id, data) => api.put('/lookups/base-units/' + id, data);
