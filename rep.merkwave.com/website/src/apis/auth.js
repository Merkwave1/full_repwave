// src/apis/auth.js
// This file contains API functions related to authentication and global auth state management.

import { apiClient } from '../utils/apiClient.js';
import { getAllUsers } from './users.js';
import { getAllCategories } from './categories.js';
import { getAllClients as fetchAllClients } from './clients.js';
import { getAllClientAreaTags as fetchAllClientAreaTags } from './client_area_tags.js';
import { getAllClientIndustries as fetchAllClientIndustries } from './client_industries.js';
import { getAllCountriesWithGovernorates as fetchAllCountriesWithGovernorates } from './countries.js';
import { getAllProductAttributesWithValues as fetchAllProductAttributesWithValues } from './product_attributes.js';
import { getAllBaseUnits as fetchAllBaseUnits } from './base_units.js';
import { getAllProducts as fetchAllProducts } from './products.js';
import { getAllWarehouses as fetchAllWarehouses } from './warehouses.js';
import { getAllPackagingTypes as fetchAllPackagingTypes } from './packaging_types.js';
import { getAllSuppliers as fetchAllSuppliers } from './suppliers.js';
import { getAllPurchaseOrders as fetchAllPurchaseOrders } from './purchase_orders.js'; // Import getAllPurchaseOrders
import { getPurchaseReturns as fetchAllPurchaseReturns } from './purchase_returns.js'; // Import purchase returns
import { getAllSalesOrders as fetchAllSalesOrders, getDeliverableSalesOrders as fetchDeliverableSalesOrders } from './sales_orders.js'; // Import sales orders
import { getAllSalesReturns as fetchAllSalesReturns } from './sales_returns.js'; // Import sales returns
import { getAllVisitPlans as fetchAllVisitPlans } from './visitPlans.js'; // Import visit plans
import { getAllGoodsReceipts as fetchAllGoodsReceipts } from './goods_receipts.js'; // Import goods receipts
import { getPaymentMethods as fetchAllPaymentMethods } from './payment_methods.js'; // Import payment methods
import { getSafes as fetchAllSafes } from './safes.js'; // Import safes
import { getAllInventory as fetchAllInventory } from './inventory.js'; // Import inventory API
import { refreshVersions } from '../services/versions.js';
import { getNotifications as fetchRawNotifications } from './notifications.js';

const API_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

/**
 * Safe localStorage setter that handles QuotaExceededError
 * @param {string} key - The localStorage key
 * @param {any} data - The data to store (will be JSON stringified)
 * @returns {boolean} - True if stored successfully, false otherwise
 */
function safeLocalStorageSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn(`localStorage quota exceeded for '${key}', skipping cache`);
      // Try to clear this specific key to free space
      localStorage.removeItem(key);
    } else {
      console.error(`Error storing '${key}' in localStorage:`, error);
    }
    return false;
  }
}

export function logout() {
  // Clear all localStorage data
  localStorage.clear();
  window.location.href = '/login';
}

export async function loginUser(loginUrl, email, password, companyName) {
  // Clear all previous localStorage data for a clean login
  localStorage.clear();
  
  const formData = new FormData();
  formData.append('users_email', email);
  formData.append('users_password', password);
  formData.append('users_companies_name', companyName);

  try {
    const loginResult = await apiClient.postFormData(loginUrl, formData);

    if (loginResult.status === "success" && loginResult.data) {
      // Store user data and company name FIRST
      localStorage.setItem('userData', JSON.stringify(loginResult.data));
      localStorage.setItem('companyName', companyName);

      // Now fetch and store all app data on login using the updated getApp* functions
      // The user UUID is now available for API calls that require it
  await Promise.all([
        getAppSettings(true), // Force refresh
        getAppSettingsCategorized(true), // Force refresh categorized settings
        getAppUsers(true),
        getAppCategories(true),
        getAppClients(true), // Stores raw array under 'appClients'
        getAppClientAreaTags(true),
  getAppClientIndustries(true),
  getAppClientTypes(true),
        getAppCountriesWithGovernorates(true), // Force refresh countries with governorates on login
        getAppProductAttributes(true),
        getAppBaseUnits(true),
        getAppProducts(true),
        getAppWarehouses(true),
        getAppPackagingTypes(true),
        getAppSuppliers(true),
        getAppPurchaseOrders(true), // Force refresh purchase orders on login
        getAppSalesOrders(true), // Force refresh sales orders on login
        getAppSalesReturns(true), // Force refresh sales returns on login
        getAppVisitPlans(true), // Force refresh visit plans on login
        getAppPaymentMethods(true), // Force refresh payment methods on login
  getAppSafes(true), // Force refresh safes on login
  getAppInventory(true), // Preload inventory for faster initial load
        getAppNotifications(true), // NEW: prefetch notifications on login
        refreshVersions(true) // Fetch and store Versions immediately on login
      ]);
      // One-time cleanup of legacy duplicate keys
  // (version sync removed)
      

    }
    return loginResult;
  } catch (error) {
    console.error('Error in loginUser API call:', error);
    throw error;
  }
}

