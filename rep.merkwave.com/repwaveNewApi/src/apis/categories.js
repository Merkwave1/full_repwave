import { api } from '../utils/axiosInstance.js';
export const getAllCategories = (params) => api.get('/lookups/categories', params);
export const createCategory = (data) => api.post('/lookups/categories', data);
export const updateCategory = (id, data) => api.put(`/lookups/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/lookups/categories/${id}`);

// PHP-compatible aliases
export const addCategory = createCategory;
