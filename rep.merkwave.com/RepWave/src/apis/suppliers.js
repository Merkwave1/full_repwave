// src/apis/suppliers.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getAllSuppliers = async () => {
  const url = buildApiUrl("suppliers/get_all.php");
  const response = await apiClient.get(url);
  if (response.status === "success" && Array.isArray(response.data)) {
    return response.data;
  } else {
    throw new Error(response.message || "فشل في جلب الموردين.");
  }
};

export const addSupplier = async (supplierData) => {
  const url = buildApiUrl("suppliers/add.php");
  const formData = new FormData();
  // Add all fields based on the provided parameters
  formData.append('supplier_name', supplierData.supplier_name);
  formData.append('supplier_contact_person', supplierData.supplier_contact_person || '');
  formData.append('supplier_phone', supplierData.supplier_phone || '');
  formData.append('supplier_email', supplierData.supplier_email || '');
  formData.append('supplier_address', supplierData.supplier_address || '');
  formData.append('supplier_notes', supplierData.supplier_notes || '');

  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "فشل في إضافة المورد.");
  }
};

export const updateSupplier = async (supplierId, supplierData) => {
  const url = buildApiUrl("suppliers/update.php");
  const formData = new FormData();
  formData.append('supplier_id', supplierId); // Ensure the ID is sent for update
  // Add all fields based on the provided parameters
  formData.append('supplier_name', supplierData.supplier_name);
  formData.append('supplier_contact_person', supplierData.supplier_contact_person || '');
  formData.append('supplier_phone', supplierData.supplier_phone || '');
  formData.append('supplier_email', supplierData.supplier_email || '');
  formData.append('supplier_address', supplierData.supplier_address || '');
  formData.append('supplier_notes', supplierData.supplier_notes || '');

  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "فشل في تحديث المورد.");
  }
};

export const deleteSupplier = async (supplierId) => {
  const url = buildApiUrl("suppliers/delete.php");
  const formData = new FormData();
  formData.append('supplier_id', supplierId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "فشل في حذف المورد.");
  }
};
