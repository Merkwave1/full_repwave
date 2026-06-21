import { api } from '../utils/axiosInstance.js';
export const getNotifications = (params) => api.get('/notifications', params);
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
// PHP-compatible alias
export const getUnreadCount = () => api.get('/notifications', { unread: true });