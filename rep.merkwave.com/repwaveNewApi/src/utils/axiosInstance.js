// src/utils/axiosInstance.js
// Central Axios instance for the .NET RepWave API (JWT Bearer auth, clean REST URLs)

import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request interceptor — attach Bearer token ─────────────────────────────────
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 + surface errors ───────────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    // .NET ApiResponse<T> returns { status: 'success'|'failure', message, data }
    const data = response.data;
    if (data && (data.status === false || data.status === 'failure') && data.message) {
      return Promise.reject(new Error(data.message));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    const msg =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.';
    toast.error(msg);
    return Promise.reject(new Error(msg));
  }
);

// ── Auth helpers ──────────────────────────────────────────────────────────────
export function getToken() {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || 'null');
    return userData?.token ?? null;
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('userData') || 'null');
  } catch {
    return null;
  }
}

export function storeAuth(userData) {
  localStorage.setItem('userData', JSON.stringify(userData));
}

export function clearAuth() {
  localStorage.removeItem('userData');
}

// ── Convenience wrappers that return response.data.data ──────────────────────
// Most GET endpoints return ApiResponse<T> where the real payload is in .data
// PagedResult shape: { data: T[], totalCount, page, pageSize, totalPages }
function unwrapPagedResult(inner) {
  if (inner !== null && typeof inner === 'object' && !Array.isArray(inner) && Array.isArray(inner.data)) {
    return inner.data;
  }
  return inner;
}

export const api = {
  async get(url, params) {
    const res = await axiosInstance.get(url, { params });
    return unwrapPagedResult(res.data?.data ?? res.data);
  },
  async post(url, body) {
    const res = await axiosInstance.post(url, body);
    return res.data?.data ?? res.data;
  },
  async put(url, body) {
    const res = await axiosInstance.put(url, body);
    return res.data?.data ?? res.data;
  },
  async patch(url, body) {
    const res = await axiosInstance.patch(url, body);
    return res.data?.data ?? res.data;
  },
  async delete(url) {
    const res = await axiosInstance.delete(url);
    return res.data?.data ?? res.data;
  },
  // Returns the full ApiResponse (status + message + data) — used when caller needs message
  async full(method, url, body, params) {
    const res = await axiosInstance.request({ method, url, data: body, params });
    return res.data;
  },
};

export default axiosInstance;
