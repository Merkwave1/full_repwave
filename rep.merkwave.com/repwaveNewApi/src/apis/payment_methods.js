import { api } from '../utils/axiosInstance.js';

function normalizePaymentMethod(row) {
  if (!row || typeof row !== 'object') return null;
  const id = row.payment_methods_id ?? row.paymentMethodsId ?? row.id;
  if (id == null) return null;
  return {
    payment_methods_id: id,
    payment_methods_name:
      row.payment_methods_name ?? row.paymentMethodsName ?? row.name ?? '',
    payment_methods_type:
      row.payment_methods_type ?? row.paymentMethodsType ?? row.type ?? 'cash',
    payment_methods_description:
      row.payment_methods_description ??
      row.paymentMethodsDescription ??
      row.description ??
      '',
  };
}

export function normalizePaymentMethodList(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.payment_methods ?? payload?.data ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePaymentMethod).filter(Boolean);
}

/** Returns `{ payment_methods: [...] }` for legacy callers */
export async function getPaymentMethods() {
  const result = await api.get('/lookups/payment-methods');
  return { payment_methods: normalizePaymentMethodList(result) };
}

// PHP-compatible CRUD
export const getPaymentMethodDetails = (id) =>
  api.get('/lookups/payment-methods/' + id);
export const addPaymentMethod = (data) =>
  api.post('/lookups/payment-methods', data);
export const updatePaymentMethod = (id, data) =>
  api.put('/lookups/payment-methods/' + id, data);
export const deletePaymentMethod = (id) =>
  api.delete('/lookups/payment-methods/' + id);