export function isAuthenticated() {
  const userData = localStorage.getItem('userData');
  const companyName = localStorage.getItem('companyName');
  return !!userData && !!companyName;
}

export function getCompanyName() {
  return localStorage.getItem('companyName');
}

/**
 * Gets the current user's data from localStorage
 * @returns {Object|null} The user data or null if not found
 */
export function getUserData() {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData);
    }
  } catch (error) {
    console.error("Error parsing userData from localStorage:", error);
  }
  return null;
}

/**
 * Gets the current user's role
 * @returns {string|null} The user role or null if not found
 */
export function getUserRole() {
  const userData = getUserData();
  return userData?.users_role || null;
}

/**
 * Checks if the current user is an admin
 * @returns {boolean} True if user is admin, false otherwise
 */
export function isAdmin() {
  const role = getUserRole();
  return role === 'admin' || role === 'cash';
}

/**
 * Checks if the user is authenticated AND has admin role
 * @returns {boolean} True if authenticated and admin, false otherwise
 */
export function isAuthenticatedAdmin() {
  return isAuthenticated() && isAdmin();
}

/**
 * Retrieves the user's UUID from localStorage.
 * @returns {string|null} The user's UUID or null if not found.
 */
export function getUserUUID() {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsedData = JSON.parse(userData);
      return parsedData.users_uuid || null;
    }
  } catch (error) {
    console.error("Error parsing userData from localStorage:", error);
  }
  return null;
}

/**
 * Fetches and caches application settings.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the application settings.
 */
export async function getAppSettings(forceApiRefresh = false) {
  const cacheKey = 'appSettings';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    const companyName = getCompanyName();
    if (!companyName) {
      return [];
    }
    const settingsUrl = `${API_BASE_URL}${companyName}/settings/get_all.php`;
    const settingsResult = await apiClient.get(settingsUrl);
    if (settingsResult.status === "success" && settingsResult.data) {
      safeLocalStorageSet(cacheKey, settingsResult.data);
      return settingsResult.data;
    } else {
      return [];
    }
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : []; // Return cached data even if API fetch fails
  }
}

/**
 * Fetches and caches categorized application settings.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Object>} - A promise that resolves to categorized settings.
 */
