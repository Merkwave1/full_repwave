import { api } from '../utils/axiosInstance.js';
export const getAllSalesOrders = (params) => api.get('/sales-orders', params);
export const getDeliverableSalesOrders = () => api.get('/sales-orders', { deliveryStatus: 'Not Delivered', status: 'Approved' });
export const getSalesOrderById = (id) => api.get(`/sales-orders/${id}`);
export const createSalesOrder = (data) => api.post('/sales-orders', data);
export const updateSalesOrder = (id, data) => api.put(`/sales-orders/${id}`, data);
export const updateSalesOrderStatus = (id, status) => api.patch(`/sales-orders/${id}/status`, { status });
export const deleteSalesOrder = (id) => api.delete(`/sales-orders/${id}`);

// PHP-compatible aliases
export const addSalesOrder = createSalesOrder;
export const getSalesOrderDetails = getSalesOrderById;
export const getSalesOrdersByClient = (clientId, params) => api.get('/sales-orders', { clientId, ...params });
export const updateSalesOrderDeliveryStatus = (id, status) => api.patch('/sales-orders/' + id + '/status', { status });
