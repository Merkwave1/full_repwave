import { api } from '../utils/axiosInstance.js';
export const getAllGoodsReceipts = (params) => api.get('/goods-receipts', params);
export const getGoodsReceiptById = (id) => api.get(`/goods-receipts/${id}`);
export const createGoodsReceipt = (data) => api.post('/goods-receipts', data);
export const deleteGoodsReceipt = (id) => api.delete(`/goods-receipts/${id}`);

// PHP-compatible aliases
export const addGoodsReceipt = createGoodsReceipt;
export const getGoodsReceiptsPaginated = (params) => getAllGoodsReceipts(params);
export const getGoodsReceipt = getGoodsReceiptById;
