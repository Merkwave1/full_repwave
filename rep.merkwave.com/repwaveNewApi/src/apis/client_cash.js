import axios from 'axios';
import { api, getToken } from '../utils/axiosInstance.js';

// Returns full paged data as { movements, totals, pagination } shaped object
export async function getClientCash(params) {
  const token = getToken();
  const res = await axios.get('/api/financial-transactions', {
    params,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const inner = res.data?.data ?? res.data;
  const list = Array.isArray(inner?.data) ? inner.data : Array.isArray(inner) ? inner : [];
  const payments = list.filter(m => m.financial_transactions_type === 'payment');
  const refunds = list.filter(m => m.financial_transactions_type === 'refund');
  return {
    movements: list,
    totals: {
      payments_total: payments.length,
      refunds_total: refunds.length,
      overall_total: inner?.total_count ?? list.length,
      payments_amount_total: payments.reduce((s, m) => s + Number(m.financial_transactions_amount ?? 0), 0),
      refunds_amount_total: refunds.reduce((s, m) => s + Number(m.financial_transactions_amount ?? 0), 0),
    },
    pagination: {
      total_count: inner?.total_count ?? list.length,
      total_pages: inner?.total_pages ?? 1,
      page: inner?.page ?? 1,
    },
  };
}

export const createClientPayment = (data) => api.post('/financial-transactions', data);
export const deleteClientPayment = (id) => api.delete(`/financial-transactions/${id}`);

// PHP-compatible alias
export const getClientCashMovements = (params) => getClientCash(params);
