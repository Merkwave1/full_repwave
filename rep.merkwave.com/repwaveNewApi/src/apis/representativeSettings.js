import { api } from '../utils/axiosInstance.js';
// The backend has no per-user settings endpoint yet — return null so modal uses defaults
export const getRepresentativeSettings = () => Promise.resolve(null);

// PHP-compatible alias — no-op until backend has this endpoint
export const upsertRepresentativeSettings = () => Promise.resolve(null);
