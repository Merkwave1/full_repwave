import { api } from '../utils/axiosInstance.js';
export const getAllClientIndustries = () => api.get('/lookups/client-industries');

// PHP-compatible CRUD
export const addClientIndustry = (data) => api.post('/lookups/client-industries', data);
export const updateClientIndustry = (id, data) => api.put('/lookups/client-industries/' + id, data);
export const deleteClientIndustry = (id) => api.delete('/lookups/client-industries/' + id);
