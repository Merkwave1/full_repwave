import { api } from '../utils/axiosInstance.js';

export const getAttendance = (params) => api.get('/attendance', params);
export const checkIn = (data) => api.post('/attendance/check-in', data);
export const checkOut = (userId, data) => api.put(`/attendance/${userId}/check-out`, data);

export const getRepresentativesOverview = (params) => api.get('/attendance', params);
export const getAllRepresentativesAttendance = getAttendance;
export const getBreakLogs = (params) => api.get('/attendance', params);

function normalizeLocationRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    user_id: row.user_id,
    users_name: row.user_name ?? row.users_name ?? 'غير محدد',
    users_email: row.user_email ?? row.users_email ?? '',
    users_role: row.user_role ?? row.users_role ?? 'rep',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    tracking_time: row.tracking_time,
    battery_level: row.battery_level,
    phone_info: row.phone_info,
  };
}

function resolveHistoryDateRange(params = {}) {
  const now = new Date();
  if (params.timeRange === '24h') {
    return {
      fromDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      toDate: now.toISOString(),
    };
  }
  if (params.timeRange === 'week') {
    return {
      fromDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      toDate: now.toISOString(),
    };
  }
  if (params.timeRange === 'month') {
    return {
      fromDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      toDate: now.toISOString(),
    };
  }
  if (params.startDate) {
    return {
      fromDate: params.startDate,
      toDate: params.endDate || now.toISOString(),
    };
  }
  return {
    fromDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    toDate: now.toISOString(),
  };
}

export async function getRepresentativesLastLocation(params) {
  const rows = await api.get('/location/latest', params);
  const items = (Array.isArray(rows) ? rows : [])
    .map(normalizeLocationRow)
    .filter(Boolean);
  return { items };
}

export async function getRepLocationHistory(params = {}) {
  const { fromDate, toDate } = resolveHistoryDateRange(params);
  const rows = await api.get('/location/history', {
    userId: params.userId,
    fromDate,
    toDate,
    limit: params.limit ?? 100,
  });
  const items = (Array.isArray(rows) ? rows : [])
    .map(normalizeLocationRow)
    .filter(Boolean);
  return { items };
}

export const getRepresentativeLocationHistory = getRepLocationHistory;
