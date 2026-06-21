import { api } from '../utils/axiosInstance.js';
export const getAllFinancialTransactions = (params) => api.get('/financial-transactions', params);
export const createFinancialTransaction = (data) => api.post('/financial-transactions', data);
export const deleteFinancialTransaction = (id) => api.delete(`/financial-transactions/${id}`);
// PHP-compatible aliases
export const getFinancialTransactions = getAllFinancialTransactions;
export const getTransactionsSummary = (params) => api.get('/financial-transactions', params);