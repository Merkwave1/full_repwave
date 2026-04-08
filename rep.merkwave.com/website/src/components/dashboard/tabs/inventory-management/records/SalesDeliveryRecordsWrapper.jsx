// src/components/dashboard/tabs/inventory-management/records/SalesDeliveryRecordsWrapper.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TruckIcon } from '@heroicons/react/24/outline';
import SalesDeliveryRecordsTab from './SalesDeliveryRecordsTab';
import { getAppWarehouses } from '../../../../../apis/auth';

const SalesDeliveryRecordsWrapper = () => {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  
  // Data states
  const [warehouses, setWarehouses] = useState([]);
  // Removed sales orders/products: not needed for delivery history listing
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [warehousesRes] = await Promise.all([
        getAppWarehouses()
      ]);

      // Handle warehouses data
      if (warehousesRes.success || warehousesRes.data) {
        setWarehouses(warehousesRes.data || []);
      } else {
        setWarehouses([]);
      }
  // No sales orders/products needed here

    } catch (err) {
      console.error('Error loading data:', err);
      setError('فشل في تحميل البيانات');
      setGlobalMessage({ 
        type: 'error', 
        message: 'فشل في تحميل البيانات. يرجى المحاولة مرة أخرى.' 
      });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => loadAllData);
    }
  }, [setChildRefreshHandler, loadAllData]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* The inner SalesDeliveryRecordsTab already has a rich gradient header. Removed duplicate title per request. */}
      <div className="">
        <SalesDeliveryRecordsTab
          warehouses={warehouses}
          loading={loading}
          error={error}
          setGlobalMessage={setGlobalMessage}
          onRefresh={loadAllData}
        />
      </div>
    </div>
  );
};

export default SalesDeliveryRecordsWrapper;
