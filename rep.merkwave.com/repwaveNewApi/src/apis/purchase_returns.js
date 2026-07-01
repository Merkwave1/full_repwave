import axiosInstance, { api } from '../utils/axiosInstance.js';

function normalizePurchaseReturn(row = {}) {
  return {
    ...row,
    purchase_returns_id: row.purchase_returns_id ?? row.purchase_return_id,
    purchase_returns_supplier_id:
      row.purchase_returns_supplier_id ?? row.supplier_id,
    purchase_returns_purchase_order_id:
      row.purchase_returns_purchase_order_id ?? row.purchase_order_id,
    purchase_returns_warehouse_id:
      row.purchase_returns_warehouse_id ?? row.warehouse_id,
    purchase_returns_total_amount:
      row.purchase_returns_total_amount ?? row.total_amount,
    purchase_returns_date: row.purchase_returns_date ?? row.date,
    purchase_returns_status: row.purchase_returns_status ?? row.status,
    purchase_returns_notes: row.purchase_returns_notes ?? row.notes,
    purchase_returns_reason: row.purchase_returns_reason ?? row.reason,
  };
}

export async function getPurchaseReturns(params) {
  const list = (await api.get('/purchase-returns', params)) || [];
  return Array.isArray(list) ? list.map(normalizePurchaseReturn) : [];
}

export const createPurchaseReturn = (data) => api.post('/purchase-returns', data);
export const updatePurchaseReturn = (id, data) => api.put(`/purchase-returns/${id}`, data);
export const updatePurchaseReturnStatus = (id, status) =>
  api.patch(`/purchase-returns/${id}/status`, { status });
export const deletePurchaseReturn = (id) => api.delete(`/purchase-returns/${id}`);

export const addPurchaseReturnSimple = createPurchaseReturn;
export const addPurchaseReturn = createPurchaseReturn;

export async function getPurchaseReturnDetails(id) {
  const row = await api.get('/purchase-returns/' + id);
  if (!row) return null;

  const header = row.purchase_return ?? row;
  const items = Array.isArray(row.items)
    ? row.items
    : Array.isArray(header.items)
      ? header.items
      : [];

  return {
    ...header,
    items,
    purchase_return: header,
  };
}

export async function getPurchaseReturnsPaginated(params = {}) {
  const { limit, pageSize, page = 1, ...rest } = params;
  const size = pageSize ?? limit ?? 20;
  const res = await axiosInstance.get('/purchase-returns', { params: rest });
  const inner = res.data?.data ?? res.data;
  const list = (
    Array.isArray(inner?.data) ? inner.data : Array.isArray(inner) ? inner : []
  ).map(normalizePurchaseReturn);
  const start = (page - 1) * size;
  const paged = list.slice(start, start + size);

  return {
    data: paged,
    pagination: {
      page,
      per_page: size,
      total: list.length,
      total_pages: Math.max(1, Math.ceil(list.length / size)),
    },
  };
}
