import { api } from '../utils/axiosInstance.js';
export const getAllSalesDeliveries = (params) => api.get('/sales-deliveries', params);
export const getSalesDeliveryById = (id) => api.get(`/sales-deliveries/${id}`);
export const createSalesDelivery = (data) => api.post('/sales-deliveries', data);
export const updateDeliveryStatus = (id, status) => api.patch(`/sales-deliveries/${id}/status`, { status });
export const deleteSalesDelivery = (id) => api.delete(`/sales-deliveries/${id}`);

// PHP-compatible aliases
export const addSalesDelivery = createSalesDelivery;
export const getSalesDeliveryDetails = getSalesDeliveryById;
export const getSalesDeliveriesPaginated = (params) => getAllSalesDeliveries(params);
export const getAppSalesDeliveries = (params) => getAllSalesDeliveries(params);
export const getPendingSalesOrders = (params) => api.get('/sales-orders', { status: 'Approved', ...params });
export const updateSalesDelivery = (id, data) => api.put('/sales-deliveries/' + id, data);
export const deleteDelivery = deleteSalesDelivery;
