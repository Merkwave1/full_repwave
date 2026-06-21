// Mock Data System - Main Entry Point
// This file provides easy access to all mock data functionality

import { 
  generateComprehensiveMockData, 
  seedComprehensiveMockData, 
  clearMockData 
} from './comprehensiveMockData.js';

import mockApis, { 
  USE_MOCK_DATA,
  mockUsersApi,
  mockCategoriesApi,
  mockClientsApi,
  mockProductsApi,
  mockWarehousesApi,
  mockInventoryApi,
  mockSalesOrdersApi,
  mockPurchaseOrdersApi,
  mockOtherApis,
  mockBaseUnitsApi,
  mockPackagingTypesApi,
  mockAttributesApi,
} from './mockApiWrapper.js';

// Initialize mock data if needed
export function initializeMockData() {
  const isMockSeeded = localStorage.getItem('comprehensiveMockSeeded_v14');
  
  if (!isMockSeeded) {
    console.log('🎭 Initializing mock data for the first time...');
    seedComprehensiveMockData();
    console.log('✅ Mock data initialized successfully!');
  } else {
    console.log('✅ Mock data already initialized');
  }
}

// Reset and regenerate all mock data
export function resetMockData() {
  console.log('🔄 Resetting mock data...');
  clearMockData();
  seedComprehensiveMockData();
  console.log('✅ Mock data reset successfully!');
}

// Check if mock data is available
export function isMockDataAvailable() {
  return localStorage.getItem('comprehensiveMockSeeded_v14') === 'true';
}

// Get mock data statistics
export function getMockDataStats() {
  const stats = {
    users: JSON.parse(localStorage.getItem('appUsers') || '[]').length,
    categories: JSON.parse(localStorage.getItem('appCategories') || '[]').length,
    clients: JSON.parse(localStorage.getItem('appClients') || '[]').length,
    products: (() => { const p = JSON.parse(localStorage.getItem('appProducts') || '{"data":[]}'); return (Array.isArray(p) ? p : p.data || []).length; })(),
    warehouses: (JSON.parse(localStorage.getItem('appWarehouses') || '{"data":[]}').data || []).length,
    inventory: JSON.parse(localStorage.getItem('appInventory') || '[]').length,
    salesOrders: JSON.parse(localStorage.getItem('appSalesOrders') || '[]').length,
    purchaseOrders: JSON.parse(localStorage.getItem('appPurchaseOrders') || '[]').length,
    suppliers: (JSON.parse(localStorage.getItem('appSuppliers') || '{"data":[]}').data || []).length,
  };
  
  return stats;
}

// Export all functionality
export {
  // Data generation
  generateComprehensiveMockData,
  seedComprehensiveMockData,
  clearMockData,
  
  // Mock APIs
  mockApis,
  mockUsersApi,
  mockCategoriesApi,
  mockClientsApi,
  mockProductsApi,
  mockWarehousesApi,
  mockInventoryApi,
  mockSalesOrdersApi,
  mockPurchaseOrdersApi,
  mockOtherApis,
  mockBaseUnitsApi,
  mockPackagingTypesApi,
  mockAttributesApi,
  
  // Configuration
  USE_MOCK_DATA,
};

// Default export
export default {
  initializeMockData,
  resetMockData,
  isMockDataAvailable,
  getMockDataStats,
  generateComprehensiveMockData,
  seedComprehensiveMockData,
  clearMockData,
  mockApis,
  USE_MOCK_DATA,
};
