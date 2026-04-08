import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from './auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('لم يتم العثور على اسم الشركة. يرجى تسجيل الدخول مرة أخرى.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('لم يتم تعريف VITE_API_LOGIN_BASE_URL.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

export const getClientInterestedProducts = async (clientId) => {
  if (!clientId) throw new Error('معرّف العميل مطلوب.');
  const url = buildApiUrl(`client_interested_products/get_all.php?client_id=${clientId}`);
  const response = await apiClient.get(url);
  if (response.status === 'success') {
    const items = response.data?.interested_products;
    return Array.isArray(items) ? items : [];
  }
  throw new Error(response.message || 'فشل في جلب المنتجات المهتم بها.');
};

export const addClientInterestedProduct = async (clientId, productId) => {
  if (!clientId) throw new Error('معرّف العميل مطلوب.');
  if (!productId) throw new Error('يجب اختيار منتج لإضافته.');
  const url = buildApiUrl('client_interested_products/add.php');
  const formData = new FormData();
  formData.append('client_id', clientId);
  formData.append('products_id', productId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') {
    return response.message || 'تمت إضافة المنتج إلى قائمة الاهتمام.';
  }
  throw new Error(response.message || 'فشل في إضافة المنتج إلى قائمة الاهتمام.');
};

export const removeClientInterestedProduct = async (clientId, productId) => {
  if (!clientId) throw new Error('معرّف العميل مطلوب.');
  if (!productId) throw new Error('معرّف المنتج مطلوب للحذف.');
  const url = buildApiUrl('client_interested_products/delete.php');
  const formData = new FormData();
  formData.append('client_id', clientId);
  formData.append('products_id', productId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === 'success') {
    return response.message || 'تمت إزالة المنتج من قائمة الاهتمام.';
  }
  throw new Error(response.message || 'فشل في إزالة المنتج من قائمة الاهتمام.');
};
