// Example: src/components/examples/CachedDataExample.jsx
import React, { useState, useEffect } from 'react';
import { getCachedEntityData, hasEntityCache } from '../../utils/entityCache.js';
import { useVersionSyncContext } from '../../hooks/useVersionSyncContext.js';

const CachedDataExample = () => {
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const { isLoading, performSync } = useVersionSyncContext();

  useEffect(() => {
    // Load cached data when component mounts
    const loadCachedData = () => {
      // Get clients data from cache
      const cachedClients = getCachedEntityData('clients');
      if (cachedClients) {
        setClients(Array.isArray(cachedClients) ? cachedClients : cachedClients.clients || []);
      }

      // Get inventory data from cache  
      const cachedInventory = getCachedEntityData('inventory');
      if (cachedInventory) {
        setInventory(Array.isArray(cachedInventory) ? cachedInventory : cachedInventory.inventory || []);
      }
    };

    loadCachedData();
  }, []);

  const handleRefreshData = async () => {
    try {
      await performSync(true); // Force sync
      
      // Reload data after sync
      const freshClients = getCachedEntityData('clients');
      const freshInventory = getCachedEntityData('inventory');
      
      if (freshClients) {
        setClients(Array.isArray(freshClients) ? freshClients : freshClients.clients || []);
      }
      
      if (freshInventory) {
        setInventory(Array.isArray(freshInventory) ? freshInventory : freshInventory.inventory || []);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cached Data Example</h2>
        <button
          onClick={handleRefreshData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Syncing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clients Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Clients Data</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Cache Status: 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                hasEntityCache('clients') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {hasEntityCache('clients') ? 'Cached' : 'Not Cached'}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Count: <span className="font-medium">{clients.length}</span>
            </p>
            
            {clients.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <div className="text-xs space-y-1">
                  {clients.slice(0, 5).map((client, index) => (
                    <div key={client.clients_id || index} className="p-2 bg-gray-50 rounded">
                      <strong>{client.clients_name || 'Unknown'}</strong>
                      {client.clients_phone && (
                        <span className="text-gray-500 ml-2">({client.clients_phone})</span>
                      )}
                    </div>
                  ))}
                  {clients.length > 5 && (
                    <div className="text-gray-500 text-center">
                      ... and {clients.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Inventory Data</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Cache Status: 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                hasEntityCache('inventory') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {hasEntityCache('inventory') ? 'Cached' : 'Not Cached'}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Count: <span className="font-medium">{inventory.length}</span>
            </p>
            
            {inventory.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <div className="text-xs space-y-1">
                  {inventory.slice(0, 5).map((item, index) => (
                    <div key={item.inventory_id || index} className="p-2 bg-gray-50 rounded">
                      <strong>{item.product_name || 'Unknown Product'}</strong>
                      {item.quantity && (
                        <span className="text-gray-500 ml-2">Qty: {item.quantity}</span>
                      )}
                      {item.warehouse_name && (
                        <span className="text-gray-500 ml-2">@ {item.warehouse_name}</span>
                      )}
                    </div>
                  ))}
                  {inventory.length > 5 && (
                    <div className="text-gray-500 text-center">
                      ... and {inventory.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cache Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How This Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Data is automatically cached when you navigate to pages</li>
          <li>• Only updated entities are re-fetched (based on version comparison)</li>
          <li>• Use getCachedEntityData('entityName') to access cached data</li>
          <li>• performSync(true) forces a refresh of all entities</li>
          <li>• Cache is automatically cleared on logout</li>
        </ul>
      </div>
    </div>
  );
};

export default CachedDataExample;
