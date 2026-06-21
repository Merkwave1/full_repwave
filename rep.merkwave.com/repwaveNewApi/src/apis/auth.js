// src/apis/auth.js
// Authentication API for the .NET RepWave backend (JWT Bearer, tenant-based)

import { api, storeAuth, clearAuth, getStoredUser } from '../utils/axiosInstance.js';

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

// ── getUserData compat ─────────────────────────────────────────────────────────
export function getUserData() { return getStoredUser(); }

// ── getApp* compat shims — fetch live data from .NET API ──────────────────────
// These replace the old PHP-era cached getApp* functions.
// Components that relied on pre-fetched data now fetch fresh from the API.

export async function getAppSettings()   { return api.get('/settings'); }
export async function getAppSettingsCategorized() {
  const data = await api.get('/settings');
  // Return as-is; components expecting a categorized structure will get the
  // flat array and can adapt, or the backend returns categorized groups.
  return data;
}
export async function getAppUsers()         { return api.get('/users'); }
export async function getAppClients()       { return api.get('/clients'); }
export async function getAppSuppliers()     { return api.get('/suppliers'); }
export async function getAppWarehouses()    { return api.get('/warehouses'); }
export async function getAppProducts()      { return api.get('/products'); }
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
  return api.get('/purchase-orders?status=approved');
}
export async function getAppDeliverableSalesOrders() {
  return api.get('/sales-orders?status=approved');
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
