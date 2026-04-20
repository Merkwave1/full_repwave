// src/apis/sales_deliveries.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

// Get pending sales orders for delivery
export const getPendingSalesOrders = async (forceRefresh = false) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  let url = buildApiUrl("sales_deliveries/get_pending_orders.php");
  url += `?users_uuid=${users_uuid}`;
  
  if (forceRefresh) {
    url += `&t=${Date.now()}`;
  }

  
  const response = await apiClient.get(url);
  
  
  if (response.status === "success" && response.data) {
    // New API structure: data.data contains the array
    if (response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    // Fallback to old structure for backward compatibility
    return response.data.pending_sales_orders || response.data;
  } else {
    throw new Error(response.message || "Failed to retrieve pending sales orders.");
  }
};

// Add new sales delivery
export const addSalesDelivery = async (deliveryData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("sales_deliveries/add.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('sales_order_id', deliveryData.sales_order_id);
  formData.append('warehouse_id', deliveryData.warehouse_id);
  // delivery_date is now set automatically in backend using NOW()
  formData.append('delivery_status', deliveryData.delivery_status || 'Preparing');
  formData.append('delivery_notes', deliveryData.delivery_notes || '');
  formData.append('delivery_address', deliveryData.delivery_address || '');
  formData.append('items', JSON.stringify(deliveryData.items));


  const response = await apiClient.postFormData(url, formData);
  
  
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add delivery.");
  }
};

// Get all sales deliveries
export const getAppSalesDeliveries = async (forceRefresh = false) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  let url = buildApiUrl("sales_deliveries/get_all.php");
  url += `?users_uuid=${users_uuid}`;
  
  if (forceRefresh) {
    url += `&t=${Date.now()}`;
  }

  
  const response = await apiClient.get(url);
  
  
  if (response.status === "success") {
    const deliveries = response.sales_deliveries || response.data?.sales_deliveries || response.data?.deliveries || response.data || response;
    return deliveries;
  } else {
    throw new Error(response.message || "Failed to retrieve deliveries.");
  }
};

// Paginated deliveries
export const getSalesDeliveriesPaginated = async ({
  page = 1,
  limit = 10,
  forceRefresh = false,
  search,
  date_from,
  date_to,
  warehouse_id,
  client_id,
} = {}) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');
  const base = buildApiUrl('sales_deliveries/get_all.php');
  const qs = new URLSearchParams({ users_uuid, page: String(page), limit: String(limit) });
  if (search) qs.set('search', String(search).trim());
  if (date_from) qs.set('date_from', String(date_from));
  if (date_to) qs.set('date_to', String(date_to));
  if (warehouse_id) qs.set('warehouse_id', String(warehouse_id));
  if (client_id) qs.set('client_id', String(client_id));
  if (forceRefresh) qs.set('t', String(Date.now()));
  const url = `${base}?${qs.toString()}`;
  const response = await apiClient.get(url);
  if (response.status === 'success') {
    const deliveriesPayload =
      response.sales_deliveries ??
      response.data?.sales_deliveries ??
      response.data?.deliveries ??
      response.data?.data ??
      response.data ??
      [];

    const deliveries = Array.isArray(deliveriesPayload)
      ? deliveriesPayload
      : Array.isArray(deliveriesPayload?.data)
        ? deliveriesPayload.data
        : Array.isArray(deliveriesPayload?.items)
          ? deliveriesPayload.items
          : [];

    const p = response.pagination || response.data?.pagination || {};
    const total = Number(p.total ?? p.total_items ?? deliveries.length ?? 0);
    const perPage = Number(p.per_page ?? p.page_size ?? limit ?? 10) || 10;
    const currentPage = Number(p.page ?? p.current_page ?? page ?? 1) || 1;
    const totalPages = Number(p.total_pages ?? Math.max(1, Math.ceil(total / (perPage || 1))));

    const pagination = {
      total,
      per_page: perPage,
      page: currentPage,
      total_pages: totalPages,
    };

    return { data: deliveries, pagination };
  }
  throw new Error(response.message || 'Failed to retrieve deliveries.');
};

// Get sales delivery details
export const getSalesDeliveryDetails = async (deliveryId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl(`sales_deliveries/get_detail.php?users_uuid=${users_uuid}&id=${deliveryId}`);

  
  const response = await apiClient.get(url);
  
  
  if (response.status === "success") {
    const data = response.delivery || response.data || response;
    return data;
  } else {
    throw new Error(response.message || `Failed to retrieve delivery details for ID ${deliveryId}.`);
  }
};

// Update delivery status
export const updateDeliveryStatus = async (deliveryId, status, notes = '') => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("sales_deliveries/update_status.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('delivery_id', deliveryId);
  formData.append('delivery_status', status);
  formData.append('delivery_notes', notes);


  const response = await apiClient.postFormData(url, formData);
  
  
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update delivery status.");
  }
};

// Update sales delivery (general update function)
export const updateSalesDelivery = async (deliveryId, updateData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("sales_deliveries/update.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('delivery_id', deliveryId);
  
  // Add all update data to form
  for (const key in updateData) {
    if (updateData[key] !== null && updateData[key] !== undefined) {
      formData.append(key, updateData[key]);
    }
  }


  const response = await apiClient.postFormData(url, formData);
  
  
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update sales delivery.");
  }
};

// Delete delivery
export const deleteDelivery = async (deliveryId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("sales_deliveries/delete.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid);
  formData.append('delivery_id', deliveryId);


  const response = await apiClient.postFormData(url, formData);
  
  
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete delivery.");
  }
};