export async function getAppSettingsCategorized(forceApiRefresh = false) {
  const cacheKey = 'appSettingsCategorized';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  
  try {
    const allSettings = await getAppSettings(forceApiRefresh);
    
    const categorizedSettings = {
      company: [],
      system: [],
      financial: [],
      inventory: [],
      business: [],
      mobile: [],
      visit: [],
      safe: [],
      warehouse: [],
      client: [],
      notifications: [],
      security: [],
      backup: [],
      reports: [],
      product: [],
      ui: [],
      integration: [],
      performance: [],
      advanced: []
    };

    const explicitFinancialKeys = new Set([
      'defult_client_credit_limit'
    ]);

    allSettings.forEach(setting => {
      const key = setting.settings_key;
      
      if (explicitFinancialKeys.has(key)) {
        categorizedSettings.financial.push(setting);
      } else if (key.startsWith('company_')) {
        categorizedSettings.company.push(setting);
      } else if (key.includes('users_limits') || key.includes('expiration_date') || key.includes('_limit') || key.includes('timezone') || key.includes('language') || key.includes('date_format') || key.includes('time_format') || key.includes('fiscal_year')) {
        categorizedSettings.system.push(setting);
      } else if (key.includes('currency') || key.includes('tax') || key.includes('payment') || key.includes('decimal')) {
        categorizedSettings.financial.push(setting);
      } else if (key.includes('stock') || key.includes('inventory') || key.includes('batch') || key.includes('reorder') || key.includes('expiry')) {
        categorizedSettings.inventory.push(setting);
      } else if (key.includes('approve') || key.includes('credit') || key.includes('order') || key.includes('invoice') || key.includes('return') || key.includes('discount') || key.includes('_prefix')) {
        categorizedSettings.business.push(setting);
      } else if (key.includes('gps') || key.includes('mobile') || key.includes('photo') || key.includes('location') || key.includes('offline') || key.includes('check_in') || key.includes('check_out')) {
        categorizedSettings.mobile.push(setting);
      } else if (key.includes('visit')) {
        categorizedSettings.visit.push(setting);
      } else if (key.includes('safe') || key.includes('expense') || key.includes('collection') || key.includes('deposit') || key.includes('closing')) {
        categorizedSettings.safe.push(setting);
      } else if (key.includes('warehouse') || key.includes('transfer') || key.includes('goods_receipt') || key.includes('adjustment') || key.includes('van')) {
        categorizedSettings.warehouse.push(setting);
      } else if (key.includes('client') || key.includes('overdue')) {
        categorizedSettings.client.push(setting);
      } else if (key.includes('notification') || key.includes('email') || key.includes('sms') || key.includes('push')) {
        categorizedSettings.notifications.push(setting);
      } else if (key.includes('security') || key.includes('password') || key.includes('session') || key.includes('login') || key.includes('lockout') || key.includes('authentication')) {
        categorizedSettings.security.push(setting);
      } else if (key.includes('backup') || key.includes('maintenance') || key.includes('retention')) {
        categorizedSettings.backup.push(setting);
      } else if (key.includes('report') || key.includes('analytics') || key.includes('dashboard')) {
        categorizedSettings.reports.push(setting);
      } else if (key.includes('product') || key.includes('barcode') || key.includes('variant') || key.includes('packaging')) {
        categorizedSettings.product.push(setting);
      } else if (key.includes('theme') || key.includes('items_per_page') || key.includes('help') || key.includes('tooltip')) {
        categorizedSettings.ui.push(setting);
      } else if (key.includes('api') || key.includes('webhook') || key.includes('integration')) {
        categorizedSettings.integration.push(setting);
      } else if (key.includes('cache') || key.includes('performance') || key.includes('optimization')) {
        categorizedSettings.performance.push(setting);
      } else {
        categorizedSettings.advanced.push(setting);
      }
    });

    safeLocalStorageSet(cacheKey, categorizedSettings);
    return categorizedSettings;
  } catch (error) {
    console.error('Error fetching and caching categorized settings:', error);
    return cachedData ? JSON.parse(cachedData) : {
      company: [], system: [], financial: [], inventory: [], business: [], mobile: [],
      visit: [], safe: [], warehouse: [], client: [], notifications: [], security: [],
      backup: [], reports: [], product: [], ui: [], integration: [], performance: [], advanced: []
    };
  }
}

/**
 * Fetches and caches application users.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the application users.
*/
export async function getAppUsers(forceApiRefresh = false) {
  const cacheKey = 'appUsers';
  const cachedData = localStorage.getItem(cacheKey);
  const parsedCache = cachedData ? JSON.parse(cachedData) : null;

  if (parsedCache && !forceApiRefresh) {
    return parsedCache;
  }
  try {
    const apiData = await getAllUsers();
    safeLocalStorageSet(cacheKey, apiData);
    return apiData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return parsedCache ?? [];
  }
}

/**
 * Fetches and caches application categories.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the application categories.
 */
export async function getAppCategories(forceApiRefresh = false) {
  const cacheKey = 'appCategories';
  const cachedData = localStorage.getItem(cacheKey);
  const parsedCache = cachedData ? JSON.parse(cachedData) : null;

  if (parsedCache && !forceApiRefresh) {
    return parsedCache;
  }
  try {
    const apiData = await getAllCategories();
    safeLocalStorageSet(cacheKey, apiData);
    return apiData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return parsedCache ?? [];
  }
}

/**
 * Fetches and caches clients.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the clients.
 */
export async function getAppClients(forceApiRefresh = false) {
  const cacheKey = 'appClients';
  const cachedData = localStorage.getItem(cacheKey);
  const parsedCache = cachedData ? JSON.parse(cachedData) : null;
  if (parsedCache && !forceApiRefresh) return parsedCache;
  try {
    const apiData = await fetchAllClients();
    safeLocalStorageSet(cacheKey, apiData);
    return apiData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return parsedCache ?? [];
  }
}

