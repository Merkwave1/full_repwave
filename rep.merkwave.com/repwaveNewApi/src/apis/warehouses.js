import { api } from '../utils/axiosInstance.js';
export const getAllWarehouses = (params) => api.get('/warehouses', params);
export const getWarehouseById = (id) => api.get(`/warehouses/${id}`);
export const createWarehouse = (data) => api.post('/warehouses', data);
export const updateWarehouse = (id, data) => api.put(`/warehouses/${id}`, data);
export const deleteWarehouse = (id) => api.delete(`/warehouses/${id}`);

// PHP-compatible aliases
export const addWarehouse = createWarehouse;
