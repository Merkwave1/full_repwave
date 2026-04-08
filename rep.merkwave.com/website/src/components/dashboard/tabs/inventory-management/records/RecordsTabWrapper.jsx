// src/components/dashboard/tabs/inventory-management/records/RecordsTabWrapper.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DocumentTextIcon, TruckIcon, InboxArrowDownIcon } from '@heroicons/react/24/outline';
import WarehouseRecordsTab from '../Warehouses/WarehouseRecordsTab';
import SalesDeliveryRecordsTab from './SalesDeliveryRecordsTab';
import { getAppWarehouses, getAppPurchaseOrders, getAppProducts, getAppSuppliers } from '../../../../../apis/auth';

const RecordsTabWrapper = () => {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [activeTab, setActiveTab] = useState('receiving'); // 'receiving' or 'delivery'
  
  // Data states
  const [warehouses, setWarehouses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  // Removed global salesOrders here; delivery tab does not need full sales orders list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Always needed for both tabs
      const [warehousesRes] = await Promise.all([
        getAppWarehouses()
      ]);

      // Handle warehouses data
      if (warehousesRes.success || warehousesRes.data) {
        setWarehouses(warehousesRes.data || []);
      } else {
        setWarehouses([]);
      }
      
      // If receiving tab is active, lazily load its needed data
      if (activeTab === 'receiving') {
        try {
          const [purchaseOrdersRes, productsRes, suppliersRes] = await Promise.all([
            getAppPurchaseOrders(),
            getAppProducts(),
            getAppSuppliers(),
          ]);
          setPurchaseOrders((purchaseOrdersRes && (purchaseOrdersRes.data || []) ) || []);
          setProducts((productsRes && (productsRes.data || []) ) || []);
          setSuppliers((suppliersRes && (suppliersRes.data || []) ) || []);
        } catch (e) {
          console.error('Error loading receiving-tab data:', e);
          setPurchaseOrders([]);
          setProducts([]);
          setSuppliers([]);
        }
      } else {
        // Delivery tab: no extra lists required
        setPurchaseOrders([]);
        setProducts([]);
        setSuppliers([]);
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('فشل في تحميل البيانات: ' + (err.message || 'خطأ غير معروف'));
      if (setGlobalMessage) {
        setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات.' });
      }
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage, activeTab]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => loadAllData);
    }
  }, [setChildRefreshHandler, loadAllData]);

  const getTabClasses = (isActive) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100 bg-white border-x border-t border-gray-200'
    }`;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DocumentTextIcon className="h-8 w-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">سجلات المخزون</h2>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('receiving')}
            className={getTabClasses(activeTab === 'receiving')}
          >
            <InboxArrowDownIcon className="h-4 w-4" />
            سجلات الاستلام
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={getTabClasses(activeTab === 'delivery')}
          >
            <TruckIcon className="h-4 w-4" />
            سجلات التسليم
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
        {activeTab === 'receiving' ? (
          <WarehouseRecordsTab
            warehouses={warehouses}
            purchaseOrders={purchaseOrders}
            products={products}
            suppliers={suppliers}
            loading={loading}
            error={error}
            setGlobalMessage={setGlobalMessage}
            onRefresh={loadAllData}
          />
        ) : (
          <SalesDeliveryRecordsTab
            warehouses={warehouses}
            loading={loading}
            error={error}
            setGlobalMessage={setGlobalMessage}
            onRefresh={loadAllData}
          />
        )}
      </div>
    </div>
  );
};

export default RecordsTabWrapper;
