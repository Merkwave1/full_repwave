import { apiClient } from '../utils/apiClient.js';
import { getCompanyName } from './auth.js';

// Generic API URL builder for non-reports endpoints
function buildApiUrl(endpoint) {
    const companyName = getCompanyName();
    if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
    return `${API_BASE_URL}${companyName}/${endpoint}`;
}

// Get all visits reports data
export const getVisitsReports = async () => {
    try {
        const userDataRaw = localStorage.getItem('userData');
        
        if (!userDataRaw) throw new Error('userData not found in localStorage');
        let users_uuid;
        try {
            const userData = JSON.parse(userDataRaw);
            users_uuid = userData.users_uuid;
        } catch (e) {
            console.error('❌ Error parsing userData JSON:', e);
            throw new Error('userData in localStorage is not valid JSON');
        }
        if (!users_uuid) throw new Error('users_uuid not found in userData');
        
        const companyName = getCompanyName();
        if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
        
        const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
        if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
        
        const url = `${API_BASE_URL}${companyName}/reports/visits.php?users_uuid=${users_uuid}`;
        
        const response = await apiClient.get(url);
        
        return response.data; // This should return the full API response {status, message, data}
    } catch (error) {
        console.error('❌ Error in getVisitsReports:', error);
        console.error('❌ Error stack:', error.stack);
        throw error;
    }
};

/**
 * Build base URL for visits reports with common auth params
 */
function buildVisitsReportsUrl(params = {}) {
    const userDataRaw = localStorage.getItem('userData');
    if (!userDataRaw) throw new Error('userData not found in localStorage');

    let users_uuid;
    try {
        const userData = JSON.parse(userDataRaw);
        users_uuid = userData.users_uuid;
    } catch (e) {
        console.error('❌ Error parsing userData JSON:', e);
        throw new Error('userData in localStorage is not valid JSON');
    }
    if (!users_uuid) throw new Error('users_uuid not found in userData');

    const companyName = getCompanyName();
    if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');

    const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
    if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');

    const url = new URL(`${API_BASE_URL}${companyName}/reports/visits.php`);
    url.searchParams.set('users_uuid', users_uuid);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    return url.toString();
}

/**
 * Get only overview section for visits reports
 * Calls: /reports/visits.php?section=overview
 */
export const getVisitsOverview = async () => {
  try {
    const url = buildVisitsReportsUrl({ section: 'overview' });
    const response = await apiClient.get(url);
    
    // Handle different response formats
    if (response.status === 'success') {
      return response.data?.overview ?? response.data;
    } else if (response.data?.overview) {
      return response.data.overview;
    } else {
      return response.data ?? response;
    }
  } catch (error) {
    console.error('❌ Error in getVisitsOverview:', error);
    throw error;
  }
};

// Minimal, per-tab API calls to fetch only what's needed
export const getVisitsActivities = async ({ page = 1, limit = 20 } = {}) => {
    const url = buildVisitsReportsUrl({ section: 'activities', page, limit });
    const response = await apiClient.get(url);
    const items = response.data?.activities ?? response.data?.items ?? response.data ?? [];
    const pagination = response.data?.pagination ?? undefined;
    return { items: Array.isArray(items) ? items : [], pagination };
};

export const getVisitsAreas = async ({ page = 1, limit = 20 } = {}) => {
    const url = buildVisitsReportsUrl({ section: 'areas', page, limit });
    const response = await apiClient.get(url);
    const items = response.data?.areas ?? response.data?.items ?? response.data ?? [];
    const pagination = response.data?.pagination ?? undefined;
    return { items: Array.isArray(items) ? items : [], pagination };
};

export const getVisitsRepresentatives = async ({ page = 1, limit = 20 } = {}) => {
    const url = buildVisitsReportsUrl({ section: 'representatives', page, limit });
    const response = await apiClient.get(url);
    const items = response.data?.representatives ?? response.data?.items ?? response.data ?? [];
    const pagination = response.data?.pagination ?? undefined;
    return { items: Array.isArray(items) ? items : [], pagination };
};

export const getVisitsAnalytics = async () => {
    const url = buildVisitsReportsUrl({ section: 'analytics' });
    const response = await apiClient.get(url);
    if (response.status === 'success') {
        return {
            daily_analytics: response.data?.daily_analytics ?? [],
            hourly_analytics: response.data?.hourly_analytics ?? [],
        };
    }
    return {
        daily_analytics: response.data?.daily_analytics ?? [],
        hourly_analytics: response.data?.hourly_analytics ?? [],
    };
};

export const getVisitsPerformance = async () => {
    const url = buildVisitsReportsUrl({ section: 'performance' });
    const response = await apiClient.get(url);
    if (response.status === 'success') return response.data?.performance ?? response.data;
    return response.data?.performance ?? {};
};

