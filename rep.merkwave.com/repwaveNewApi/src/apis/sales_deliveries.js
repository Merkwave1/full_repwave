import axiosInstance, { api } from '../utils/axiosInstance.js';

export function unwrapApiList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

export function normalizeSalesDelivery(delivery = {}) {
  const salesOrder = delivery.sales_order ?? {};
  const deliveryDate =
    delivery.sales_deliveries_delivery_date ??
    delivery.sales_deliveries_date ??
    delivery.delivery_date ??
    null;
  return {
    ...delivery,
    sales_deliveries_date: deliveryDate,
    sales_deliveries_delivery_date: deliveryDate,
    sales_deliveries_warehouse_id:
      delivery.sales_deliveries_warehouse_id ??
      salesOrder.sales_orders_warehouse_id,
    sales_deliveries_client_id:
      delivery.sales_deliveries_client_id ?? salesOrder.sales_orders_client_id,
    sales_orders_client_id:
      delivery.sales_orders_client_id ?? salesOrder.sales_orders_client_id,
    clients_company_name:
      delivery.clients_company_name ?? salesOrder.clients_company_name,
  };
}

export const getAllSalesDeliveries = (params) => api.get('/sales-deliveries', params);

export const getSalesDeliveryById = async (id) => {
  const delivery = await api.get(`/sales-deliveries/${id}`);
  return normalizeSalesDelivery(delivery);
};

function toInt(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDeliveryDate(value) {
  if (!value) return new Date().toISOString();
  const s = String(value).trim();
  if (!s) return new Date().toISOString();
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return s;
  return s.includes('T') ? `${s}Z` : `${s.replace(' ', 'T')}Z`;
}

/** Map legacy / form payloads to .NET CreateSalesDeliveryRequest. */
export function normalizeCreateSalesDeliveryPayload(data = {}) {
  const items = (Array.isArray(data.items) ? data.items : [])
    .map((item) => {
      const itemId = toInt(
        item.sales_order_item_id ??
          item.sales_order_items_id ??
          item.id,
      );
      const qty = toInt(
        item.quantity_delivered ?? item.quantity ?? item.qty ?? 0,
      );
      return {
        sales_order_item_id: itemId,
        quantity_delivered: qty,
      };
    })
    .filter(
      (item) => item.sales_order_item_id > 0 && item.quantity_delivered > 0,
    );

  const salesOrderId = toInt(data.sales_order_id ?? data.sales_orders_id);
  if (!salesOrderId) {
    throw new Error('sales_order_id is required');
  }
  if (items.length === 0) {
    throw new Error('يجب تحديد كمية واحدة على الأقل للتسليم');
  }

  return {
    sales_order_id: salesOrderId,
    delivery_status: data.delivery_status || 'Preparing',
    delivery_date: normalizeDeliveryDate(
      data.delivery_date ?? data.sales_deliveries_date,
    ),
    notes: data.notes ?? data.delivery_notes ?? data.delivery_address ?? null,
    items,
  };
}

export async function createSalesDelivery(data) {
  return api.post(
    '/sales-deliveries',
    normalizeCreateSalesDeliveryPayload(data),
  );
}
export const updateDeliveryStatus = (id, status) =>
  api.patch(`/sales-deliveries/${id}/status`, { status });
export const deleteSalesDelivery = (id) => api.delete(`/sales-deliveries/${id}`);

export const addSalesDelivery = createSalesDelivery;
export const getSalesDeliveryDetails = getSalesDeliveryById;

export async function getSalesDeliveriesPaginated(params = {}) {
  const { limit, pageSize, page = 1, forceRefresh: _forceRefresh, ...rest } = params;
  const res = await axiosInstance.get('/sales-deliveries', { params: rest });
  const inner = res.data?.data ?? res.data;
  const list = Array.isArray(inner?.data)
    ? inner.data
    : Array.isArray(inner)
      ? inner
      : [];

  const normalized = list.map(normalizeSalesDelivery);
  const size = pageSize ?? limit ?? 20;
  const start = (page - 1) * size;
  const paged = normalized.slice(start, start + size);

  return {
    data: paged,
    pagination: {
      page,
      per_page: size,
      total: normalized.length,
      total_pages: Math.max(1, Math.ceil(normalized.length / size)),
    },
  };
}

export const getAppSalesDeliveries = getAllSalesDeliveries;

export async function getPendingSalesOrdersForDelivery() {
  const raw = await api.get('/sales-orders/pending-for-delivery');
  return unwrapApiList(raw);
}

export const getPendingSalesOrders = getPendingSalesOrdersForDelivery;
export const updateSalesDelivery = (id, data) => api.put('/sales-deliveries/' + id, data);
export const deleteDelivery = deleteSalesDelivery;
