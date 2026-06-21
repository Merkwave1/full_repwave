import { api } from '../utils/axiosInstance.js';
export const getAllCountries = (params) => api.get('/lookups/countries', params);
export const getAllCountriesWithGovernorates = () => api.get('/lookups/countries');

// PHP-compatible CRUD
export const addCountry = (data) => api.post('/lookups/countries', data);
export const updateCountry = (id, data) => api.put('/lookups/countries/' + id, data);
export const deleteCountry = (id) => api.delete('/lookups/countries/' + id);
