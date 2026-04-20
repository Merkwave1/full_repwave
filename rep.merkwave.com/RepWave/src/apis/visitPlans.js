/**
 * Fetches visit plan details including assigned clients.
 * @param {number} planId - The ID of the visit plan.
 * @returns {Promise<Object>} The visit plan details object.
 */
// src/apis/visitPlans.js
import { apiClient } from '../utils/apiClient.js';
import { getCompanyName, getUserUUID } from '../apis/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

function buildApiUrl(endpoint) {
  const companyName = getCompanyName();
  if (!API_BASE_URL || !companyName) {
    throw new Error("API_BASE_URL or companyName is missing for API call.");
  }
  return `${API_BASE_URL}${companyName}/${endpoint}`;
}

/**
 * Fetches all visit plans from the API.
 * @returns {Promise<Array>} A promise that resolves to an array of visit plan objects.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function getAllVisitPlans() {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  let url = buildApiUrl("visit_plans/get_all.php?limit=1000");
  url += `&users_uuid=${users_uuid}`;

  try {
    const result = await apiClient.get(url);
    if (result.status === "success" && Array.isArray(result.data)) {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to retrieve visit plans.");
    }
  } catch (error) {
    console.error("Error fetching visit plans:", error);
    throw error;
  }
}

/**
 * Fetches details of a specific visit plan by ID.
 * @param {number} planId - The ID of the visit plan to fetch.
 * @returns {Promise<Object>} A promise that resolves to the visit plan object.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function getVisitPlanDetail(planId) {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  let url = buildApiUrl(`visit_plans/get_detail.php?visit_plan_id=${planId}`);
  url += `&users_uuid=${users_uuid}`;

  try {
    const result = await apiClient.get(url);
    if (result.status === "success" && result.data) {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to retrieve visit plan details.");
    }
  } catch (error) {
    console.error("Error fetching visit plan details:", error);
    throw error;
  }
}

/**
 * Adds a new visit plan.
 * @param {Object} planData - The visit plan data to be added.
 * @returns {Promise<string>} A promise that resolves to a success message.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function addVisitPlan(planData) {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("visit_plans/add_visits_plan.php");
  
  // Debug: Log the data being sent to API
  
  try {
    const result = await apiClient.post(url, { ...planData, users_uuid });
    
    if (result.status === "success") {
      return result.message || "Visit plan added successfully!";
    } else {
      throw new Error(result.message || "Failed to add visit plan.");
    }
  } catch (error) {
    console.error("Error adding visit plan:", error);
    throw error;
  }
}

/**
 * Updates an existing visit plan.
 * @param {number} planId - The ID of the visit plan to update.
 * @param {Object} planData - The updated visit plan data.
 * @returns {Promise<string>} A promise that resolves to a success message.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function updateVisitPlan(planId, planData) {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("visit_plans/update_plan.php");
  
  // Debug: Log the data being sent to API
  
  try {
    const result = await apiClient.post(url, { visit_plan_id: planId, ...planData, users_uuid });
    
    if (result.status === "success") {
      return result.message || "Visit plan updated successfully!";
    } else {
      throw new Error(result.message || "Failed to update visit plan.");
    }
  } catch (error) {
    console.error("Error updating visit plan:", error);
    throw error;
  }
}

/**
 * Deletes a visit plan by ID.
 * @param {number} planId - The ID of the visit plan to delete.
 * @returns {Promise<string>} A promise that resolves to a success message.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function deleteVisitPlan(planId) {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("visit_plans/delete_plan.php");
  
  // Debug: Log the data being sent to API
  
  try {
    const result = await apiClient.post(url, { visit_plan_id: planId, users_uuid });
    
    if (result.status === "success") {
      return result.message || "Visit plan deleted successfully!";
    } else {
      throw new Error(result.message || "Failed to delete visit plan.");
    }
  } catch (error) {
    console.error("Error deleting visit plan:", error);
    throw error;
  }
}

/**
 * Fetches available clients that can be assigned to visit plans.
 * @returns {Promise<Array>} A promise that resolves to an array of available client objects.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
/**
 * Fetches available clients that can be assigned to visit plans, with filters and sorts.
 * @param {Object} params - Filter and sort parameters (search, areaTag, industry, city, clientType, visitPlanId, etc.)
 * @returns {Promise<Array>} A promise that resolves to an array of available client objects.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function getAvailableClients(params = {}) {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  let url = buildApiUrl("visit_plans/get_available_clients.php");
  const query = new URLSearchParams();
  query.append('users_uuid', users_uuid);
  if (params.visitPlanId) query.append('visit_plan_id', params.visitPlanId);
  if (params.search) query.append('search', params.search);
  if (params.areaTag) query.append('area_tag_id', params.areaTag);
  if (params.industry) query.append('industry_id', params.industry);
  if (params.city) query.append('city', params.city);
  if (params.clientType) query.append('client_type', params.clientType);
  // Add more filters as needed
  url += `?${query.toString()}`;

  try {
    const result = await apiClient.get(url);
    if (result.status === "success" && Array.isArray(result.data)) {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to retrieve available clients.");
    }
  } catch (error) {
    console.error("Error fetching available clients:", error);
    throw error;
  }
}

/**
 * Adds clients to a visit plan.
 * @param {number} planId - The ID of the visit plan.
 * @param {Array<number>} clientIds - Array of client IDs to add to the plan.
 * @returns {Promise<string>} A promise that resolves to a success message.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */

/**
 * Assigns the selected clients to a visit plan (replaces all previous assignments).
 * @param {number} planId - The ID of the visit plan.
 * @param {Array<number>} clientIds - Array of client IDs to assign to the plan.
 * @returns {Promise<string>} A promise that resolves to a success message.
 * @throws {Error} Throws an error if the API call fails or returns a non-success status.
 */
export async function assignClientsToVisitPlan(planId, clientIds) {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  const url = buildApiUrl("visit_plans/assigned_clients.php");
  try {
    const result = await apiClient.post(url, {
      visit_plan_id: planId,
      client_ids: clientIds,
      users_uuid
    });
    if (result.status === "success") {
      return result.message || "تم حفظ التغييرات بنجاح!";
    } else {
      throw new Error(result.message || "فشل في حفظ التغييرات.");
    }
  } catch (error) {
    console.error("Error assigning clients to visit plan:", error);
    throw error;
  }
}

/**
 * Fetches all clients (assigned and unassigned) for a visit plan, with assignment status.
 * @param {Object} params - { visitPlanId, ...filters }
 * @returns {Promise<Array>} Array of client objects with is_assigned field.
 */
export async function getAllClientsWithAssignmentStatus(params = {}) {
  const users_uuid = getUserUUID();
  if (!users_uuid) throw new Error('User UUID is required.');

  let url = buildApiUrl("visit_plans/get_all_clients.php");
  const query = new URLSearchParams();
  query.append('users_uuid', users_uuid);
  if (params.visitPlanId) query.append('visit_plan_id', params.visitPlanId);
  if (params.search) query.append('search', params.search);
  if (params.areaTag) query.append('area_tag_id', params.areaTag);
  if (params.industry) query.append('industry_id', params.industry);
  if (params.city) query.append('city', params.city);
  if (params.clientType) query.append('client_type', params.clientType);
  url += `?${query.toString()}`;

  try {
    const result = await apiClient.get(url);
    if (result.status === "success" && Array.isArray(result.data)) {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to retrieve all clients.");
    }
  } catch (error) {
    console.error("Error fetching all clients:", error);
    throw error;
  }
}
