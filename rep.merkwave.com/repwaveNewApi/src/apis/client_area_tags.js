import { api } from '../utils/axiosInstance.js';
export const getAllClientAreaTags = () => api.get('/lookups/client-area-tags');

// PHP-compatible CRUD (routes may not exist in backend)
export const addClientAreaTag = (data) => api.post('/lookups/client-area-tags', data);
export const updateClientAreaTag = (id, data) => api.put('/lookups/client-area-tags/' + id, data);
export const deleteClientAreaTag = (id) => api.delete('/lookups/client-area-tags/' + id);
