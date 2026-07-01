import axiosInstance from '../utils/axiosInstance.js';
import { api } from '../utils/axiosInstance.js';

function normalizeSalesReturnListItem(row = {}) {
  const returnDate =
    row.returns_date ??
    row.returns_return_date ??
    row.return_date ??
    row.returns_created_at ??
    null;
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    ...row,
    returns_id: row.returns_id ?? row.ReturnsId ?? row.id,
    returns_date: returnDate,
    returns_return_date: returnDate,
    return_date: returnDate,
    items_count: row.items_count ?? items.length,
  };
}

export const getAllSalesReturns = async (params) => {
  const res = await axiosInstance.get('/sales-returns', { params });
  const paged = res.data?.data; // PagedResult<SalesReturnDto>
  const list = (paged?.data || []).map(normalizeSalesReturnListItem);
  return {
    data: list,
    pagination: {
      total_items: paged?.total_count ?? 0,
      current_page: paged?.page ?? 1,
      per_page: paged?.page_size ?? (params?.limit || 20),
      total_pages: paged?.total_pages ?? 1,
    },
  };
};

function toInt(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

function toIntOrNull(value) {
  const n = toInt(value);
  return n > 0 ? n : null;
}

function toDecimal(value) {
  const n = parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

/** Map form payloads to .NET CreateSalesReturnRequest. */
export function normalizeCreateSalesReturnPayload(data = {}) {
  const clientId = toInt(data.client_id ?? data.returns_client_id);
  if (!clientId) {
    throw new Error('يجب اختيار العميل');
  }

  const items = (Array.isArray(data.items) ? data.items : [])
    .map((item) => {
      const itemId = toInt(
        item.sales_order_item_id ??
          item.return_items_sales_order_item_id ??
          item.sales_order_items_id ??
          item.id,
      );
      const qty = toInt(item.quantity ?? item.return_items_quantity ?? 0);
      const unitPrice = toDecimal(
        item.unit_price ?? item.return_items_unit_price ?? 0,
      );
      return {
        sales_order_item_id: itemId,
        quantity: qty,
        unit_price: unitPrice,
        notes: item.notes ?? item.return_items_notes ?? null,
      };
    })
    .filter((item) => item.sales_order_item_id > 0 && item.quantity > 0);

  if (items.length === 0) {
    throw new Error('يجب إضافة منتج واحد على الأقل للمرتجع');
  }

  return {
    client_id: clientId,
    sales_order_id: toIntOrNull(
      data.sales_order_id ?? data.returns_sales_order_id,
    ),
    reason: data.reason ?? data.returns_reason ?? null,
    notes: data.notes ?? data.returns_notes ?? null,
    items,
  };
}

export async function createSalesReturn(data) {
  return api.post(
    '/sales-returns',
    normalizeCreateSalesReturnPayload(data),
  );
}

export const updateSalesReturnStatus = (id, status) =>
  api.patch(`/sales-returns/${id}/status`, { status });
export const deleteSalesReturn = (id) => api.delete(`/sales-returns/${id}`);

// PHP-compatible aliases
export const addSalesReturn = createSalesReturn;
export const getSalesReturnDetails = (id) => api.get('/sales-returns/' + id);
export const updateSalesReturn = updateSalesReturnStatus;
