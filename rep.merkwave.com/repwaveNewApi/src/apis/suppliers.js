import { api } from '../utils/axiosInstance.js';
export const getAllSuppliers = (params) => api.get('/suppliers', params);
export const getSupplierById = (id) => api.get(`/suppliers/${id}`);
export const createSupplier = (data) => api.post('/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);

// PHP-compatible aliases
export const addSupplier = createSupplier;
