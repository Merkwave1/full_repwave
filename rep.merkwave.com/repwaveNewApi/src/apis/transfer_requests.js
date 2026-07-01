import { api } from '../utils/axiosInstance.js';

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export const getAllTransferRequests = async (params) =>
  unwrapList(await api.get('/transfer-requests', params));
export const createTransferRequest = (data) => api.post('/transfer-requests', data);
export const updateTransferRequestStatus = (id, status, notes) =>
  api.patch(`/transfer-requests/${id}/status`, {
    status,
    ...(notes ? { notes } : {}),
  });
export const deleteTransferRequest = (id) => api.delete(`/transfer-requests/${id}`);
// PHP-compatible alias
export const allocateTransferRequest = (id, data) => api.patch('/transfer-requests/' + id + '/status', data);