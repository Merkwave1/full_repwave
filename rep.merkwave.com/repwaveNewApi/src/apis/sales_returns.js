import axiosInstance from '../utils/axiosInstance.js';
import { api } from '../utils/axiosInstance.js';

export const getAllSalesReturns = async (params) => {
  const res = await axiosInstance.get('/sales-returns', { params });
  const paged = res.data?.data; // PagedResult<SalesReturnDto>
  return {
    data: paged?.data || [],
    pagination: {
      total_items: paged?.total_count ?? 0,
      current_page: paged?.page ?? 1,
      per_page: paged?.page_size ?? (params?.limit || 20),
      total_pages: paged?.total_pages ?? 1,
    },
  };
};
export const createSalesReturn = (data) => api.post('/sales-returns', data);
export const updateSalesReturnStatus = (id, status) => api.patch(`/sales-returns/${id}/status`, { status });
export const deleteSalesReturn = (id) => api.delete(`/sales-returns/${id}`);

// PHP-compatible aliases
export const addSalesReturn = createSalesReturn;
export const getSalesReturnDetails = (id) => api.get('/sales-returns/' + id);
export const updateSalesReturn = updateSalesReturnStatus;