/**
 * Fetches and caches client area tags.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the client area tags.
 */
export async function getAppClientAreaTags(forceApiRefresh = false) {
  const cacheKey = 'appClientAreaTags';
  const cachedData = localStorage.getItem(cacheKey);
  const parsedCache = cachedData ? JSON.parse(cachedData) : null;
  const cacheHasSortOrder = Array.isArray(parsedCache) && parsedCache.every(item => item && item.sort_order !== undefined);

  if (parsedCache && !forceApiRefresh && cacheHasSortOrder) {
    return parsedCache;
  }
  try {
    const apiData = await fetchAllClientAreaTags();
    safeLocalStorageSet(cacheKey, apiData);
    return apiData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return parsedCache ?? [];
  }
}

/**
 * Fetches and caches client industries.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the client industries.
 */
export async function getAppClientIndustries(forceApiRefresh = false) {
  const cacheKey = 'appClientIndustries';
  const cachedData = localStorage.getItem(cacheKey);
  const parsedCache = cachedData ? JSON.parse(cachedData) : null;
  const cacheHasSortOrder = Array.isArray(parsedCache) && parsedCache.every(item => item && item.sort_order !== undefined);

  if (parsedCache && !forceApiRefresh && cacheHasSortOrder) {
    return parsedCache;
  }
  try {
    const apiData = await fetchAllClientIndustries();
    safeLocalStorageSet(cacheKey, apiData);
    return apiData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return parsedCache ?? [];
  }
}

/**
 * Fetches and caches client types.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the client types.
 */
export async function getAppClientTypes(forceApiRefresh = false) {
  const cacheKey = 'appClientTypes';
  const cachedData = localStorage.getItem(cacheKey);
  const parsedCache = cachedData ? JSON.parse(cachedData) : null;
  const cacheHasSortOrder = Array.isArray(parsedCache) && parsedCache.every(item => item && item.sort_order !== undefined);

  if (parsedCache && !forceApiRefresh && cacheHasSortOrder) {
    return parsedCache;
  }
  try {
    const { getAllClientTypes } = await import('./client_types.js');
    const apiData = await getAllClientTypes();
    safeLocalStorageSet(cacheKey, apiData);
    return apiData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return parsedCache ?? [];
  }
}

/**
 * Fetches and caches countries with their governorates.
 * This function makes a single API call to get countries with nested governorates.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to countries with nested governorates.
 */
export async function getAppCountriesWithGovernorates(forceApiRefresh = false) {
  const cacheKey = 'appCountriesWithGovernorates';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    // Single API call to fetch countries with their governorates already nested
    const countriesWithGovernorates = await fetchAllCountriesWithGovernorates();

    safeLocalStorageSet(cacheKey, countriesWithGovernorates);
    return countriesWithGovernorates;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : [];
  }
}

/**
 * Fetches and caches product attributes with their values.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the product attributes.
 */
export async function getAppProductAttributes(forceApiRefresh = false) {
  const cacheKey = 'appProductAttributes';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    const apiData = await fetchAllProductAttributesWithValues();
    safeLocalStorageSet(cacheKey, apiData);
    return apiData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : [];
  }
}

/**
 * Fetches and caches base units.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the base units.
 */
export async function getAppBaseUnits(forceApiRefresh = false) {
  const cacheKey = 'appBaseUnits';
  const cachedData = localStorage.getItem(cacheKey);
  // Return cache unless forced
  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    const apiData = await fetchAllBaseUnits();
    const wrappedData = { data: apiData };
    safeLocalStorageSet(cacheKey, wrappedData);
    return wrappedData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : { data: [] };
  }
}


export async function getAppProducts(forceApiRefresh = false) {
  const cacheKey = 'appProducts';
  const cachedData = localStorage.getItem(cacheKey);
  // Return cache unless forced
  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    // fetchAllProducts returns an object like { products: [...] } or just [...]
    const apiResponse = await fetchAllProducts();

    let productsArray = [];
    // IMPORTANT FIX: Extract the 'products' array from the API response object
    // This handles cases where fetchAllProducts returns { products: [...] }
    if (apiResponse && Array.isArray(apiResponse.products)) {
      productsArray = apiResponse.products;
    } else if (Array.isArray(apiResponse)) { // Fallback if API suddenly returns array directly (which getAllProducts now does)
      productsArray = apiResponse;
    }

    if (productsArray.length > 0) {
      const wrappedData = { data: productsArray };
      safeLocalStorageSet(cacheKey, wrappedData);
      return wrappedData;
    } else {
      return cachedData ? JSON.parse(cachedData) : { data: [] }; // Return cached or empty array
    }
  } catch (error) {
    console.error(`[getAppProducts] Error fetching and caching ${cacheKey}:`, error);
    const dataToReturn = cachedData ? JSON.parse(cachedData) : { data: [] };
    return dataToReturn;
  }
}

