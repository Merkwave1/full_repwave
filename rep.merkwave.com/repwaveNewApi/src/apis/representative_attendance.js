import { api } from '../utils/axiosInstance.js';
export const getAttendance = (params) => api.get('/attendance', params);
export const checkIn = (data) => api.post('/attendance/check-in', data);
export const checkOut = (userId, data) => api.put(`/attendance/${userId}/check-out`, data);

// PHP-compatible aliases
export const getRepresentativesOverview = (params) => api.get('/attendance', params);
export const getAllRepresentativesAttendance = getAttendance;
export const getBreakLogs = (params) => api.get('/attendance', params);
export const getRepresentativesLastLocation = (params) => api.get('/location/latest', params);
export const getRepLocationHistory = (params) => api.get('/location/history', params);
export const getRepresentativeLocationHistory = (params) => api.get('/location/history', params);
