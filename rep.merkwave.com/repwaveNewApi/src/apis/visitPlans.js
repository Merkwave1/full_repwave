import { api } from '../utils/axiosInstance.js';
export const getAllVisitPlans = (params) => api.get('/visit-plans', params);
export const createVisitPlan = (data) => api.post('/visit-plans', data);
export const updateVisitPlan = (id, data) => api.put(`/visit-plans/${id}`, data);
export const deleteVisitPlan = (id) => api.delete(`/visit-plans/${id}`);
export const addClientToVisitPlan = (planId, data) => api.post(`/visit-plans/${planId}/clients`, data);
export const removeClientFromVisitPlan = (planId, clientId) => api.delete(`/visit-plans/${planId}/clients/${clientId}`);

// PHP-compatible aliases
export const getVisitPlanDetail = (id) => api.get('/visit-plans/' + id);
export const addVisitPlan = createVisitPlan;
export const getAvailableClients = (params) => api.get('/clients', params);
export const assignClientsToVisitPlan = (planId, data) => api.post('/visit-plans/' + planId + '/clients', data);
export const getAllClientsWithAssignmentStatus = (_planId, params) => api.get('/clients', params);
