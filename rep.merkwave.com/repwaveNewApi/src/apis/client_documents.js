import { api } from '../utils/axiosInstance.js';
export const getClientDocuments = (clientId) => api.get(`/clients/${clientId}/documents`);
export const createClientDocument = (data) => api.post('/client-documents', data);
export const deleteClientDocument = (id) => api.delete(`/client-documents/${id}`);

// PHP-compatible aliases
export const addClientDocument = createClientDocument;
export const getClientDocumentDetails = (id) => api.get('/client-documents/' + id);
