import { api } from '../utils/axiosInstance.js';

export const getAllSettings = (params) => api.get('/settings', params);
export const updateSetting = (key, value) =>
  api.patch(`/settings/${encodeURIComponent(key)}`, { value });

function toEntries(settingsInput) {
  if (Array.isArray(settingsInput)) {
    return settingsInput
      .map((item) =>
        typeof item === 'object' && item !== null
          ? {
              key: item.key ?? item.settings_key,
              value: item.value ?? item.settings_value,
            }
          : null,
      )
      .filter(Boolean);
  }
  if (settingsInput && typeof settingsInput === 'object') {
    return Object.entries(settingsInput).map(([key, value]) => ({ key, value }));
  }
  return [];
}

export async function updateMultipleSettings(settingsInput) {
  const entries = toEntries(settingsInput);
  return Promise.all(
    entries.map(({ key, value }) =>
      api.patch(`/settings/${encodeURIComponent(key)}`, {
        value: value instanceof File ? value : String(value ?? ''),
      }),
    ),
  );
}

export async function createSetting(key, value, description, type) {
  return api.patch(`/settings/${encodeURIComponent(key)}`, {
    value: String(value ?? ''),
    description: description ?? key,
    type: type ?? 'string',
  });
}

export const getSettingByKey = (key) => api.get('/settings', { key });
export const deleteSetting = () => Promise.resolve(null);
export const getSettingsByCategory = (category, params) =>
  api.get('/settings', { category, ...params });
