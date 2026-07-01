import { api } from '../utils/axiosInstance.js';

/** Map form fields to API upsert body (excludes supplier_id). */
function toSupplierPayload(data) {
  return {
    supplier_name: (data.supplier_name ?? '').trim(),
    supplier_contact_person: data.supplier_contact_person?.trim() || null,
    supplier_phone: data.supplier_phone?.trim() || null,
    supplier_email: data.supplier_email?.trim() || null,
    supplier_address: data.supplier_address?.trim() || null,
    supplier_notes: data.supplier_notes?.trim() || null,
  };
}

export const getAllSuppliers = (params) => api.get('/suppliers', params);
export const getSupplierById = (id) => api.get(`/suppliers/${id}`);
export const createSupplier = (data) => api.post('/suppliers', toSupplierPayload(data));
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, toSupplierPayload(data));
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);

// PHP-compatible aliases
export const addSupplier = createSupplier;
