// src/apis/goods_receipts.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

/**
 * Builds the full API URL for a given endpoint.
 * @param {string} endpoint - The specific API endpoint (e.g., 'goods_receipts/add.php').
 * @returns {string} The full API URL.
 * @throws {Error} If company name or base URL is not found.
 */
function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Submits a new goods receipt to the API.
 * @param {object} receiptData - The data for the new goods receipt.
 * @param {number|string} receiptData.warehouse_id - The ID of the warehouse receiving the items.
 * @param {string} receiptData.receipt_date - The date of the receipt in 'YYYY-MM-DD' format.
 * @param {string} receiptData.notes - Any notes associated with the receipt.
 * @param {Array<object>} receiptData.items - An array of items being received.
 * @param {number|string} receiptData.items[].po_item_id - The purchase order item ID.
 * @param {number|string} receiptData.items[].quantity - The quantity being received.
 * @returns {Promise<string>} A promise that resolves to the success message from the API.
 * @throws {Error} If the API call fails.
 */
export const addGoodsReceipt = async (receiptData) => {
  const url = buildApiUrl("goods_receipts/add.php");
  const formData = new FormData();

  // Append the required fields to the form data
  formData.append('warehouse_id', receiptData.warehouse_id);
  // Do not send receipt_date so the server can use its current timestamp. If you need to override, include receipt_date in receiptData.
  if (receiptData.receipt_date) formData.append('receipt_date', receiptData.receipt_date);
  formData.append('notes', receiptData.notes);
  // The backend API expects the 'items' array to be a JSON-encoded string
  formData.append('items', JSON.stringify(receiptData.items));

  const response = await apiClient.postFormData(url, formData);

  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add goods receipt.");
  }
};

/**
 * Fetches all goods receipts from the API.
 * @returns {Promise<Array>} A promise that resolves to an array of goods receipts.
 * @throws {Error} If the API call fails.
 */
export const getAllGoodsReceipts = async () => {
  const url = buildApiUrl("goods_receipts/get_all.php");
  const response = await apiClient.get(url);

  if (response.status === "success") {
    return response.data || [];
  } else {
    throw new Error(response.message || "Failed to fetch goods receipts.");
  }
};

/**
 * Fetch goods receipts with pagination.
 * @param {{page?:number, limit?:number}} params
 */
export const getGoodsReceiptsPaginated = async (params = {}) => {
  const { page = 1, limit = 10, search, date_from, date_to, warehouse_id, recipient_id } = params;
  const base = buildApiUrl('goods_receipts/get_all.php');
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (search) query.set('search', String(search));
  if (date_from) query.set('date_from', String(date_from));
  if (date_to) query.set('date_to', String(date_to));
  if (warehouse_id) query.set('warehouse_id', String(warehouse_id));
  if (recipient_id) query.set('recipient_id', String(recipient_id));
  const url = `${base}?${query.toString()}`;
  const response = await apiClient.get(url);
  if (response.status === 'success') {
    const data = response.data || [];
    const p = response.pagination || {};
    const pagination = {
      total: Number(p.total ?? 0),
      per_page: Number(p.per_page ?? limit),
      page: Number(p.page ?? page),
      total_pages: Number(p.total_pages ?? Math.max(1, Math.ceil(Number(p.total ?? 0) / Number(p.per_page ?? limit))))
    };
    return { data, pagination };
  }
  throw new Error(response.message || 'Failed to fetch goods receipts');
};

/**
 * Fetch a single goods receipt by ID with full details (items including production_date, packaging, etc.)
 * @param {{receipt_id:number}} params
 */
export const getGoodsReceipt = async (receiptId) => {
  if (!receiptId) throw new Error('receiptId is required');
  const base = buildApiUrl('goods_receipts/get.php');
  const query = new URLSearchParams();
  query.set('receipt_id', String(receiptId));
  const url = `${base}?${query.toString()}`;
  const response = await apiClient.get(url);
  if (response.status === 'success') {
    return response.data || null;
  }
  throw new Error(response.message || 'Failed to fetch goods receipt');
};
