import axiosInstance from '../utils/axiosInstance.js';
import { api } from '../utils/axiosInstance.js';
export const getSafeTransactions = (params) => api.get('/safes/transactions', params);
export const createSafeTransaction = (data) => api.post('/safes/transactions', data);

// PHP-compatible aliases
export const addSafeTransaction = createSafeTransaction;
export const getSafeTransactionsPaginated = async (params) => {
  const res = await axiosInstance.get('/safes/transactions', { params });
  const paged = res.data?.data; // PagedResult<SafeTransactionDto>
  return {
    data: paged?.data || [],
    pagination: {
      total: paged?.total_count ?? 0,
      page: paged?.page ?? 1,
      per_page: paged?.page_size ?? (params?.limit || 20),
      total_pages: paged?.total_pages ?? 1,
    },
  };
};
export const getSafeTransactionDetails = (id) => api.get('/safes/transactions/' + id);
export const updateTransactionStatus = (id, status) => api.patch('/safes/transactions/' + id + '/status', { status });
