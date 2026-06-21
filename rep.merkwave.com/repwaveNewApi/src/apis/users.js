import { api } from '../utils/axiosInstance.js';
export const getAllUsers = () => api.get('/users');
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// PHP-compatible aliases
export const addUser = createUser;
export const getRepresentatives = (params) => api.get('/users', { role: 'representative', ...params });
