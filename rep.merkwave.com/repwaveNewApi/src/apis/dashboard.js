import { api } from '../utils/axiosInstance.js';

/** Fetch dashboard stats with reliable ApiResponse unwrap. */
export async function getDashboardStats() {
  const response = await api.full('GET', '/dashboard/stats');
  if (!response) throw new Error('لم يتم استلام رد من الخادم');
  if (response.status === 'failure') {
    throw new Error(response.message || 'فشل في جلب إحصائيات لوحة المعلومات');
  }
  return response.data ?? null;
}

export const getComprehensiveDashboardData = getDashboardStats;
export const getDashboardData = getDashboardStats;
