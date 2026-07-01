import axiosInstance from '../utils/axiosInstance.js';
import { api } from '../utils/axiosInstance.js';

export function normalizeSafeTransaction(row) {
  if (!row || typeof row !== 'object') return null;
  const id = row.safe_transactions_id ?? row.safeTransactionsId;
  if (id == null) return null;

  const statusRaw = String(
    row.safe_transactions_status ?? row.safeTransactionsStatus ?? 'completed',
  ).toLowerCase();

  return {
    safe_transactions_id: id,
    safe_transactions_safe_id:
      row.safe_transactions_safe_id ?? row.safeTransactionsSafeId ?? null,
    safe_name: row.safe_name ?? row.safeName ?? null,
    safe_transactions_type:
      row.safe_transactions_type ?? row.safeTransactionsType ?? null,
    safe_transactions_amount:
      row.safe_transactions_amount ?? row.safeTransactionsAmount ?? 0,
    safe_transactions_balance_before:
      row.safe_transactions_balance_before ??
      row.safeTransactionsBalanceBefore ??
      0,
    safe_transactions_balance_after:
      row.safe_transactions_balance_after ??
      row.safeTransactionsBalanceAfter ??
      0,
    safe_transactions_description:
      row.safe_transactions_description ?? row.safeTransactionsDescription ?? '',
    safe_transactions_reference:
      row.safe_transactions_reference ?? row.safeTransactionsReference ?? '',
    safe_transactions_date:
      row.safe_transactions_date ?? row.safeTransactionsDate ?? null,
    safe_transactions_status:
      statusRaw === 'completed' ? 'approved' : statusRaw,
    safe_transactions_related_table:
      row.safe_transactions_related_table ??
      row.safeTransactionsRelatedTable ??
      null,
    payment_method_name: row.payment_method_name ?? row.paymentMethodName ?? null,
    payment_method_type: row.payment_method_type ?? row.paymentMethodType ?? null,
  };
}

export function normalizeSafeTransactionList(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.transactions ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSafeTransaction).filter(Boolean);
}

export const getSafeTransactions = (params) => api.get('/safes/transactions', params);

export const createSafeTransaction = (data) => api.post('/safes/transactions', data);

export const addSafeTransaction = createSafeTransaction;

export async function getSafeTransactionsPaginated(params = {}) {
  const page = Number(params.page ?? 1);
  const pageSize = Number(params.pageSize ?? params.limit ?? 20);

  const res = await axiosInstance.get('/safes/transactions', {
    params: {
      safeId: params.safeId,
      page,
      pageSize,
    },
  });

  const paged = res.data?.data;
  const items = normalizeSafeTransactionList(
    Array.isArray(paged?.data) ? paged.data : paged,
  );

  return {
    data: items,
    pagination: {
      total: paged?.total_count ?? paged?.totalCount ?? items.length,
      page: paged?.page ?? page,
      per_page: paged?.page_size ?? paged?.pageSize ?? pageSize,
      total_pages:
        paged?.total_pages ??
        paged?.totalPages ??
        Math.max(1, Math.ceil((paged?.total_count ?? items.length) / pageSize)),
    },
  };
}

export const getSafeTransactionDetails = (id) =>
  api.get('/safes/transactions/' + id);
export const updateTransactionStatus = (id, status) =>
  api.patch('/safes/transactions/' + id + '/status', { status });
