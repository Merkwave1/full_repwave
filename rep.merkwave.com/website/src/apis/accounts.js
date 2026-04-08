import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!API_BASE_URL || !companyName) {
    throw new Error("API_BASE_URL or companyName is missing for API call.");
  }
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

const accountsApi = {
  getAll: () => apiClient.get(buildApiUrl('accounts/get_all.php')),
  add: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => formData.append(key, data[key]));
    return apiClient.postFormData(buildApiUrl('accounts/add.php'), formData);
  },
  update: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => formData.append(key, data[key]));
    return apiClient.postFormData(buildApiUrl('accounts/update.php'), formData);
  },
  delete: (id) => {
    const formData = new FormData();
    formData.append('id', id);
    return apiClient.postFormData(buildApiUrl('accounts/delete.php'), formData);
  }
};

export default accountsApi;
