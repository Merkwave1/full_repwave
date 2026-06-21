import { api } from '../utils/axiosInstance.js';
export const getAllInventory = (params) => api.get('/inventory', params);

// PHP-compatible mutations (endpoints may not be fully implemented in backend yet)
export const addInventory = (data) => api.post('/inventory', data);
export const updateInventory = (id, data) => api.put('/inventory/' + id, data);
export const repackInventory = (data) => api.post('/inventory/repack', data);
export const markInventoryRemoved = (id) => api.patch('/inventory/' + id + '/removed', {});
export const deleteInventory = (id) => api.delete('/inventory/' + id);
