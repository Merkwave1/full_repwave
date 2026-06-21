import { api } from '../utils/axiosInstance.js';
export const getAllVisits = (params) => api.get('/visits', params);
export const getVisitById = (id) => api.get(`/visits/${id}`);
export const createVisit = (data) => api.post('/visits', data);
export const updateVisit = (id, data) => api.put(`/visits/${id}`, data);
export const deleteVisit = (id) => api.delete(`/visits/${id}`);

// PHP-compatible report aliases
export const getVisitsReports = (params) => api.get('/visits', params);
export const getVisitsOverview = (params) => api.get('/visits', params);
export const getVisitsActivities = (params) => api.get('/visits', params);
export const getVisitsAreas = (params) => api.get('/visits', params);
export const getVisitsRepresentatives = (params) => api.get('/visits', params);
export const getVisitsAnalytics = (params) => api.get('/visits', params);
export const getVisitsPerformance = (params) => api.get('/visits', params);
export const getVisitsTopClients = (params) => api.get('/visits', params);
export const getVisitsDetails = (params) => api.get('/visits', params);
export const getVisitsDetailsUnpaginated = (params) => api.get('/visits', params);
export const getVisitDetailsById = (id) => api.get('/visits/' + id);
export const getVisitSummaryById = (id) => api.get('/visits/' + id);