/**
 * Fetches and caches warehouses.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the warehouses.
 */
export async function getAppWarehouses(forceApiRefresh = false, includeAllWarehouses = false) {
  const cacheKey = 'appWarehouses';
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    const apiData = await fetchAllWarehouses(includeAllWarehouses);
    const wrappedData = { data: apiData };
    safeLocalStorageSet(cacheKey, wrappedData);
    return wrappedData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : { data: [] };
  }
}


export async function getAppPackagingTypes(forceApiRefresh = false) {
  const cacheKey = 'appPackagingTypes';
  const cachedData = localStorage.getItem(cacheKey);
  // Return cache unless forced
  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }

  try {
    const apiData = await fetchAllPackagingTypes();

    if (apiData !== null && apiData !== undefined && Array.isArray(apiData)) { // Ensure apiData is an array before stringifying
      const wrappedData = { data: apiData };
      safeLocalStorageSet(cacheKey, wrappedData);
      return wrappedData;
    } else {
      return cachedData ? JSON.parse(cachedData) : { data: [] }; // Return cached or empty array
    }
  } catch (error) {
    console.error(`[getAppPackagingTypes] Error fetching and caching ${cacheKey}:`, error);
    // If an error occurs, return previously cached data or an empty array
    const dataToReturn = cachedData ? JSON.parse(cachedData) : { data: [] };
    return dataToReturn;
  }
}

/**
 * Fetches and caches suppliers.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the suppliers.
 */
export async function getAppSuppliers(forceApiRefresh = false) {
  const cacheKey = 'appSuppliers';
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    const apiData = await fetchAllSuppliers();
    const wrappedData = { data: apiData };
    safeLocalStorageSet(cacheKey, wrappedData);
    return wrappedData;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : { data: [] };
  }
}


export async function getAppPurchaseOrders(forceApiRefresh = false) {
  const cacheKey = 'appPurchaseOrders';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }

  try {
    // fetchAllPurchaseOrders (which is your getAllPurchaseOrders from purchase_orders.js)
    // now directly returns the array of purchase orders or an empty array [].
    const apiResponse = await fetchAllPurchaseOrders();

    let purchaseOrdersArray = [];
    // The previous `if (apiResponse && Array.isArray(apiResponse.purchase_orders))`
    // is now likely false because `apiResponse` itself is the array.
    // The `else if (Array.isArray(apiResponse))` handles this correctly.
    if (Array.isArray(apiResponse)) { // This is the expected path now
      purchaseOrdersArray = apiResponse;
    } else if (apiResponse && Array.isArray(apiResponse.purchase_orders)) { // Fallback for older API responses
      purchaseOrdersArray = apiResponse.purchase_orders;
  }

  if (purchaseOrdersArray.length > 0) {
      safeLocalStorageSet(cacheKey, purchaseOrdersArray);
      return purchaseOrdersArray;
    } else {
      return cachedData ? JSON.parse(cachedData) : []; // Return cached or empty array
    }
  } catch (error) {
    console.error(`[getAppPurchaseOrders] Error fetching and caching ${cacheKey}:`, error);
    const dataToReturn = cachedData ? JSON.parse(cachedData) : [];
    return dataToReturn;
  }
}

/**
 * Get pending purchase orders for receiving products (optimized for receive products page)
 * @param {boolean} forceApiRefresh - Whether to force a fresh API call instead of using cache.
 * @returns {Promise<Array>} Array of purchase orders with pending items or empty array.
 */
