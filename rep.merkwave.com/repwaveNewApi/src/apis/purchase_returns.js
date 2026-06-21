import { api } from '../utils/axiosInstance.js';
export const getPurchaseReturns = (params) => api.get('/purchase-returns', params);
export const createPurchaseReturn = (data) => api.post('/purchase-returns', data);
export const updatePurchaseReturnStatus = (id, status) => api.patch(`/purchase-returns/${id}/status`, { status });
export const deletePurchaseReturn = (id) => api.delete(`/purchase-returns/${id}`);

// PHP-compatible aliases
export const addPurchaseReturnSimple = createPurchaseReturn;
export const addPurchaseReturn = createPurchaseReturn;
export const getPurchaseReturnDetails = (id) => api.get('/purchase-returns/' + id);
export const getPurchaseReturnsPaginated = (params) => getPurchaseReturns(params);
export const updatePurchaseReturn = updatePurchaseReturnStatus;
