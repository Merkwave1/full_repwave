import { api } from '../utils/axiosInstance.js';
export const getClientInterestedProducts = (clientId) => api.get(`/clients/${clientId}/interested-products`);
export const addClientInterestedProduct = (clientId, productId) => api.post(`/clients/${clientId}/interested-products/${productId}`);
export const removeClientInterestedProduct = (clientId, productId) => api.delete(`/clients/${clientId}/interested-products/${productId}`);
