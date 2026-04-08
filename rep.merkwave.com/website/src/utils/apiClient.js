// src/utils/apiClient.js
// Note: no direct logout usage here to avoid circular flows

import { translateError } from './errorTranslations.js';

// Map to track in-flight non-idempotent requests and dedupe accidental duplicates
const inFlightRequests = new Map(); // key => Promise
// Map to track in-flight GET requests to avoid duplicate concurrent fetches
const inFlightGetRequests = new Map(); // keyUrl => Promise

// Remove cache-buster and clean query for stable request de-duplication keys
const normalizeUrlForKey = (url) => {
  try {
    // Strip any occurrences of the "_" cache-buster param without altering other params
    let newUrl = url;
    const re = /([?&])_=[^&]*(&|$)/i;
    while (re.test(newUrl)) {
      newUrl = newUrl.replace(re, (match, sep, tail) => (tail ? sep : ''));
    }
    // Remove trailing ? or & if left after stripping
    newUrl = newUrl.replace(/[?&]$/, '');
    return newUrl;
  } catch {
    return url;
  }
};

const isFormData = (v) => typeof FormData !== 'undefined' && v instanceof FormData;

const serializeFormData = (fd) => {
  try {
    const pairs = [];
    for (const [k, v] of fd.entries()) {
      let val;
      if (v instanceof Blob) {
        val = `__blob__${v.type || 'application/octet-stream'}__${v.size || 0}`;
      } else if (typeof v === 'object') {
        try { val = JSON.stringify(v); } catch { val = String(v); }
      } else {
        val = String(v);
      }
      pairs.push([k, val]);
    }
    // Sort for stable serialization
    pairs.sort((a, b) => a[0].localeCompare(b[0]));
    return pairs.map(([k, v]) => `${k}=${v}`).join('&');
  } catch {
    return 'unserializable-formdata';
  }
};

const buildRequestKey = (finalUrl, method = 'GET', body) => {
  if (!method || method.toUpperCase() === 'GET') return null; // dedupe only mutating requests
  let bodySig = '';
  if (!body) bodySig = '';
  else if (typeof body === 'string') bodySig = body;
  else if (isFormData(body)) bodySig = serializeFormData(body);
  else {
    try { bodySig = JSON.stringify(body); } catch { bodySig = String(body); }
  }
  const keyUrl = normalizeUrlForKey(finalUrl);
  return `${method.toUpperCase()}::${keyUrl}::${bodySig}`;
};

// Global reference to the auth context
let globalAuthContext = null;

// (debug logging removed)

export const setGlobalAuthContext = (authContext) => {
  globalAuthContext = authContext;
};

// Function to check if error message indicates authorization failure
const isAuthorizationError = (message) => {
  if (!message || typeof message !== 'string') return false;
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('you are not authorized') || 
         lowerMessage.includes('unauthorized') ||
         lowerMessage.includes('not authorized') ||
         lowerMessage.includes('invalid session') ||
         lowerMessage.includes('session expired') ||
         lowerMessage.includes('please login again') ||
         lowerMessage.includes('authentication error') ||
         message === 'Relogin';
};

