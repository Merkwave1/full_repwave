import { api } from '../utils/axiosInstance.js';
export const getUserWarehouses = (userId) => api.get('/user-warehouses', userId ? { userId } : undefined);
export const assignUserToWarehouse = (data) => api.post('/user-warehouses', data);
export const unassignUserFromWarehouse = (userId, warehouseId) => api.delete(`/user-warehouses?userId=${userId}&warehouseId=${warehouseId}`);

// PHP-compatible alias
export const updateUserWarehouses = (data) => api.post('/user-warehouses', data);
