import axiosInstance, { api } from '../utils/axiosInstance.js';

export function normalizeSupplierPayment(row = {}) {
  return {
    ...row,
    supplier_payments_id: row.supplier_payments_id ?? row.supplier_payment_id,
    supplier_payments_supplier_id:
      row.supplier_payments_supplier_id ?? row.supplier_id,
    supplier_payments_amount: row.supplier_payments_amount ?? row.amount,
    supplier_payments_date: row.supplier_payments_date ?? row.payment_date,
    supplier_payments_notes: row.supplier_payments_notes ?? row.notes,
    supplier_payments_safe_id: row.supplier_payments_safe_id ?? row.safe_id,
    supplier_payments_payment_method_id:
      row.supplier_payments_payment_method_id ?? row.payment_method_id,
    supplier_name: row.supplier_name,
    safe_name: row.safe_name ?? row.safes_name,
    payment_method_name:
      row.payment_method_name ?? row.payment_methods_name,
  };
}

export async function getSupplierPayments(params = {}) {
  const { limit, pageSize, page = 1, offset, ...rest } = params;
  const size = pageSize ?? limit ?? 20;
  const pageNum = offset != null ? Math.floor(offset / size) + 1 : page;
  const res = await axiosInstance.get('/supplier-payments', {
    params: { page: pageNum, pageSize: size, ...rest },
  });
  const inner = res.data?.data ?? res.data;
  const list = (
    Array.isArray(inner?.data) ? inner.data : Array.isArray(inner) ? inner : []
  ).map(normalizeSupplierPayment);

  return {
    supplier_payments: list,
    total_count: inner?.total_count ?? list.length,
    pagination: {
      page: inner?.page ?? pageNum,
      per_page: inner?.page_size ?? size,
      total: inner?.total_count ?? list.length,
      total_pages:
        inner?.total_pages ??
        Math.max(1, Math.ceil((inner?.total_count ?? list.length) / size)),
    },
  };
}

export const createSupplierPayment = (data) => api.post('/supplier-payments', data);
export const deleteSupplierPayment = (id) => api.delete(`/supplier-payments/${id}`);

export const addSupplierPayment = createSupplierPayment;
export async function getSupplierPaymentDetails(id) {
  const row = await api.get(`/supplier-payments/${id}`);
  return normalizeSupplierPayment(row);
}
export const updateSupplierPayment = (id, data) =>
  api.put('/supplier-payments/' + id, data);
