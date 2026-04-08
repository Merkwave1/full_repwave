// src/apis/purchase_orders.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

// Ensure API_BASE_URL is defined here as well if needed,
// or ensure buildApiUrl properly accesses it from auth.js or a shared config.
// For simplicity, I'm including it directly as it was in your example.
const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllPurchaseOrders = async () => {
  // Base endpoint (without dynamic params appended by apiClient)
  const baseUrl = buildApiUrl("purchase_orders/get_all.php");
  // Add a cache-busting param so upstream proxies/CDNs don't serve stale data
  const url = `${baseUrl}?_ts=${Date.now()}`;
  try {
    let userUUID = null;
    try {
      const userDataRaw = localStorage.getItem('userData');
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        userUUID = userData.users_uuid;
      }
    } catch {
      // If can't get UUID, use original URL
    }

  // logging removed

    let response = await apiClient.get(url);

    // Parse the final URL to show parameters
  // removed params extraction as logs are disabled
  // logging removed

    // This block correctly handles the backend response:
    // { "status": "success", "message": "...", "data": { "purchase_orders": [] } }
    // or
    // { "status": "success", "message": "...", "data": { "purchase_orders": [...] } }
    if (response.status === "success" && response.data && Array.isArray(response.data.purchase_orders)) {
      const list = response.data.purchase_orders;
      // Heuristic: if list length < 14 and we previously had a larger list cached, attempt a forced second fetch (possible stale cache)
      try {
        const cachedRaw = localStorage.getItem('appPurchaseOrders');
        if (cachedRaw) {
          const cachedArr = JSON.parse(cachedRaw);
          if (Array.isArray(cachedArr) && cachedArr.length > list.length) {
            // warning removed
            const retryUrl = `${baseUrl}?_ts=${Date.now()}&_retry=1` + (userUUID ? `&users_uuid=${userUUID}` : '');
            const retryResp = await apiClient.get(retryUrl);
            if (retryResp.status === 'success' && retryResp.data && Array.isArray(retryResp.data.purchase_orders) && retryResp.data.purchase_orders.length >= cachedArr.length) {
              // logging removed
              return retryResp.data.purchase_orders;
            } else {
              // warning removed
            }
          }
        }
  } catch {
        // Ignore retry errors
      }
      return list; // Return the array within the 'purchase_orders' key
    } else if (response.status === "success" && (response.data === null || typeof response.data === 'object')) {
      return []; // Fallback empty array
    }
    throw new Error(response.message || "Failed to retrieve purchase orders.");
  } catch (error) {
    console.error(`Error fetching all purchase orders from ${url}:`, error);
    // Re-throw the error so the calling function (getAppPurchaseOrders in auth.js) can catch it.
    throw error;
  }
};

