// src/apis/client_documents.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!companyName) throw new Error('Company name not found in localStorage. Please log in.');
  const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;
  if (!API_BASE_URL) throw new Error('VITE_API_LOGIN_BASE_URL is not defined.');
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Get all documents for a specific client
 * @param {number} clientId - The client ID
 * @returns {Promise<Array>} - Array of client documents
 */
export const getClientDocuments = async (clientId) => {
  if (!clientId) {
    throw new Error('Client ID is required');
  }
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  
  let url = buildApiUrl('client_documents/get_all.php');
  url += `?users_uuid=${users_uuid}&client_id=${clientId}`;
  
  const response = await apiClient.get(url);
  
  if (response.status === 'success') {
    return response.data?.documents || response.data || [];
  } else {
    throw new Error(response.message || 'Failed to retrieve client documents.');
  }
};

/**
 * Get detailed information for a specific document
 * @param {number} documentId - The document ID
 * @returns {Promise<Object>} - Document details
 */
export const getClientDocumentDetails = async (documentId) => {
  if (!documentId) {
    throw new Error('Document ID is required');
  }
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required. Please log in.');
  
  let url = buildApiUrl('client_documents/get_detail.php');
  url += `?users_uuid=${users_uuid}&client_document_id=${documentId}`;
  
  const response = await apiClient.get(url);
  
  if (response.status === 'success') {
    return response.data;
  } else {
    throw new Error(response.message || 'Failed to retrieve document details.');
  }
};

/**
 * Add a new client document
 * @param {FormData} formData - Form data containing document information and file
 * @returns {Promise<string>} - Success message
 */
export const addClientDocument = async (formData) => {
  const url = buildApiUrl('client_documents/add.php');
  const users_uuid = getUserUUID();
  formData.append('users_uuid', users_uuid);
  
  const response = await apiClient.postFormData(url, formData);
  
  if (response.status === 'success') {
    return response.message || 'Document added successfully.';
  } else {
    throw new Error(response.message || 'Failed to add document.');
  }
};

/**
 * Delete a client document
 * @param {number} documentId - The document ID to delete
 * @returns {Promise<string>} - Success message
 */
export const deleteClientDocument = async (documentId) => {
  if (!documentId) {
    throw new Error('Document ID is required');
  }
  const url = buildApiUrl('client_documents/delete.php');
  const formData = new FormData();
  formData.append('client_document_id', documentId);

  const users_uuid = getUserUUID();
  if (users_uuid) {
    formData.append('users_uuid', users_uuid);
  }

  const response = await apiClient.postFormData(url, formData);
  
  if (response.status === 'success') {
    return response.message || 'Document deleted successfully.';
  } else {
    throw new Error(response.message || 'Failed to delete document.');
  }
};

