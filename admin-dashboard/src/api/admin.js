const API_BASE = '/api/admin';

function getToken() {
  return localStorage.getItem('rw_admin_token');
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === 'failure') {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export function login(email, password) {
  return api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function getStatsOverview() {
  return api('/stats/overview');
}

export function getTenants(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const qs = q.toString();
  return api(`/tenants${qs ? `?${qs}` : ''}`);
}

export function getTenantHealth(tenantId) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/health`);
}

export function getAllTenantsUsage() {
  return api('/usage/summary');
}

export function getTenant(tenantId) {
  return api(`/tenants/${encodeURIComponent(tenantId)}`);
}

export function updateTenant(tenantId, body) {
  return api(`/tenants/${encodeURIComponent(tenantId)}`, { method: 'PUT', body });
}

export function closeSubscription(tenantId) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/subscription/close`, { method: 'POST' });
}

export function openSubscription(tenantId, body) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/subscription/open`, { method: 'POST', body });
}

export function extendTrial(tenantId, days) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/trial/extend`, { method: 'POST', body: { days } });
}

export function convertTrial(tenantId, plan) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/convert`, { method: 'POST', body: { plan } });
}

export function seedTenantSample(tenantId) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/seed-sample`, { method: 'POST' });
}

export function getGlobalUsers(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const qs = q.toString();
  return api(`/users${qs ? `?${qs}` : ''}`);
}

export function setUserStatus(tenantId, userId, isActive) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/users/${userId}/status`, {
    method: 'PUT',
    body: { is_active: isActive },
  });
}

export function getSubscriptionsMonitor() {
  return api('/monitor/subscriptions');
}

export function getActivityFeed(limit = 50) {
  return api(`/monitor/activity?limit=${limit}`);
}

export function getEngagementMatrix() {
  return api('/monitor/engagement');
}

export async function resetUserPassword(tenantId, userId) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/tenants/${encodeURIComponent(tenantId)}/users/${userId}/reset-password`, {
    method: 'POST',
    headers,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === 'failure') {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return { ...json.data, message: json.message };
}

export function impersonateTenant(tenantId, userId) {
  return api(`/tenants/${encodeURIComponent(tenantId)}/impersonate`, {
    method: 'POST',
    body: userId ? { user_id: userId } : {},
  });
}

export function getAuditLog(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const qs = q.toString();
  return api(`/audit-log${qs ? `?${qs}` : ''}`);
}
