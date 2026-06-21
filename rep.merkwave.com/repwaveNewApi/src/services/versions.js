// src/services/versions.js
import { api } from '../utils/axiosInstance.js';

export async function refreshVersions() {
  try {
    return await api.get('/versions');
  } catch {
    return [];
  }
}

export async function incrementVersion(entity) {
  return api.post('/versions/increment', { entity });
}
