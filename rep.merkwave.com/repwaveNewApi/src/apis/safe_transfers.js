import axiosInstance from '../utils/axiosInstance.js';
import { api } from '../utils/axiosInstance.js';

export function normalizeSafeTransfer(row) {
  if (!row || typeof row !== 'object') return null;
  const id = row.safe_transfer_id ?? row.safeTransferId ?? row.id;
  if (id == null) return null;

  const statusRaw = String(row.status ?? 'completed').toLowerCase();
  const status = statusRaw === 'completed' ? 'approved' : statusRaw;

  return {
    safe_transfer_id: id,
    from_safe_id: row.from_safe_id ?? row.fromSafeId,
    from_safe_name: row.from_safe_name ?? row.fromSafeName,
    to_safe_id: row.to_safe_id ?? row.toSafeId,
    to_safe_name: row.to_safe_name ?? row.toSafeName,
    amount: Number(row.amount ?? 0),
    notes: row.notes ?? null,
    status,
    created_by: row.created_by ?? row.createdBy ?? null,
    transfer_date: row.transfer_date ?? row.transferDate ?? row.created_at ?? row.createdAt,
    created_at: row.created_at ?? row.createdAt ?? null,
  };
}

export async function getSafeTransfersPaginated(params = {}) {
  const res = await axiosInstance.get('/safes/transfers', {
    params: { safeId: params.safeId },
  });
  const inner = res.data?.data ?? res.data;
  const list = normalizeSafeTransferList(inner);

  const page = Number(params.page || 1);
  const limit = Number(params.limit || params.pageSize || 10);
  const total = list.length;
  const start = (page - 1) * limit;

  return {
    data: list.slice(start, start + limit),
    pagination: {
      total,
      page,
      per_page: limit,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export function normalizeSafeTransferList(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.transfers ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSafeTransfer).filter(Boolean);
}

export const getSafeTransfers = async (params) => {
  const result = await getSafeTransfersPaginated(params);
  return result.data;
};

export const createSafeTransfer = (data) => api.post('/safes/transfers', data);

export const addSafeTransfer = createSafeTransfer;
export const getSafeTransferDetails = (id) => api.get('/safes/transfers/' + id);
