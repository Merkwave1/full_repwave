import { api } from '../utils/axiosInstance.js';
export const getAllPurchaseOrders = (params) => api.get('/purchase-orders', params);
export const getPurchaseOrderById = (id) => api.get(`/purchase-orders/${id}`);
export const createPurchaseOrder = (data) => api.post('/purchase-orders', data);
export const updatePurchaseOrder = (id, data) => api.put(`/purchase-orders/${id}`, data);
export const updatePurchaseOrderStatus = (id, status) => api.patch(`/purchase-orders/${id}/status`, { status });
export const deletePurchaseOrder = (id) => api.delete(`/purchase-orders/${id}`);

// PHP-compatible aliases
export const addPurchaseOrder = createPurchaseOrder;
export const getPurchaseOrdersPaginated = (params) => getAllPurchaseOrders(params);
export const getPurchaseOrderDetails = getPurchaseOrderById;
export const getPurchaseOrdersBySupplier = (supplierId, params) => api.get('/purchase-orders', { supplierId, ...params });
export const getPurchaseOrderItemReturnInfo = (id) => api.get('/purchase-orders/' + id);
export const getPendingPurchaseOrdersForReceive = (params) => api.get('/purchase-orders', { status: 'Approved', ...params });
export const getReturnableQuantities = (purchaseOrderId) => api.get('/purchase-orders/' + purchaseOrderId);
export const getAvailableBatches = (params) => api.get('/goods-receipts', params);
