import { api } from '../utils/axiosInstance.js';

function toInt(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeOrderDate(value) {
  if (!value) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  return s.includes('T') ? s : s.replace(' ', 'T');
}

/** Normalize form or legacy field names into .NET CreateSalesOrderRequest shape. */
export function normalizeSalesOrderPayload(data = {}, options = {}) {
  const { includeStatus = false } = options;
  const items = (Array.isArray(data.items) ? data.items : [])
    .map((item) => ({
      variant_id: toInt(item.variant_id ?? item.sales_order_items_variant_id),
      packaging_type_id: toInt(
        item.packaging_type_id ?? item.sales_order_items_packaging_type_id,
      ),
      quantity:
        parseInt(
          item.quantity ??
            item.sales_order_items_quantity ??
            item.quantity_ordered,
          10,
        ) || 0,
      unit_price:
        parseFloat(
          item.unit_price ??
            item.sales_order_items_unit_price ??
            item.unit_cost ??
            0,
        ) || 0,
      discount_amount:
        parseFloat(
          item.discount_amount ?? item.sales_order_items_discount_amount ?? 0,
        ) || 0,
      tax_rate:
        parseFloat(item.tax_rate ?? item.sales_order_items_tax_rate ?? 0) || 0,
      has_tax: Boolean(item.has_tax ?? item.sales_order_items_has_tax ?? false),
    }))
    .filter((item) => item.variant_id && item.quantity > 0);

  const clientId = toInt(data.client_id ?? data.sales_orders_client_id);
  if (!clientId) {
    throw new Error('يجب اختيار العميل قبل حفظ أمر البيع');
  }
  if (items.length === 0) {
    throw new Error('يجب إضافة عنصر واحد على الأقل للطلب');
  }

  const payload = {
    client_id: clientId,
    warehouse_id: toInt(data.warehouse_id ?? data.sales_orders_warehouse_id),
    visit_id: toInt(data.visit_id ?? data.sales_orders_visit_id) ?? null,
    order_date: normalizeOrderDate(
      data.order_date ?? data.sales_orders_order_date,
    ),
    notes: data.notes ?? data.sales_orders_notes ?? null,
    items,
  };

  const status = data.status ?? data.sales_orders_status;
  const deliveryStatus =
    data.delivery_status ?? data.sales_orders_delivery_status;
  if (includeStatus) {
    if (status) payload.status = status;
    if (deliveryStatus) payload.delivery_status = deliveryStatus;
  }

  return payload;
}

function normalizeSalesOrderItem(item = {}) {
  return {
    ...item,
    sales_order_items_id: item.sales_order_items_id ?? item.id,
    sales_order_items_variant_id:
      item.sales_order_items_variant_id ??
      item.variant_id ??
      item.product_variant_id,
    sales_order_items_packaging_type_id:
      item.sales_order_items_packaging_type_id ?? item.packaging_type_id,
    sales_order_items_quantity:
      item.sales_order_items_quantity ?? item.quantity ?? 0,
    sales_order_items_unit_price:
      item.sales_order_items_unit_price ?? item.unit_price ?? 0,
    sales_order_items_discount_amount:
      item.sales_order_items_discount_amount ?? item.discount_amount ?? 0,
    sales_order_items_tax_amount:
      item.sales_order_items_tax_amount ?? item.tax_amount ?? 0,
    sales_order_items_tax_rate:
      item.sales_order_items_tax_rate ?? item.tax_rate ?? 0,
    sales_order_items_has_tax:
      item.sales_order_items_has_tax ?? item.has_tax ?? false,
    sales_order_items_total_price:
      item.sales_order_items_total_price ?? item.total_price ?? 0,
    sales_order_items_notes:
      item.sales_order_items_notes ?? item.notes ?? null,
    delivered_quantity:
      item.delivered_quantity ?? item.quantity_delivered ?? 0,
    returned_quantity:
      item.returned_quantity ??
      item.sales_order_items_returned_quantity ??
      item.ReturnedQuantity ??
      0,
    quantity_returnable:
      item.quantity_returnable ??
      Math.max(
        0,
        parseFloat(item.sales_order_items_quantity ?? item.quantity ?? 0) -
          parseFloat(
            item.returned_quantity ??
              item.sales_order_items_returned_quantity ??
              item.ReturnedQuantity ??
              0,
          ),
      ),
    quantity_pending:
      item.quantity_pending ??
      Math.max(
        0,
        parseFloat(item.sales_order_items_quantity ?? item.quantity ?? 0) -
          parseFloat(item.delivered_quantity ?? item.quantity_delivered ?? 0),
      ),
    products_name: item.products_name ?? item.product_name,
    variant_name: item.variant_name ?? item.product_variant_name,
    variant_sku: item.variant_sku ?? item.products_sku,
    packaging_types_name:
      item.packaging_types_name ?? item.packaging_type_name,
    base_units_name: item.base_units_name,
  };
}

export function normalizeSalesOrderDetail(row = {}) {
  const items = Array.isArray(row.items)
    ? row.items.map(normalizeSalesOrderItem)
    : [];
  return {
    ...row,
    sales_orders_id: row.sales_orders_id ?? row.id,
    sales_orders_client_id:
      row.sales_orders_client_id ?? row.client_id ?? row.clients_id,
    sales_orders_warehouse_id:
      row.sales_orders_warehouse_id ?? row.warehouse_id,
    clients_company_name:
      row.clients_company_name ?? row.client_name ?? row.client_company_name,
    clients_address: row.clients_address ?? row.client_address,
    warehouse_name: row.warehouse_name,
    items,
    items_count: row.items_count ?? items.length,
  };
}

export const getAllSalesOrders = (params) => api.get('/sales-orders', params);
export const getDeliverableSalesOrders = () => api.get('/sales-orders', { deliveryStatus: 'Not Delivered', status: 'Approved' });
export async function getSalesOrderById(id) {
  const row = await api.get(`/sales-orders/${id}`);
  return normalizeSalesOrderDetail(row);
}
export async function createSalesOrder(data) {
  return api.post('/sales-orders', normalizeSalesOrderPayload(data));
}
export async function updateSalesOrder(id, data) {
  return api.put(
    `/sales-orders/${id}`,
    normalizeSalesOrderPayload(data, { includeStatus: true }),
  );
}
export const updateSalesOrderStatus = (id, status) => api.patch(`/sales-orders/${id}/status`, { status });
export const deleteSalesOrder = (id) => api.delete(`/sales-orders/${id}`);

// PHP-compatible aliases
export const addSalesOrder = createSalesOrder;
export const getSalesOrderDetails = getSalesOrderById;
export const getSalesOrdersByClient = (clientId, params) => api.get('/sales-orders', { clientId, ...params });
export const updateSalesOrderDeliveryStatus = (id, status) => api.patch('/sales-orders/' + id + '/status', { status });
