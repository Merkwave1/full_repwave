import { api } from '../utils/axiosInstance.js';
export const getAllSettings = (params) => api.get('/settings', params);
export const updateSetting = (key, value) => api.patch(`/settings/${key}`, { key, value });

// PHP-compatible extensions
export const updateMultipleSettings = async (settingsArray) =>
  Promise.all(settingsArray.map(({ key, value }) => api.patch('/settings/' + key, { value })));
export const createSetting = (data) => api.patch('/settings/' + data.key, { value: data.value });
export const getSettingByKey = (key) => api.get('/settings', { key });
export const deleteSetting = () => Promise.resolve(null);
export const getSettingsByCategory = (category, params) => api.get('/settings', { category, ...params });
