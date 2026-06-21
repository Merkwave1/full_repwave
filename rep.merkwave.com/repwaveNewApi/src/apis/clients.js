import { api } from '../utils/axiosInstance.js';
export const getAllClients = () => api.get('/clients');
export const getClientDetails = (id) => api.get(`/clients/${id}`);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);

// PHP-compatible aliases
export const addClient = createClient;
export const getClientById = getClientDetails;
export const getClientReports = (params) => api.get('/clients', params);
