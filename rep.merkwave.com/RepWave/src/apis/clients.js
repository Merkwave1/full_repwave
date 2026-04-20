// src/apis/clients.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js'; // Import getUserUUID

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

// Modified to fetch all clients with users_uuid and handle nested data
export const getAllClients = async () => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.'); // Ensure UUID is available

  let url = buildApiUrl("clients/get_all.php");
  // Append users_uuid as a query parameter for GET requests
  url += `?users_uuid=${users_uuid}`;

  
  const response = await apiClient.get(url);
  
  // 🔍 COMPREHENSIVE BACKEND RESPONSE LOGGING
  
  if (response.data) {
    if (response.data.clients) {
      if (response.data.clients.length > 0) {
      }
    }
  }
  
  // Check if the status is success and if response.data.clients is an array
  if (response.status === "success" && response.data && Array.isArray(response.data.clients)) {
    return response.data.clients; // Return the nested clients array
  } else {
    // If the expected data structure is not found, throw an error
    throw new Error(response.message || "Failed to retrieve clients or unexpected data structure.");
  }
};

/**
 * Fetches detailed information for a specific client.
 * @param {number} clientId - The ID of the client to fetch details for.
 * @returns {Promise<Object>} A promise that resolves to the detailed client data.
 */
export const getClientDetails = async (clientId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  // Construct the URL for the get_detail.php endpoint
  const url = buildApiUrl(`clients/get_detail.php?users_uuid=${users_uuid}&client_id=${clientId}`);

  const response = await apiClient.get(url);
  if (response.status === "success" && response.data) {
    return response.data; // The detailed client data is directly in response.data
  } else {
    throw new Error(response.message || `Failed to retrieve details for client with ID ${clientId}.`);
  }
};


export const addClient = async (clientData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.'); // Ensure UUID is available

  const url = buildApiUrl("clients/add.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid); // Add users_uuid to form data

  for (const key in clientData) {
    if (key === 'clients_image' && clientData[key] instanceof File) {
      formData.append(key, clientData[key]);
    } else if (clientData[key] !== null && clientData[key] !== undefined) {
      formData.append(key, clientData[key]);
    }
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to add client.");
  }
};

export const updateClient = async (clientId, clientData) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.'); // Ensure UUID is available

  const url = buildApiUrl("clients/update.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid); // Add users_uuid to form data
  formData.append('clients_id', clientId);
  for (const key in clientData) {
    if (key === 'clients_image' && clientData[key] instanceof File) {
      formData.append(key, clientData[key]);
    } else if (clientData[key] !== null && clientData[key] !== undefined) {
      formData.append(key, clientData[key]);
    }
  }
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to update client.");
  }
};

export const deleteClient = async (clientId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.'); // Ensure UUID is available

  const url = buildApiUrl("clients/delete.php");
  const formData = new FormData();
  formData.append('users_uuid', users_uuid); // Add users_uuid to form data
  formData.append('clients_id', clientId);
  const response = await apiClient.postFormData(url, formData);
  if (response.status === "success") {
    return response.message;
  } else {
    throw new Error(response.message || "Failed to delete client.");
  }
};

export const getClientById = async (clientId) => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.'); // Ensure UUID is available

  let url = buildApiUrl(`clients/get_by_id.php?clients_id=${clientId}`);
  // Append users_uuid as a query parameter for GET requests
  url += `&users_uuid=${users_uuid}`; // Use & to add to existing query params

  const response = await apiClient.get(url);
  if (response.status === "success" && response.data) {
    return response.data;
  } else {
    throw new Error(response.message || `Failed to retrieve client with ID ${clientId}.`);
  }
};

/**
 * Fetches comprehensive client reports data including overview, details, documents, areas, industries, and analytics
 * @param {string} reportType - The type of report to fetch (overview, details, documents, areas, industries, analytics)
 * @returns {Promise<Object>} A promise that resolves to the client reports data
 */
export const getClientReports = async (reportType = 'overview') => {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  // Use the comprehensive reports endpoint
  let url = buildApiUrl(`clients/reports_comprehensive.php?users_uuid=${users_uuid}&report_type=${reportType}`);

  
  const response = await apiClient.get(url);
  
  
  if (response.status === "success" && response.data) {
    return response.data;
  } else {
    throw new Error(response.message || `Failed to retrieve ${reportType} reports.`);
  }
};
