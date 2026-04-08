// src/utils/entityCache.js

/**
 * Get cached entity data from localStorage
 * @param {string} entityName - Name of the entity (clients, inventory, etc.)
 * @returns {any|null} - Cached entity data or null if not found
 */
export const getCachedEntityData = (entityName) => {
  const storageKey = `entity_${entityName}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Fallback to well-known app* caches used across the app
  try {
    switch (entityName) {
      case 'clients': return JSON.parse(localStorage.getItem('appClients') || 'null');
      case 'inventory': return JSON.parse(localStorage.getItem('appInventory') || 'null');
      case 'users': return JSON.parse(localStorage.getItem('appUsers') || 'null');
      case 'suppliers': return JSON.parse(localStorage.getItem('appSuppliers') || 'null');
      case 'products':
      case 'product_variants': return JSON.parse(localStorage.getItem('appProducts') || 'null');
      case 'settings': return JSON.parse(localStorage.getItem('appSettings') || 'null');
      case 'notifications': return JSON.parse(localStorage.getItem('entity_notifications') || 'null');
      default: return null;
    }
  } catch { return null; }
};

/**
 * Check if entity data exists in cache
 * @param {string} entityName - Name of the entity
 * @returns {boolean} - True if entity data exists in cache
 */
export const hasEntityCache = (entityName) => {
  const data = getCachedEntityData(entityName);
  return data !== null && data !== undefined;
};

/**
 * Get all cached entity names
 * @returns {string[]} - Array of cached entity names
 */
export const getCachedEntityNames = () => {
  const keys = Object.keys(localStorage);
  return keys
    .filter(key => key.startsWith('entity_'))
    .map(key => key.replace('entity_', ''));
};

/**
 * Clear specific entity cache
 * @param {string} entityName - Name of the entity to clear
 */
export const clearEntityCache = (entityName) => {
  const storageKey = `entity_${entityName}`;
  localStorage.removeItem(storageKey);
};