export const getVisitsTopClients = async ({ page = 1, limit = 20 } = {}) => {
    const url = buildVisitsReportsUrl({ section: 'top_clients', page, limit });
    const response = await apiClient.get(url);
    const items = response.data?.top_clients ?? response.data?.items ?? response.data ?? [];
    const pagination = response.data?.pagination ?? undefined;
    return { items: Array.isArray(items) ? items : [], pagination };
};
/**
 * Get paginated visits list with filters for details tab (server-side pagination)
 * Calls: visits/get_all.php with users_uuid, page, limit and optional filters
 */
export const getVisitsDetails = async ({
    page = 1,
    perPage = 10,
    searchTerm = '',
    status = '',
    dateFrom = '',
    dateTo = '',
    repId = '',
    areaTagId = '',
    clientId = ''
} = {}) => {
    const userDataRaw = localStorage.getItem('userData');
    if (!userDataRaw) throw new Error('userData not found in localStorage');
    let users_uuid;
    try {
        const userData = JSON.parse(userDataRaw);
        users_uuid = userData.users_uuid;
    } catch (e) {
        console.error('❌ Error parsing userData JSON:', e);
        throw new Error('userData in localStorage is not valid JSON');
    }
    if (!users_uuid) throw new Error('users_uuid not found in userData');

    const params = new URLSearchParams();
    params.set('users_uuid', users_uuid);
    params.set('page', String(page));
    params.set('limit', String(perPage));
    if (searchTerm) params.set('search', searchTerm);
    if (status) params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (repId) params.set('rep_id', String(repId));
    if (areaTagId) params.set('area_tag_id', String(areaTagId));
    if (clientId) params.set('client_id', String(clientId));

    const url = buildApiUrl(`visits/get_all.php?${params.toString()}`);
    const response = await apiClient.get(url);

    if (response.status === 'success') {
        const items = response.data?.visits ?? [];
        const pagination = response.data?.pagination ?? { page, limit: perPage, total: Array.isArray(items) ? items.length : 0 };
        return { items: Array.isArray(items) ? items : [], pagination };
    }

    // Fallback parsing if wrapper differs
    const items = response.data?.visits ?? response.data ?? [];
    const pagination = response.data?.pagination ?? { page, limit: perPage, total: Array.isArray(items) ? items.length : 0 };
    return { items: Array.isArray(items) ? items : [], pagination };
};

// Unpaginated details for reports tab when explicit request (no pagination, limited size)
export const getVisitsDetailsUnpaginated = async () => {
    const url = buildVisitsReportsUrl({ section: 'details' });
    const response = await apiClient.get(url);
    if (response.status === 'success') return response.data?.details ?? response.data ?? [];
    return response.data?.details ?? [];
};

/**
 * Get details for a single visit by ID
 * Calls: visits/get_details.php?users_uuid={uuid}&visit_id={id}
 */
export const getVisitDetailsById = async (visitId) => {
    if (!visitId) throw new Error('visitId is required');

    const userDataRaw = localStorage.getItem('userData');
    if (!userDataRaw) throw new Error('userData not found in localStorage');
    let users_uuid;
    try {
        const userData = JSON.parse(userDataRaw);
        users_uuid = userData.users_uuid;
    } catch (e) {
        console.error('❌ Error parsing userData JSON:', e);
        throw new Error('userData in localStorage is not valid JSON');
    }
    if (!users_uuid) throw new Error('users_uuid not found in userData');

    const url = buildApiUrl(`visits/get_details.php?users_uuid=${encodeURIComponent(users_uuid)}&visit_id=${encodeURIComponent(visitId)}`);
    const response = await apiClient.get(url);
    if (response.status === 'success') return response.data;
    throw new Error(response.message || 'Failed to retrieve visit details');
};

/**
 * Get comprehensive visit summary: info, activities, sales orders, payments, documents, returns
 * Calls: visits/get_visit_summary.php?visit_id={id}&users_uuid={uuid}
 */
export const getVisitSummaryById = async (visitId) => {
    if (!visitId) throw new Error('visitId is required');
    
    // Get users_uuid from localStorage
    const userDataRaw = localStorage.getItem('userData');
    if (!userDataRaw) throw new Error('userData not found in localStorage');
    
    let users_uuid;
    try {
        const userData = JSON.parse(userDataRaw);
        users_uuid = userData.users_uuid;
    } catch (e) {
        console.error('❌ Error parsing userData JSON:', e);
        throw new Error('userData in localStorage is not valid JSON');
    }
    
    if (!users_uuid) throw new Error('users_uuid not found in userData');
    
    const url = buildApiUrl(`visits/get_visit_summary.php?visit_id=${encodeURIComponent(visitId)}&users_uuid=${encodeURIComponent(users_uuid)}`);
    const response = await apiClient.get(url);
    if (response.status === 'success') return response.data;
    throw new Error(response.message || 'Failed to retrieve visit summary');
};

export default {
        getVisitsReports,
        getVisitsOverview,
    getVisitsActivities,
    getVisitsAreas,
    getVisitsRepresentatives,
    getVisitsAnalytics,
    getVisitsPerformance,
    getVisitsTopClients,
        getVisitsDetails,
    getVisitsDetailsUnpaginated,
    getVisitDetailsById,
        getVisitSummaryById,
};