export async function getAppPendingPurchaseOrdersForReceive(forceApiRefresh = false) {
  const cacheKey = 'appPendingPurchaseOrdersForReceive';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }

  try {
    const { getPendingPurchaseOrdersForReceive } = await import('./purchase_orders.js');
    const apiResponse = await getPendingPurchaseOrdersForReceive();

    let purchaseOrdersArray = [];
    if (Array.isArray(apiResponse)) {
      purchaseOrdersArray = apiResponse;
    }

    if (Array.isArray(purchaseOrdersArray)) {
      // Always update cache with fresh data, even if it's empty array
      safeLocalStorageSet(cacheKey, purchaseOrdersArray);
      return purchaseOrdersArray;
    } else {
      // If API response is invalid, fall back to cached data
      return cachedData ? JSON.parse(cachedData) : [];
    }
  } catch (error) {
    console.error(`[getAppPendingPurchaseOrdersForReceive] Error fetching and caching ${cacheKey}:`, error);
    const dataToReturn = cachedData ? JSON.parse(cachedData) : [];
    return dataToReturn;
  }
}

/**
 * Get all visit plans, with caching and force refresh capability.
 * @param {boolean} forceApiRefresh - Whether to force a fresh API call instead of using cache.
 * @returns {Promise<Array>} Array of visit plans or empty array if error/empty.
 */
export async function getAppVisitPlans(forceApiRefresh = false) {
  const cacheKey = 'visitPlans';
  const cachedData = localStorage.getItem(cacheKey);

  if (!forceApiRefresh && cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const apiData = await fetchAllVisitPlans();

    if (Array.isArray(apiData) && apiData.length > 0) {
      safeLocalStorageSet(cacheKey, apiData);
      return apiData;
    } else {
      // API returned empty or invalid data, return cached or empty array
      return cachedData ? JSON.parse(cachedData) : []; // Return cached or empty array
    }
  } catch (error) {
    console.error(`[getAppVisitPlans] Error fetching and caching ${cacheKey}:`, error);
    const dataToReturn = cachedData ? JSON.parse(cachedData) : [];
    return dataToReturn;
  }
}

export async function getAppPurchaseReturns(forceApiRefresh = false) {
  const cacheKey = 'appPurchaseReturns';
  const cachedData = localStorage.getItem(cacheKey);

  if (!forceApiRefresh && cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const apiResponse = await fetchAllPurchaseReturns();


    // Extract the purchase returns array from API response
    // Assuming the API returns either an array directly or an object with purchase_returns array
    let purchaseReturnsArray;
    if (Array.isArray(apiResponse)) {
      purchaseReturnsArray = apiResponse;
    } else if (apiResponse && Array.isArray(apiResponse.purchase_returns)) {
      purchaseReturnsArray = apiResponse.purchase_returns;
    } else {
      purchaseReturnsArray = [];
    }

    if (Array.isArray(purchaseReturnsArray) && purchaseReturnsArray.length >= 0) {
      safeLocalStorageSet(cacheKey, purchaseReturnsArray);
      return purchaseReturnsArray;
    } else {
      const dataToReturn = cachedData ? JSON.parse(cachedData) : [];
      return dataToReturn;
    }
  } catch (error) {
    console.error(`[getAppPurchaseReturns] Error fetching and caching ${cacheKey}:`, error);
    const dataToReturn = cachedData ? JSON.parse(cachedData) : [];
    return dataToReturn;
  }
}

/**
 * Get all sales orders, with caching and force refresh capability.
 * @param {boolean} forceApiRefresh - Whether to force a fresh API call instead of using cache.
 * @returns {Promise<Array>} Array of sales orders or empty array if error/empty.
 */
export async function getAppSalesOrders(forceApiRefresh = false) {
  const cacheKey = 'appSalesOrders';
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && !forceApiRefresh) {
    try { return JSON.parse(cachedData); } catch { /* fall through */ }
  }

  try {
    const apiResponse = await fetchAllSalesOrders();

    // Extract the sales orders array from API response
    let salesOrdersArray = [];
    if (Array.isArray(apiResponse)) {
      salesOrdersArray = apiResponse;
    } else if (apiResponse && apiResponse.data && Array.isArray(apiResponse.data.data)) {
      // Handle paginated response structure: { data: { pagination: {...}, data: [...] } }
      salesOrdersArray = apiResponse.data.data;
    } else if (apiResponse && Array.isArray(apiResponse.data)) {
      salesOrdersArray = apiResponse.data;
    } else if (apiResponse && Array.isArray(apiResponse.sales_orders)) {
      salesOrdersArray = apiResponse.sales_orders;
    }

    if (Array.isArray(salesOrdersArray)) {
      safeLocalStorageSet(cacheKey, salesOrdersArray);
      return salesOrdersArray;
    }
    return cachedData ? (JSON.parse(cachedData)) : [];
  } catch (error) {
    console.error(`[getAppSalesOrders] Error fetching and caching ${cacheKey}:`, error);
  const dataToReturn = cachedData ? (() => { try { return JSON.parse(cachedData); } catch { return []; } })() : [];
    return dataToReturn;
  }
}