// Get purchase orders by supplier (for dropdown/selection purposes)
export const getPurchaseOrdersBySupplier = async (supplierId, statuses = null, limit = null) => {
  const baseUrl = buildApiUrl("purchase_orders/get_all.php");
  try {
    const params = new URLSearchParams();
    params.append('supplier_id', supplierId);
    if (limit) params.append('limit', String(limit));
    // Handle multiple statuses - we'll fetch all and filter on frontend for now
    // since backend may not support multiple status filtering
    const response = await apiClient.get(`${baseUrl}?${params.toString()}`);

    if (response.status === "success" && response.data && Array.isArray(response.data.purchase_orders)) {
      let orders = response.data.purchase_orders;
      
      // Filter by statuses if provided
      if (statuses) {
        const statusArray = statuses.split(',').map(s => s.trim());
        orders = orders.filter(order => statusArray.includes(order.purchase_orders_status));
      }

      // Return simplified order info for selection
      return orders.map(order => ({
        purchase_orders_id: order.purchase_orders_id,
        purchase_orders_order_date: order.purchase_orders_order_date,
        purchase_orders_total_amount: order.purchase_orders_total_amount,
        purchase_orders_status: order.purchase_orders_status,
        purchase_orders_warehouse_id: order.purchase_orders_warehouse_id,
        warehouse_name: order.warehouse_name
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error(`Error fetching purchase orders for supplier ${supplierId}:`, error);
    throw error;
  }
};

// Get detailed purchase order by ID (including items)
export const getPurchaseOrderDetails = async (orderId) => {
  const url = buildApiUrl("purchase_orders/get_detail.php");
  try {
    const formData = new FormData();
    formData.append('purchase_orders_id', orderId);

    const response = await apiClient.postFormData(url, formData);

    if (response.status === "success" && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to retrieve purchase order details.");
    }
  } catch (error) {
    console.error(`Error fetching purchase order details for ID ${orderId}:`, error);
    throw error;
  }
};

// Get purchase order item return information (quantities)
export const getPurchaseOrderItemReturnInfo = async (itemId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("purchase_orders/get_item_return_info.php");
  try {
    const formData = new FormData();
    formData.append('users_uuid', users_uuid);
    formData.append('purchase_order_item_id', itemId);

    const response = await apiClient.postFormData(url, formData);

    if (response.status === "success" && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || "Failed to retrieve item return info.");
    }
  } catch (error) {
    console.error(`Error fetching item return info for ID ${itemId}:`, error);
    throw error;
  }
};

export const addPurchaseOrder = async (orderData) => {
  const url = buildApiUrl("purchase_orders/add.php");
  const formData = new FormData();

  formData.append('purchase_orders_supplier_id', orderData.purchase_orders_supplier_id);
  formData.append('purchase_orders_warehouse_id', orderData.purchase_orders_warehouse_id);
  formData.append('purchase_orders_order_date', orderData.purchase_orders_order_date);
  // Only append expected delivery date if it exists and is not empty
  if (orderData.purchase_orders_expected_delivery_date && orderData.purchase_orders_expected_delivery_date.trim() !== '') {
    formData.append('purchase_orders_expected_delivery_date', orderData.purchase_orders_expected_delivery_date);
  }
  formData.append('purchase_orders_status', orderData.purchase_orders_status);
  formData.append('purchase_orders_notes', orderData.purchase_orders_notes || '');
  
  // Add order discount if provided
  if (orderData.purchase_orders_order_discount !== undefined) {
    formData.append('purchase_orders_order_discount', orderData.purchase_orders_order_discount);
  }

  // Stringify the purchase_order_items array
  if (orderData.purchase_order_items && Array.isArray(orderData.purchase_order_items)) {
    formData.append('purchase_order_items', JSON.stringify(orderData.purchase_order_items));
  } else {
    formData.append('purchase_order_items', '[]'); // Send empty array if no items
  }

  try {
    // Capture payload snapshot for debugging BEFORE sending (FormData is mutable)
    const debugPayload = {};
    for (const [k, v] of formData.entries()) {
      debugPayload[k] = v;
    }
    const response = await apiClient.postFormData(url, formData);
    if (response.status === "success") {
  // logging removed
      return response.message;
    } else {
      throw new Error(response.message || "Failed to add purchase order.");
    }
  } catch (error) {
    console.error(`Error adding purchase order to ${url}:`, error);
    throw error;
  }
};

export const updatePurchaseOrder = async (orderId, orderData) => {
  const url = buildApiUrl("purchase_orders/update.php");
  const formData = new FormData();
  formData.append('purchase_orders_id', orderId);

  formData.append('purchase_orders_supplier_id', orderData.purchase_orders_supplier_id);
  formData.append('purchase_orders_order_date', orderData.purchase_orders_order_date);
  formData.append('purchase_orders_expected_delivery_date', orderData.purchase_orders_expected_delivery_date || '');
  formData.append('purchase_orders_status', orderData.purchase_orders_status);
  formData.append('purchase_orders_notes', orderData.purchase_orders_notes || '');
  // Include order-level discount if provided
  if (orderData.purchase_orders_order_discount !== undefined) {
    formData.append('purchase_orders_order_discount', orderData.purchase_orders_order_discount);
  }

  // Stringify the purchase_order_items array
  if (orderData.purchase_order_items && Array.isArray(orderData.purchase_order_items)) {
    formData.append('purchase_order_items', JSON.stringify(orderData.purchase_order_items));
  } else {
    formData.append('purchase_order_items', '[]'); // Send empty array if no items
  }

  try {
    const response = await apiClient.postFormData(url, formData);
    if (response.status === "success") {
      return response.message;
    } else {
      throw new Error(response.message || "Failed to update purchase order.");
    }
  } catch (error) {
    console.error(`Error updating purchase order at ${url}:`, error);
    throw error;
  }
};

export const deletePurchaseOrder = async (orderId) => {
  const url = buildApiUrl("purchase_orders/delete.php");
  const formData = new FormData();
  formData.append('purchase_orders_id', orderId);
  try {
    const response = await apiClient.postFormData(url, formData);
    if (response.status === "success") {
      return response.message;
    } else {
      throw new Error(response.message || "Failed to delete purchase order.");
    }
  } catch (error) {
    console.error(`Error deleting purchase order from ${url}:`, error);
    throw error;
  }
};

// New: Paginated getter for purchase orders (server-side pagination)
export const getPurchaseOrdersPaginated = async ({ page = 1, limit = 10, status, supplier_id, date_from, date_to, search } = {}) => {
  const baseUrl = buildApiUrl("purchase_orders/get_all.php");
  const params = new URLSearchParams();
  // Backends often expect integers
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (status) params.set('status', status); // supports CSV (e.g., "Ordered,Received")
  if (supplier_id) params.set('supplier_id', String(supplier_id));
  if (date_from) params.set('date_from', date_from);
  if (date_to) params.set('date_to', date_to);
  if (search) params.set('search', search);
  // cache buster
  params.set('_ts', String(Date.now()));

  const url = `${baseUrl}?${params.toString()}`;
  try {
    const response = await apiClient.get(url);
    if (response.status === 'success') {
      // Normalize shape to { data, pagination }
      const d = response.data || {};
      const list = Array.isArray(d.purchase_orders) ? d.purchase_orders : Array.isArray(response.purchase_orders) ? response.purchase_orders : [];
      const total = Number(d.total_count ?? d.total_items ?? d.count ?? 0);
      const p = d.pagination || null;
      const normalized = {
        data: list,
        pagination: p ? {
          current_page: Number(p.current_page ?? p.page ?? page),
          limit: Number(p.limit ?? p.per_page ?? limit),
          total_items: Number(p.total_items ?? total),
          total_pages: Number(p.total_pages ?? (Number.isFinite(total) && (limit>0) ? Math.max(1, Math.ceil(total/limit)) : 1))
        } : {
          current_page: Number(page),
          limit: Number(limit),
          total_items: total || list.length,
          total_pages: Number.isFinite(total) && (limit>0) ? Math.max(1, Math.ceil(total/limit)) : 1
        }
      };
      return normalized;
    }
    console.error('Purchase orders API error response:', response);
    throw new Error(response.message || 'Failed to fetch purchase orders');
  } catch (error) {
    console.error('Error fetching paginated purchase orders:', error);
    throw error;
  }
};

/**
 * Get returnable quantities for purchase order items (accounting for previous returns)
 */

// Get pending purchase orders that need to be received (for receive products page)
export const getPendingPurchaseOrdersForReceive = async () => {
  const baseUrl = buildApiUrl("purchase_orders/get_pending_for_receive.php");
  const url = `${baseUrl}?_ts=${Date.now()}`;
  
  try {
    let userUUID = null;
    try {
      const userDataRaw = localStorage.getItem('userData');
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        userUUID = userData.users_uuid;
      }
    } catch {
      // If can't get UUID, continue without it
    }

    const finalUrl = userUUID ? `${url}&users_uuid=${userUUID}` : url;
    const response = await apiClient.get(finalUrl);

    if (response.status === "success" && response.data && Array.isArray(response.data.purchase_orders)) {
      return response.data.purchase_orders;
    } else if (response.status === "success" && response.data === null) {
      return []; // No pending items
    }
    
    throw new Error(response.message || "Failed to retrieve pending purchase orders for receiving.");
  } catch (error) {
    console.error(`Error fetching pending purchase orders for receive from ${url}:`, error);
    throw error;
  }
};

export const getReturnableQuantities = async (purchaseOrderId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');

  const url = buildApiUrl("purchase_orders/get_returnable_quantities.php");
  
  try {
    const response = await apiClient.get(`${url}?purchase_order_id=${purchaseOrderId}&users_uuid=${users_uuid}&_=${Date.now()}`);
    
    if (response.status === 'success') {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch returnable quantities');
  } catch (error) {
    console.error('Error fetching returnable quantities:', error);
    throw error;
  }
};

// Get available inventory batches for a specific variant/warehouse combination
export const getAvailableBatches = async (variantId, warehouseId, packagingTypeId = null) => {
  try {
    const params = new URLSearchParams({
      variant_id: variantId,
      warehouse_id: warehouseId
    });
    
    if (packagingTypeId) {
      params.append('packaging_type_id', packagingTypeId);
    }
    
    const url = buildApiUrl(`inventory/get_available_batches.php?${params.toString()}`);
    const response = await apiClient.get(url);
    
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch available batches');
  } catch (error) {
    console.error('Error fetching available batches:', error);
    throw error;
  }
};