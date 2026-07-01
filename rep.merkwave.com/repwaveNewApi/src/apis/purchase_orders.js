import axiosInstance, { api } from '../utils/axiosInstance.js';

export const getAllPurchaseOrders = (params) => api.get('/purchase-orders', params);

function normalizePurchaseOrderItem(item = {}) {
  return {
    ...item,
    purchase_order_items_id: item.purchase_order_items_id,
    purchase_order_items_variant_id: item.purchase_order_items_variant_id,
    purchase_order_items_packaging_type_id: item.purchase_order_items_packaging_type_id,
    purchase_order_items_quantity_ordered:
      item.purchase_order_items_quantity_ordered ?? item.purchase_order_items_quantity,
    purchase_order_items_quantity_received: item.purchase_order_items_quantity_received ?? 0,
    purchase_order_items_quantity_returned: item.purchase_order_items_quantity_returned ?? 0,
    purchase_order_items_unit_cost:
      item.purchase_order_items_unit_cost ?? item.purchase_order_items_unit_price,
    purchase_order_items_total_cost: item.purchase_order_items_total_cost,
    product_name: item.products_name ?? item.product_name,
    product_variant_name: item.variant_name ?? item.product_variant_name,
    packaging_type_name: item.packaging_types_name ?? item.packaging_type_name,
    base_unit_name: item.base_units_name ?? item.base_unit_name,
  };
}

export function normalizePurchaseOrderDetail(row = {}) {
  const items = Array.isArray(row.items) ? row.items.map(normalizePurchaseOrderItem) : [];
  return {
    ...row,
    purchase_orders_id: row.purchase_orders_id ?? row.purchase_order_id,
    purchase_orders_supplier_id:
      row.purchase_orders_supplier_id ?? row.purchase_order_supplier_id,
    purchase_orders_warehouse_id:
      row.purchase_orders_warehouse_id ?? row.purchase_order_warehouse_id,
    purchase_orders_order_date:
      row.purchase_orders_order_date ?? row.purchase_order_date,
    purchase_orders_total_amount:
      row.purchase_orders_total_amount ?? row.purchase_order_total_amount,
    purchase_orders_status: row.purchase_orders_status ?? row.purchase_order_status,
    purchase_orders_notes: row.purchase_orders_notes ?? row.purchase_order_notes,
    supplier_name: row.supplier_name,
    warehouse_name: row.warehouse_name,
    items,
    items_count: row.items_count ?? items.length,
  };
}

export async function getPurchaseOrderById(id) {
  const row = await api.get(`/purchase-orders/${id}`);
  return normalizePurchaseOrderDetail(row);
}

export const createPurchaseOrder = (data) => api.post('/purchase-orders', data);
export const updatePurchaseOrder = (id, data) => api.put(`/purchase-orders/${id}`, data);
export const updatePurchaseOrderStatus = (id, status) =>
  api.patch(`/purchase-orders/${id}/status`, { status });
export const deletePurchaseOrder = (id) => api.delete(`/purchase-orders/${id}`);

export async function getPurchaseOrdersPaginated(params = {}) {
  const { limit, pageSize, page = 1, ...rest } = params;
  const size = pageSize ?? limit ?? 20;
  const res = await axiosInstance.get('/purchase-orders', {
    params: { page, pageSize: size, ...rest },
  });
  const inner = res.data?.data ?? res.data;
  const list = Array.isArray(inner?.data)
    ? inner.data
    : Array.isArray(inner)
      ? inner
      : [];

  return {
    data: list,
    pagination: {
      page: inner?.page ?? page,
      per_page: inner?.page_size ?? size,
      total: inner?.total_count ?? list.length,
      total_pages:
        inner?.total_pages ??
        Math.max(1, Math.ceil((inner?.total_count ?? list.length) / size)),
    },
  };
}

// PHP-compatible aliases
export const addPurchaseOrder = createPurchaseOrder;
export const getPurchaseOrderDetails = getPurchaseOrderById;

export const getPurchaseOrdersBySupplier = async (supplierId, statusOrParams, limit = 20) => {
  const extra =
    typeof statusOrParams === 'string'
      ? { status: statusOrParams }
      : statusOrParams && typeof statusOrParams === 'object'
        ? statusOrParams
        : {};
  const list = await api.get('/purchase-orders', {
    supplierId,
    pageSize: limit,
    ...extra,
  });
  return Array.isArray(list) ? list : [];
};

export async function getReturnableQuantities(purchaseOrderId) {
  const data = await api.get(
    `/purchase-orders/${purchaseOrderId}/returnable-quantities`,
  );
  if (Array.isArray(data?.items)) return data;
  if (Array.isArray(data)) return { items: data };
  return { items: [] };
}
export const getPurchaseOrderItemReturnInfo = (id) =>
  api.get('/purchase-orders/' + id);
export const getPendingPurchaseOrdersForReceive = (params) =>
  api.get('/purchase-orders/pending-for-receive', params);
export const getAvailableBatches = (params) => api.get('/goods-receipts', params);