/**
 * Get deliverable sales orders (orders that need delivery), with caching and force refresh capability.
 * @param {boolean} forceApiRefresh - Whether to force a fresh API call instead of using cache.
 * @returns {Promise<Array>} Array of deliverable sales orders or empty array if error/empty.
 */
export async function getAppDeliverableSalesOrders(forceApiRefresh = false) {
  const cacheKey = 'appDeliverableSalesOrders';
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && !forceApiRefresh) {
    try { return JSON.parse(cachedData); } catch { /* fall through */ }
  }

  try {
    // Pass high limit to get all deliverable orders (not just first 10)
    const apiResponse = await fetchDeliverableSalesOrders({ limit: 10000 });

    // Extract the sales orders array from API response
    let salesOrdersArray = [];
    if (Array.isArray(apiResponse)) {
      salesOrdersArray = apiResponse;
    } else if (apiResponse && apiResponse.data && Array.isArray(apiResponse.data.data)) {
      // Handle paginated response structure: { data: { pagination: {...}, data: [...] } }
      salesOrdersArray = apiResponse.data.data;
    } else if (apiResponse && Array.isArray(apiResponse.data)) {
      salesOrdersArray = apiResponse.data;
    } else if (apiResponse && Array.isArray(apiResponse.sales_orders)) {
      salesOrdersArray = apiResponse.sales_orders;
    }

    if (Array.isArray(salesOrdersArray)) {
      safeLocalStorageSet(cacheKey, salesOrdersArray);
      return salesOrdersArray;
    }
    return cachedData ? (JSON.parse(cachedData)) : [];
  } catch (error) {
    console.error(`[getAppDeliverableSalesOrders] Error fetching and caching ${cacheKey}:`, error);
    const dataToReturn = cachedData ? (() => { try { return JSON.parse(cachedData); } catch { return []; } })() : [];
    return dataToReturn;
  }
}

/**
 * Get all sales returns, with caching and force refresh capability.
 * @param {boolean} forceApiRefresh - Whether to force a fresh API call instead of using cache.
 * @returns {Promise<Array>} Array of sales returns or empty array if error/empty.
 */
export async function getAppSalesReturns(forceApiRefresh = false) {
  const cacheKey = 'appSalesReturns';
  const cachedData = localStorage.getItem(cacheKey);

  if (!forceApiRefresh && cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const apiResponse = await fetchAllSalesReturns();

    // Extract the sales returns array from API response
    let salesReturnsArray = [];
    if (apiResponse && Array.isArray(apiResponse.data)) {
      salesReturnsArray = apiResponse.data; // from get_all.php { pagination, data }
    } else if (Array.isArray(apiResponse)) {
      salesReturnsArray = apiResponse;
    } else if (apiResponse && Array.isArray(apiResponse.sales_returns)) {
      salesReturnsArray = apiResponse.sales_returns;
    }

    if (Array.isArray(salesReturnsArray) && salesReturnsArray.length >= 0) {
      safeLocalStorageSet(cacheKey, salesReturnsArray);
      return salesReturnsArray;
    } else {
      return cachedData ? JSON.parse(cachedData) : [];
    }
  } catch (error) {
    console.error(`[getAppSalesReturns] Error fetching and caching ${cacheKey}:`, error);
    const dataToReturn = cachedData ? JSON.parse(cachedData) : [];
    return dataToReturn;
  }
}

/**
 * Fetches and caches payment methods.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the payment methods.
 */
export async function getAppPaymentMethods(forceApiRefresh = false) {
  const cacheKey = 'appPaymentMethods';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    const apiResponse = await fetchAllPaymentMethods();
    // The fetchAllPaymentMethods returns { payment_methods: [...] }
    const paymentMethodsArray = apiResponse.payment_methods || [];
    safeLocalStorageSet(cacheKey, paymentMethodsArray);
    return paymentMethodsArray;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : [];
  }
}

/**
 * Fetches and caches safes.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the safes.
 */
