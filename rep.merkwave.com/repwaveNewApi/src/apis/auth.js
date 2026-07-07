// src/apis/auth.js
// Authentication API for the .NET RepWave backend (JWT Bearer, tenant-based)

import { api, storeAuth, clearAuth, getStoredUser } from '../utils/axiosInstance.js';
import { getAllClients } from './clients.js';
import { getPendingSalesOrdersForDelivery } from './sales_deliveries.js';
import { categorizeSettings } from '../utils/settingsCategorizer.js';

const SETTINGS_CATEGORIZED_KEY = 'appSettingsCategorized';
const SETTINGS_FLAT_KEY = 'appSettings';

// ── Login / Logout ─────────────────────────────────────────────────────────────
export async function loginUser(email, password, tenantId) {
  const data = await api.post('/auth/login', {
    email,
    password,
    tenant_id: tenantId,
    login_type: 'admin',
  });
  // data = LoginResponse: { UserId, Name, Email, Role, Token, TenantId, Image, DaysRemaining }
  storeAuth(data);
  return data;
}

export function logout() {
  clearAuth();
  window.location.href = '/login';
}

export async function changePassword(oldPassword, newPassword) {
  return api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });
}

// ── Stored user helpers ────────────────────────────────────────────────────────
// Support both camelCase (old cache) and snake_case (new backend responses)
export function getUserId()    { const u = getStoredUser(); return u?.user_id   ?? u?.userId   ?? null; }
export function getUserRole()  { return getStoredUser()?.role      ?? null; }
export function getTenantId()  { const u = getStoredUser(); return u?.tenant_id ?? u?.tenantId ?? null; }
export function getUserName()  { return getStoredUser()?.name      ?? ''; }
export function getUserEmail() { return getStoredUser()?.email     ?? ''; }

// Legacy compat helpers used by many components
export function getCompanyName() { return getTenantId(); }
export function getUserUUID()    { return getUserId()?.toString() ?? null; }

// ── Auth predicates ────────────────────────────────────────────────────────────
export function isAuthenticated() { return !!getStoredUser()?.token; }
export function isAdmin()         { return getStoredUser()?.role === 'admin'; }
export function isAdminSupportSession() { return getStoredUser()?.admin_support === true; }

// ── getUserData compat ─────────────────────────────────────────────────────────
export function getUserData() { return getStoredUser(); }

// ── getApp* compat shims — fetch live data from .NET API ──────────────────────
// These replace the old PHP-era cached getApp* functions.
// Components that relied on pre-fetched data now fetch fresh from the API.

export async function getAppSettings()   { return api.get('/settings'); }
export async function getAppSettingsCategorized(forceApiRefresh = false) {
  if (!forceApiRefresh) {
    try {
      const cached = localStorage.getItem(SETTINGS_CATEGORIZED_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.company)) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }

  const raw = await api.get('/settings');
  const flat = Array.isArray(raw) ? raw : [];
  const categorized = categorizeSettings(flat);

  try {
    localStorage.setItem(SETTINGS_CATEGORIZED_KEY, JSON.stringify(categorized));
    localStorage.setItem(SETTINGS_FLAT_KEY, JSON.stringify(flat));
  } catch {
    /* ignore quota errors */
  }

  return categorized;
}
export async function getAppUsers()         { return api.get('/users'); }
export async function getAppClients() { return getAllClients(); }
export async function getAppSuppliers()     { return api.get('/suppliers', { pageSize: 500 }); }
export async function getAppWarehouses()    { return api.get('/warehouses', { pageSize: 500 }); }
export async function getAppProducts()      { return api.get('/products', { pageSize: 500 }); }
export async function getAppBaseUnits()     { return api.get('/lookups/base-units'); }
export async function getAppPackagingTypes() { return api.get('/packaging-types'); }
export async function getAppCategories()    { return api.get('/lookups/categories'); }
export async function getAppSafes()         { return api.get('/safes'); }
export async function getAppInventory()     { return api.get('/inventory'); }
export async function getAppClientAreaTags()    { return api.get('/lookups/client-area-tags'); }
export async function getAppClientIndustries()  { return api.get('/lookups/client-industries'); }
export async function getAppClientTypes()       { return api.get('/lookups/client-types'); }
export async function getAppProductAttributes() { return api.get('/product-attributes'); }
export async function getAppVisitPlans()        { return api.get('/visit-plans'); }
export async function getAppCountriesWithGovernorates() { return api.get('/lookups/countries'); }

// Purchase / Sales order helpers
export async function getAppPurchaseOrders()    { return api.get('/purchase-orders'); }
export async function getAppPendingPurchaseOrdersForReceive() {
  const orders = await api.get('/purchase-orders/pending-for-receive');
  const list = Array.isArray(orders)
    ? orders
    : Array.isArray(orders?.data)
      ? orders.data
      : Array.isArray(orders?.purchase_orders)
        ? orders.purchase_orders
        : [];
  return { data: list };
}
export async function getAppDeliverableSalesOrders() {
  const list = await getPendingSalesOrdersForDelivery();
  return { data: list };
}

// Cache-invalidation no-op (was localStorage cache busting in old API)
export function invalidateInventoryCache() { /* no-op — data is fetched live */ }

// Additional getApp* shims missing from original
export async function getAppPaymentMethods()  { return api.get('/lookups/payment-methods'); }
export async function getAppPurchaseReturns() { return api.get('/purchase-returns'); }
export async function getAppSalesOrders(params) { return api.get('/sales-orders', params); }
export async function getAppSalesReturns()    { return api.get('/sales-returns'); }
export async function getAppGoodsReceipts()   { return api.get('/goods-receipts'); }
export async function getAppNotifications()   { return api.get('/notifications'); }

// Legacy single-function aliases also called directly from some components
export async function getPaymentMethods() { return api.get('/lookups/payment-methods'); }
export async function getSafes(params)    { return api.get('/safes', params); }
