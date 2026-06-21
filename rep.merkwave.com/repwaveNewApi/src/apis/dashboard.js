import { api } from '../utils/axiosInstance.js';
export const getDashboardStats = () => api.get('/dashboard/stats');

// PHP-compatible aliases
export const getComprehensiveDashboardData = getDashboardStats;
export const getDashboardData = getDashboardStats;