export async function getAppSafes(forceApiRefresh = false) {
  const cacheKey = 'appSafes';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return JSON.parse(cachedData);
  }
  try {
    const apiResponse = await fetchAllSafes();
    // The fetchAllSafes returns { safes: [...] }
    const safesArray = apiResponse.safes || [];
    safeLocalStorageSet(cacheKey, safesArray);
    return safesArray;
  } catch (error) {
    console.error(`Error fetching and caching ${cacheKey}:`, error);
    return cachedData ? JSON.parse(cachedData) : [];
  }
}

/**
 * Get all goods receipts data from localStorage or API, with caching and force refresh capability.
 * @param {boolean} forceApiRefresh - Whether to force a fresh API call instead of using cache.
 * @returns {Promise<{data: Array}>} - A promise that resolves to an object containing the goods receipts array.
 */
export async function getAppGoodsReceipts(forceApiRefresh = false) {
  const cacheKey = 'appGoodsReceipts';
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && !forceApiRefresh) {
    return { data: JSON.parse(cachedData) };
  }
  
  try {
    const goodsReceiptsArray = await fetchAllGoodsReceipts();
    
    if (Array.isArray(goodsReceiptsArray)) {
      safeLocalStorageSet(cacheKey, goodsReceiptsArray);
      return { data: goodsReceiptsArray };
    } else {
      return { data: cachedData ? JSON.parse(cachedData) : [] };
    }
  } catch (error) {
    console.error(`[getAppGoodsReceipts] Error fetching and caching goods receipts:`, error);
    return { data: cachedData ? JSON.parse(cachedData) : [] };
  }
}

// Aliases for backward compatibility
export const getPaymentMethods = getAppPaymentMethods;
export const getSafes = getAppSafes;

/**
 * Get all inventory items with caching & stale check for offline / faster access.
 * Cached separately due to potentially large size & frequent reads.
 * @param {boolean} forceApiRefresh - Force bypass cache and fetch latest.
 * @returns {Promise<Array>} Array of inventory items (possibly empty).
 */
export async function getAppInventory(forceApiRefresh = false) {
  const cacheKey = 'appInventory';
  const cachedData = localStorage.getItem(cacheKey);
  if (!forceApiRefresh && cachedData) { try { return JSON.parse(cachedData); } catch { /* fall through */ } }

  try {
    const apiResponse = await fetchAllInventory(); // returns { data: [...], success: true }
    const inventoryArray = Array.isArray(apiResponse?.data) ? apiResponse.data : [];
    safeLocalStorageSet(cacheKey, inventoryArray);
    return inventoryArray;
  } catch (error) {
    console.error('[getAppInventory] Error fetching inventory, falling back to cache:', error);
    if (cachedData) {
      try { return JSON.parse(cachedData); } catch { return []; }
    }
    return [];
  }
}

/**
 * Invalidate inventory cache - call this after operations that change inventory
 * (transfers, receipts, returns, repacking, etc.)
 */
export function invalidateInventoryCache() {
  localStorage.removeItem('appInventory');
}

/**
 * Invalidate all related caches that might be affected by inventory operations
 * Call this after major operations (sales, purchases, transfers, etc.)
 */
export function invalidateInventoryRelatedCaches() {
  invalidateInventoryCache();
  // Could also invalidate related caches if needed
  // localStorage.removeItem('appSalesOrders');
  // localStorage.removeItem('appPurchaseOrders');
}

/**
 * Check if inventory cache exists and is fresh
 * @returns {boolean} true if cache exists and is still fresh
 */
// Removed inventory meta helpers per user request; simple cache only now

/**
 * Fetches and caches notifications.
 * @param {boolean} forceApiRefresh - If true, forces a fetch from the API, bypassing cache.
 * @returns {Promise<Array>} - A promise that resolves to the notifications.
 */
export async function getAppNotifications(forceApiRefresh = false) {
  const cacheKey = 'appNotifications';
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && !forceApiRefresh) return JSON.parse(cachedData);
  try {
    const data = await fetchRawNotifications({ limit: 50 });
    // Normalise response shape like other helpers
    let list = [];
    if (Array.isArray(data?.notifications)) list = data.notifications;
    else if (Array.isArray(data?.data?.notifications)) list = data.data.notifications;
    safeLocalStorageSet(cacheKey, list);
    return list;
  } catch (e) {
    console.error('Error fetching notifications (prefetch):', e);
    return cachedData ? JSON.parse(cachedData) : [];
  }
}
