import axiosInstance, { api } from '../utils/axiosInstance.js';

function normalizeGoodsReceiptItem(item = {}) {
  return {
    ...item,
    quantity_received: item.quantity_received ?? item.quantity_received,
    goods_receipt_items_production_date:
      item.goods_receipt_items_production_date ?? item.production_date,
    production_date: item.production_date ?? item.goods_receipt_items_production_date,
  };
}

export function normalizeGoodsReceipt(receipt = {}) {
  return {
    ...receipt,
    receipt_id: receipt.receipt_id ?? receipt.goods_receipt_id,
    warehouse_name: receipt.warehouse_name,
    purchase_order_id:
      receipt.purchase_order_id ?? receipt.goods_receipt_purchase_order_id,
    receipt_date: receipt.receipt_date ?? receipt.goods_receipt_date,
    received_by_user_name:
      receipt.received_by_user_name ?? receipt.received_by_name,
    notes: receipt.notes ?? receipt.goods_receipt_notes,
    items: Array.isArray(receipt.items)
      ? receipt.items.map(normalizeGoodsReceiptItem)
      : [],
  };
}

export const getAllGoodsReceipts = (params) => api.get('/goods-receipts', params);

export const getGoodsReceiptById = async (id) => {
  const receipt = await api.get(`/goods-receipts/${id}`);
  return normalizeGoodsReceipt(receipt);
};

export const createGoodsReceipt = (data) => api.post('/goods-receipts', data);
export const deleteGoodsReceipt = (id) => api.delete(`/goods-receipts/${id}`);

export const addGoodsReceipt = createGoodsReceipt;

export async function getGoodsReceiptsPaginated(params = {}) {
  const { limit, pageSize, page = 1, warehouse_id, ...rest } = params;
  const res = await axiosInstance.get('/goods-receipts', {
    params: {
      page,
      pageSize: pageSize ?? limit ?? 20,
      warehouseId: warehouse_id ?? rest.warehouseId,
    },
  });

  const inner = res.data?.data ?? res.data;
  const list = Array.isArray(inner?.data)
    ? inner.data
    : Array.isArray(inner)
      ? inner
      : [];

  const normalized = list.map(normalizeGoodsReceipt);
  const totalCount = inner?.total_count ?? inner?.totalCount ?? normalized.length;
  const size = inner?.page_size ?? inner?.pageSize ?? pageSize ?? limit ?? 20;
  const currentPage = inner?.page ?? page;

  return {
    data: normalized,
    pagination: {
      page: currentPage,
      per_page: size,
      total: totalCount,
      total_pages: inner?.total_pages ?? inner?.totalPages ?? Math.max(1, Math.ceil(totalCount / size)),
    },
  };
}

export const getGoodsReceipt = getGoodsReceiptById;
