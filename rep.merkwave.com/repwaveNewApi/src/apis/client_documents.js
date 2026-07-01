import { api, getStoredUser } from '../utils/axiosInstance.js';

export const getClientDocuments = (clientId) => api.get(`/clients/${clientId}/documents`);
export const getClientDocumentTypes = () => api.get('/lookups/client-document-types');

export const createClientDocument = async (data) => {
  if (data instanceof FormData) {
    const user = getStoredUser();
    const userId = user?.users_id ?? user?.usersId;
    if (userId && !data.get('uploaded_by_user_id')) {
      data.append('uploaded_by_user_id', String(userId));
    }
    return api.postForm('/client-documents', data);
  }
  return api.post('/client-documents', data);
};

export const deleteClientDocument = (id) => api.delete(`/client-documents/${id}`);

export const addClientDocument = createClientDocument;
export const getClientDocumentDetails = (id) => api.get('/client-documents/' + id);