const coreApiClient = async (url, options = {}) => {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  // Get base URL from env
  const baseUrl = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_API_LOGIN_BASE_URL is not defined in environment variables');
  }
  
  // Get company name from localStorage
  let companyName = null;
  try {
    companyName = localStorage.getItem('companyName');
  } catch {
    // ignore missing localStorage
  }
  
  // For auth endpoints, use base URL as is
  const isAuthEndpoint = url.includes('/auth/') || url.includes('login.php');
  const finalBaseUrl = isAuthEndpoint ? baseUrl : (companyName ? `${baseUrl}${companyName}` : baseUrl);
  
  const fullUrl = url.startsWith('http') ? url : `${finalBaseUrl}/${url}`;
  // Get UUID from localStorage (skip for login and other auth endpoints)
  let userUUID = null;
  
  if (!isAuthEndpoint) {
    try {
      const userDataRaw = localStorage.getItem('userData');
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        userUUID = userData.users_uuid;
      }
    } catch {
      // ignore parse failure
    }
  }

  const defaultHeaders = {};
  
  // Only set Content-Type for non-FormData requests
  if (!options.body || !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (userUUID) {
    defaultHeaders['User-UUID'] = userUUID;
  }

  // For GET requests, add UUID and a cache-busting query parameter
  let finalUrl = fullUrl;
  if (userUUID && (!options.method || options.method === 'GET')) {
    const hasUUIDAlready = /[?&]users_uuid=/.test(fullUrl);
    if (!hasUUIDAlready) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      finalUrl = `${fullUrl}${separator}users_uuid=${userUUID}`;
    }
  }

  // Append cache-buster for ALL requests to avoid cached responses
  {
    const sep = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${sep}_=${Date.now()}`;
  }

  // For POST/PUT/DELETE requests, ensure UUID is included in the request body
  if (userUUID && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
    if (options.body instanceof FormData) {
      // Check if UUID is already in FormData, if not add it
      const hasUUID = Array.from(options.body.entries()).some(([key]) => key === 'users_uuid');
      if (!hasUUID) {
        options.body.append('users_uuid', userUUID);
      }
    } else if (typeof options.body === 'string') {
      try {
        const bodyData = JSON.parse(options.body);
        if (!bodyData.users_uuid) {
          bodyData.users_uuid = userUUID;
          options.body = JSON.stringify(bodyData);
        }
      } catch {
        // If body is not JSON, create a FormData instead
        const formData = new FormData();
        formData.append('users_uuid', userUUID);
        formData.append('data', options.body);
        options.body = formData;
        // Remove Content-Type header for FormData
        delete defaultHeaders['Content-Type'];
      }
    } else if (!options.body) {
      // If no body exists, create one with UUID
      if (defaultHeaders['Content-Type']?.includes('application/json')) {
        options.body = JSON.stringify({ users_uuid: userUUID });
      } else {
        const formData = new FormData();
        formData.append('users_uuid', userUUID);
        options.body = formData;
        delete defaultHeaders['Content-Type'];
      }
    }
  }

  // We avoid custom auth header to reduce CORS preflight complexity; rely on body or query param instead.
  // (If needed later for security, reintroduce with proper CORS allow list.)

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // no-op blocks removed

  try {
  // Dedupe duplicate in-flight POST/PUT/DELETE requests with identical payloads
  const reqKey = buildRequestKey(finalUrl, config.method, config.body);
  if (reqKey && inFlightRequests.has(reqKey)) {
    return await inFlightRequests.get(reqKey);
  }

  const exec = async () => {

  const response = await fetch(finalUrl, config);
    
    const contentType = response.headers.get('content-type') || '';
    const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let parsedData = null;
    let respText = '';
    let respSizeBytes = 0;
    
    try {
      // Read as text once to measure size & allow parsing
      respText = await response.text();
      try {
        if (contentType.includes('application/json')) {
          parsedData = JSON.parse(respText);
        } else {
          // Try JSON anyway; else keep raw text
          parsedData = JSON.parse(respText);
        }
      } catch {
        parsedData = { raw: respText };
      }
      try {
        // Prefer header size when available
        const headerLen = response.headers.get('content-length');
        if (headerLen) respSizeBytes = Number(headerLen);
        else if (typeof TextEncoder !== 'undefined') respSizeBytes = new TextEncoder().encode(respText).length;
        else respSizeBytes = respText.length;
      } catch {
        respSizeBytes = respText.length;
      }
    } catch {
      // If reading/parsing fails completely, leave parsedData as null
      parsedData = null;
    }

  // No success logs

    if (!response.ok) {
      const errorMessage = (parsedData && (parsedData.message || parsedData.error)) || `HTTP ${response.status}: ${response.statusText}`;

      // Log request/response in one line (dev-only)
    if (isDev) {
        try {
          const durationMs = Math.round((t1 - t0));
          const sizeKB = (respSizeBytes / 1024).toFixed(2);
          const method = (config.method || 'GET').toUpperCase();
      const action = buildActionPrefix(method, finalUrl);
          const details = buildLogDetails({
            url: finalUrl,
            method,
            status: response.status,
            ok: false,
            durationMs,
            sizeBytes: respSizeBytes,
            sizeKB,
            requestBody: config.body,
            response: parsedData,
            rawResponse: respText,
            headers: Object.fromEntries([...response.headers.entries()]),
          });
      console.log(`${action} — [API] ${method} ${response.status} ${durationMs}ms ${sizeKB}KB`, details);
        } catch { /* noop */ }
      }

      if (isAuthorizationError(errorMessage)) {
        localStorage.clear();
        if (globalAuthContext && globalAuthContext.showReloginModal) {
          globalAuthContext.showReloginModal();
        } else {
          window.location.href = '/login';
        }
        throw new Error('انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى.');
      }
      // Translate error message to Arabic
      throw new Error(translateError(errorMessage));
    }

    // Check for authorization errors even in successful HTTP responses
    if (parsedData && parsedData.message && isAuthorizationError(parsedData.message)) {
      localStorage.clear();
      if (globalAuthContext && globalAuthContext.showReloginModal) {
        globalAuthContext.showReloginModal();
      } else {
        window.location.href = '/login';
      }
      throw new Error('انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى.');
    }

    // Success log (dev-only)
  if (isDev) {
      try {
        const durationMs = Math.round((t1 - t0));
        const sizeKB = (respSizeBytes / 1024).toFixed(2);
        const method = (config.method || 'GET').toUpperCase();
    const action = buildActionPrefix(method, finalUrl);
        const details = buildLogDetails({
          url: finalUrl,
          method,
          status: response.status,
          ok: true,
          durationMs,
          sizeBytes: respSizeBytes,
          sizeKB,
          requestBody: config.body,
          response: parsedData,
          rawResponse: respText,
          headers: Object.fromEntries([...response.headers.entries()]),
        });
        // console.log(`.....`);
    console.log(`${action} — [API] ${method} ${response.status} ${durationMs}ms ${sizeKB}KB`, details);
      } catch { /* noop */ }
    }
    return parsedData;
  };

  // Dedupe GETs as well: key by normalized URL
  const getKey = (!config.method || config.method === 'GET') ? normalizeUrlForKey(finalUrl) : null;
  if (getKey && inFlightGetRequests.has(getKey)) {
    return await inFlightGetRequests.get(getKey);
  }

  const p = exec();
  if (reqKey) inFlightRequests.set(reqKey, p);
  if (getKey) inFlightGetRequests.set(getKey, p);
  try {
    const res = await p;
    return res;
  } finally {
    if (reqKey) inFlightRequests.delete(reqKey);
    if (getKey) inFlightGetRequests.delete(getKey);
  }
  } catch (error) {
    console.error('❌ API client error:', error);
    
    // Best-effort log for network/transport errors (dev-only); request context may be partial
  if (isDev) {
      try {
        const t2 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const durationMs = Math.round((t2 - t0));
        const method = (options.method || 'GET').toUpperCase();
    const action = buildActionPrefix(method, url);
        const details = buildLogDetails({
          url,
          method,
          status: 'ERR',
          ok: false,
          durationMs,
          sizeBytes: 0,
          sizeKB: '0.00',
          requestBody: options.body,
          response: null,
          rawResponse: null,
          headers: {},
          errorMessage: (error && error.message) || 'unknown error',
        });
    console.log(`${action} — [API] ${method} ERR ${durationMs}ms`, details);
      } catch { /* noop */ }
    }
    
    // Check if this is an authorization error (even from exceptions)
    if (error.message && isAuthorizationError(error.message)) {
      
      // Clear all localStorage data
      localStorage.clear();
      
      // Show relogin modal
      if (globalAuthContext && globalAuthContext.showReloginModal) {
        globalAuthContext.showReloginModal();
      } else {
        // Fallback: redirect to login
        window.location.href = '/login';
      }
      
      throw new Error('انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى.');
    }
    
    // Translate all error messages to Arabic using the translation utility
    const errorMessage = error.message || 'خطأ في الاتصال';
    const translatedMessage = translateError(errorMessage);
    
    const translatedError = new Error(translatedMessage);
    translatedError.stack = error.stack; // Preserve stack trace
    throw translatedError;
  }
};

// ---- Helpers for logging (dev) ----
const SENSITIVE_KEYS = ['password', 'pass', 'token', 'secret'];

const maskValue = (k, v) => {
  if (!k) return v;
  const key = String(k).toLowerCase();
  if (SENSITIVE_KEYS.some(s => key.includes(s))) return '***';
  return v;
};

const sanitizeObject = (obj) => {
  try {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object') out[k] = sanitizeObject(v);
        else out[k] = maskValue(k, v);
      }
      return out;
    }
    return obj;
  } catch { return obj; }
};

const truncate = (str, max = 500) => {
  try {
    if (typeof str !== 'string') str = JSON.stringify(str);
  } catch { /* ignore */ }
  if (typeof str !== 'string') return '[unserializable]';
  return str.length > max ? `${str.slice(0, max)}…(${str.length} chars)` : str;
};

const summarizeRequestBody = (body) => {
  try {
    if (!body) return '-';
    if (typeof body === 'string') {
      try {
        const obj = JSON.parse(body);
        return truncate(JSON.stringify(sanitizeObject(obj)));
      } catch {
        // Fallback: best-effort masking for common sensitive fields in raw string
        let s = body;
        s = s.replace(/(password|pass|token|secret)"?\s*:\s*"[^"]+"/gi, '$1:"***"');
        return truncate(s);
      }
    }
    if (isFormData(body)) {
      // Convert to pairs and mask values
      const pairs = [];
      try {
        for (const [k, v] of body.entries()) {
          let val = v;
          if (v instanceof Blob) {
            val = `__blob__${v.type || 'application/octet-stream'}__${v.size || 0}`;
          }
          pairs.push([k, maskValue(k, val)]);
        }
      } catch { /* ignore */ }
      pairs.sort((a, b) => a[0].localeCompare(b[0]));
      return truncate(pairs.map(([k, v]) => `${k}=${v}`).join('&'));
    }
    // Objects or others
    return truncate(JSON.stringify(sanitizeObject(body)));
  } catch { return '-'; }
};

const summarizeResponse = (parsed, rawText) => {
  try {
    if (parsed != null) return truncate(JSON.stringify(parsed));
    if (rawText != null) return truncate(String(rawText));
    return '-';
  } catch { return '-'; }
};

const buildLogDetails = ({ url, method, status, ok, durationMs, sizeBytes, sizeKB, requestBody, response, rawResponse, headers, errorMessage }) => {
  const details = {
    url,
    method,
    status,
    ok,
    durationMs,
    sizeBytes,
    sizeKB,
    request: undefined,
    response: undefined,
    headers,
  };
  try { details.request = (requestBody && typeof requestBody === 'string') ? JSON.parse(requestBody) : requestBody; } catch { details.request = requestBody; }
  try { details.request = sanitizeObject(details.request); } catch { /* noop */ }
  details.requestSummary = summarizeRequestBody(requestBody);
  details.response = response;
  details.responseSummary = summarizeResponse(response, rawResponse);
  if (errorMessage) details.error = errorMessage;
  return details;
};

// Build a human-friendly action prefix like "Fetching clients" or "Adding products"
const buildActionPrefix = (method, fullUrl) => {
  try {
    const { entity, action } = deriveEntityAndAction(method, fullUrl);
    if (entity && action) return `${action} ${entity}`;
    if (entity) return `${method} ${entity}`;
    return 'Requesting';
  } catch {
    return 'Requesting';
  }
};

const deriveEntityAndAction = (method, fullUrl) => {
  let path = '';
  try {
    const u = new URL(fullUrl);
    path = u.pathname || '';
  } catch {
    // If not a full URL, fallback to string parsing
    path = String(fullUrl || '');
  }
  // Extract the last two segments, typically: /<company>/<entity>/<file>.php
  const segs = path.split('/').filter(Boolean);
  const file = segs[segs.length - 1] || '';
  const folder = segs[segs.length - 2] || '';
  const entity = humanizeEntity(folder || '');
  const fileLower = file.toLowerCase();

  const methodUpper = (method || 'GET').toUpperCase();
  let action = null;

  if (fileLower.includes('get_all')) action = 'Fetching';
  else if (fileLower.includes('get_detail')) action = 'Fetching details for';
  else if (fileLower.includes('add')) action = 'Adding';
  else if (fileLower.includes('update')) action = 'Updating';
  else if (fileLower.includes('delete')) action = 'Deleting';
  else if (fileLower.includes('reports')) action = 'Fetching report for';
  else if (fileLower.includes('login')) action = 'Authenticating';
  else {
    // Fallback by method
    if (methodUpper === 'GET') action = 'Fetching';
    else if (methodUpper === 'POST') action = 'Posting to';
    else if (methodUpper === 'PUT') action = 'Updating';
    else if (methodUpper === 'DELETE') action = 'Deleting';
    else action = methodUpper;
  }

  return { entity: entity || 'endpoint', action };
};

const humanizeEntity = (str) => {
  if (!str) return '';
  const map = {
    'sales_orders': 'sales orders',
    'sales_invoices': 'sales invoices',
    'sales_returns': 'sales returns',
    'purchase_orders': 'purchase orders',
    'purchase_returns': 'purchase returns',
    'client_area_tags': 'client area tags',
    'client_industries': 'client industries',
    'client_types': 'client types',
    'client_documents': 'client documents',
    'product_attributes': 'product attributes',
    'product_variants': 'product variants',
    'packaging_types': 'packaging types',
    'versions': 'versions',
    'users': 'users',
    'clients': 'clients',
    'suppliers': 'suppliers',
    'warehouses': 'warehouses',
    'inventory': 'inventory',
    'payments': 'payments',
    'payment_methods': 'payment methods',
    'safes': 'safes',
    'safe_transactions': 'safe transactions',
    'safe_transfers': 'safe transfers',
    'transfers': 'transfers',
    'goods_receipts': 'goods receipts',
    'notifications': 'notifications',
    'reports': 'reports',
    'settings': 'settings',
  };
  if (map[str]) return map[str];
  return String(str).replace(/[_-]+/g, ' ');
};


export const apiClient = {
    get: (url, options = {}) => coreApiClient(url, { ...options, method: 'GET' }),
    post: (url, data = {}, options = {}) => coreApiClient(url, {
        ...options,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(data),
    }),
    postFormData: (url, formData = new FormData(), options = {}) => {
      // Add UUID to FormData for authentication if available and not an auth endpoint
      const isAuthEndpoint = url.includes('/auth/') || url.includes('login.php');
      if (!isAuthEndpoint) {
        try {
          const userDataRaw = localStorage.getItem('userData');
          if (userDataRaw) {
            const userData = JSON.parse(userDataRaw);
            const userUUID = userData.users_uuid;
            if (userUUID && !formData.has('users_uuid')) {
              formData.append('users_uuid', userUUID);
            }
          }
        } catch {
          // ignore localStorage parse errors
        }
      }
      
      return coreApiClient(url, {
        ...options,
        method: 'POST',
        body: formData,
      });
    },
    put: (url, data = {}, options = {}) => coreApiClient(url, {
        ...options,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(data),
    }),
  delete: (url, data = {}, options = {}) => {
    let body = data;
    let headers = { ...options.headers };

    if (data instanceof FormData) {
      body = data;
    } else if (data === undefined || data === null) {
      body = undefined;
    } else {
      headers = {
        'Content-Type': 'application/json',
        ...headers,
      };
      body = JSON.stringify(data);
    }

    return coreApiClient(url, {
      ...options,
      method: 'DELETE',
      headers,
      body,
    });
  },
};
