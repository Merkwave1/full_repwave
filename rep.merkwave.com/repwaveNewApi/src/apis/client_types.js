import { api } from '../utils/axiosInstance.js';
export const getAllClientTypes = () => api.get('/lookups/client-types');

// PHP-compatible CRUD
export const addClientType = (data) => api.post('/lookups/client-types', data);
export const updateClientType = (id, data) => api.put('/lookups/client-types/' + id, data);
export const deleteClientType = (id) => api.delete('/lookups/client-types/' + id);
