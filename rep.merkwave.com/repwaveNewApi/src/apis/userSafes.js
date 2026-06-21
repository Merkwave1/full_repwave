import { api } from '../utils/axiosInstance.js';
export const getUserSafes = (userId) => api.get('/user-safes', userId ? { userId } : undefined);
export const assignUserToSafe = (data) => api.post('/user-safes', data);
export const unassignUserFromSafe = (userId, safeId) => api.delete(`/user-safes?userId=${userId}&safeId=${safeId}`);

// PHP-compatible alias
export const updateUserSafes = (data) => api.post('/user-safes', data);
