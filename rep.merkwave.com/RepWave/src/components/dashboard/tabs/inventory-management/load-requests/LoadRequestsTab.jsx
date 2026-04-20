// src/components/dashboard/tabs/inventory-management/LoadRequestsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';

// Common Components - FIXED PATHS
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import ConfirmActionModal from '../../../../common/ConfirmActionModal'; // Reusing generic confirmation modal

// API Imports
import { getAllTransfers, addTransfer, updateTransferStatus } from '../../../../../apis/transfers';
import { getAllInventory } from '../../../../../apis/inventory';
import { getAppWarehouses, getAppProducts, getAppBaseUnits, getAppPackagingTypes } from '../../../../../apis/auth';

// Sub-components for Load Requests (will reuse AddTransferForm and TransferListView)
import AddTransferForm from '../Transfers/AddTransferForm'; // Reusing for "Add Load Request"
import TransferListView from '../Transfers/TransferListView'; // Reusing for "Load Requests List"

export default function LoadRequestsTab() {
  // إضافة فحص لوجود الدوال قبل تفكيكها
  const outletContext = useOutletContext();
  const setGlobalMessage = outletContext?.setGlobalMessage;
  const registerTabRefreshHandler = outletContext?.registerTabRefreshHandler;
  const unregisterTabRefreshHandler = outletContext?.unregisterTabRefreshHandler;

  const [loadRequests, setLoadRequests] = useState([]); // This will hold transfers specifically for load requests
  const [warehouses, setWarehouses] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedSourceWarehouseFilter, setSelectedSourceWarehouseFilter] = useState('');
  const [selectedDestinationWarehouseFilter, setSelectedDestinationWarehouseFilter] = useState('');

  const [currentView, setCurrentView] = useState('list'); // 'list', 'add'
  const [isConfirmStatusModalOpen, setIsConfirmStatusModalOpen] = useState(false);
  const [transferToUpdate, setTransferToUpdate] = useState(null);
  const [newStatusForUpdate, setNewStatusForUpdate] = useState('');

  // Define a unique tab name for this component for refresh handling
  const tabName = 'load-requests';

  // Function to load all necessary data for load requests
  const loadAllLoadRequestData = useCallback(async (forceApiRefresh = false) => {
    if (forceApiRefresh) {
      setLoading(true);
      setGlobalMessage?.({ type: 'info', message: 'جاري تحديث طلبات التحميل...' }); // استخدام optional chaining
    }
    setError(null);
    try {
      const [
        transfersData,
        warehousesData,
        inventoryData,
        productsData,
        unitsData,
        packagingTypesData
      ] = await Promise.all([
        getAllTransfers(), // Fetch all transfers
        getAppWarehouses(forceApiRefresh),
        getAllInventory(),
        getAppProducts(forceApiRefresh),
        getAppBaseUnits(forceApiRefresh),
        getAppPackagingTypes(forceApiRefresh)
      ]);

      // Filter transfers to only show 'Load Requests' (e.g., transfers from main warehouse to representative car)
      // You'll need a way to identify 'representative car' warehouses.
      // For now, let's assume 'Load Requests' are transfers where the destination warehouse is of type 'Representative Car'
      // This will require adding a 'warehouse_type' to your warehouse data or a specific naming convention.
      // For demonstration, let's assume a 'is_representative_car' flag or a naming convention.
      // If your backend doesn't support filtering by type, you'll need to filter client-side.

      // Placeholder for identifying representative car warehouses.
      // In a real app, you'd fetch this info or have a specific ID range/type.
      const warehousesList = warehousesData?.data || [];
      const representativeCarWarehouses = warehousesList.filter(w => w.warehouse_type === 'Representative Car' || w.warehouse_name.includes('سيارة المندوب'));

      const filteredLoadRequests = (transfersData || []).filter(transfer => 
        representativeCarWarehouses.some(repCarW => repCarW.warehouse_id === transfer.transfer_destination_warehouse_id)
      );

      setLoadRequests(filteredLoadRequests);
      setWarehouses(warehousesList);
      setAllInventoryItems(inventoryData || []);
      setProducts(productsData?.data || []);
      setBaseUnits(unitsData?.data || []);
      setPackagingTypes(packagingTypesData?.data || []);

      if (forceApiRefresh) {
        setGlobalMessage?.({ type: 'success', message: 'تم تحديث طلبات التحميل بنجاح!' }); // استخدام optional chaining
      }
    } catch (e) {
      const errorMessage = e.message || 'Error loading load requests data';
      setError(errorMessage);
      setGlobalMessage?.({ type: 'error', message: `فشل في تحميل بيانات طلبات التحميل: ${errorMessage}` }); // استخدام optional chaining
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Initial data load and register refresh handler
  useEffect(() => {
    loadAllLoadRequestData(false);
    if (registerTabRefreshHandler) { // فحص وجود الدالة قبل الاستدعاء
      registerTabRefreshHandler(tabName, loadAllLoadRequestData);
    }
    return () => {
      if (unregisterTabRefreshHandler) { // فحص وجود الدالة قبل الاستدعاء
        unregisterTabRefreshHandler(tabName);
      }
    };
  }, [loadAllLoadRequestData, registerTabRefreshHandler, unregisterTabRefreshHandler, tabName]);

  // Enrich inventory items for the AddTransferForm
  const enrichedInventoryForForm = useMemo(() => {
    if (!Array.isArray(allInventoryItems) || !Array.isArray(products) || !Array.isArray(warehouses) || !Array.isArray(packagingTypes)) {
      return [];
    }
    return allInventoryItems.map(item => {
      const product = products.find(p => p.products_id === item.products_id);
      const variant = product?.variants && Array.isArray(product.variants)
                      ? product.variants.find(v => v.variant_id === item.variant_id)
                      : undefined;
      const warehouse = warehouses.find(w => w.warehouse_id === item.warehouse_id);
      const packagingType = packagingTypes.find(pt => pt.packaging_types_id === item.packaging_type_id);
      
      const variantDisplayName = variant?.variant_name || product?.products_name || 'Unknown Product/Variant';
      const baseUnit = baseUnits.find(u => u.base_units_id === product?.products_unit_of_measure_id);
      
      return {
        ...item,
        product_name: product?.products_name,
        variant_name: variant?.variant_name,
        variant_display_name: variantDisplayName,
        warehouse_name: warehouse?.warehouse_name || 'Unknown Warehouse',
        packaging_type_name: packagingType?.packaging_types_name || 'Unknown Packaging',
        base_unit_name: baseUnit?.base_units_name || 'Unknown Unit',
        packaging_types_default_conversion_factor: packagingType?.packaging_types_default_conversion_factor || 1,
      };
    });
  }, [allInventoryItems, products, warehouses, packagingTypes, baseUnits]);


  // CRUD operations (reusing addTransfer from transfers API)
  const handleAddLoadRequest = async (newData) => {
    setLoading(true);
    try {
      // Ensure the status is appropriate for a new load request (e.g., 'Pending')
      const dataToSubmit = { ...newData, status: 'Pending' };
      const message = await addTransfer(dataToSubmit);
      setGlobalMessage?.({ type: 'success', message: message || 'تم إضافة طلب التحميل بنجاح!' }); // استخدام optional chaining
      setCurrentView('list');
      await loadAllLoadRequestData(true); // Refresh data after adding
    } catch (e) {
      setGlobalMessage?.({ type: 'error', message: e.message || 'فشل في إضافة طلب التحميل.' }); // استخدام optional chaining
    } finally {
      setLoading(false);
    }
  };

  // Handle status update confirmation (reusing updateTransferStatus from transfers API)
  const handleUpdateStatusClick = (transfer, status) => {
    setTransferToUpdate(transfer);
    setNewStatusForUpdate(status);
    setIsConfirmStatusModalOpen(true);
  };

  // Execute status update after confirmation
  const handleConfirmStatusUpdate = async () => {
    if (!transferToUpdate || !newStatusForUpdate) return;

    setLoading(true);
    try {
      const message = await updateTransferStatus(transferToUpdate.transfer_id, newStatusForUpdate);
      setGlobalMessage?.({ type: 'success', message: message || `تم تحديث حالة طلب التحميل إلى ${newStatusForUpdate} بنجاح!` }); // استخدام optional chaining
      setIsConfirmStatusModalOpen(false);
      setTransferToUpdate(null);
      setNewStatusForUpdate('');
      await loadAllLoadRequestData(true); // Refresh data
    } catch (e) {
      setGlobalMessage?.({ type: 'error', message: e.message || 'فشل في تحديث حالة طلب التحميل.' }); // استخدام optional chaining
    } finally {
      setLoading(false);
    }
  };

  // Filter options for SearchableSelect
  const warehouseOptions = useMemo(() => [
    { value: '', label: 'كل المخازن' },
    ...warehouses.map(w => ({ value: w.warehouse_id.toString(), label: `${w.warehouse_name} (${w.warehouse_code})` }))
  ], [warehouses]);

  const loadRequestStatusOptions = useMemo(() => {
    // Define statuses relevant to load requests
    const statuses = ['Pending', 'In Transit', 'Completed', 'Cancelled']; 
    return [{ value: '', label: 'كل الحالات' }, ...statuses.map(s => ({ value: s, label: s }))];
  }, []);

  // Client-side filtering for load requests
  const filteredLoadRequests = useMemo(() => {
    let currentFiltered = Array.isArray(loadRequests) ? loadRequests : [];

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(request =>
        request.notes?.toLowerCase().includes(term) ||
        request.status?.toLowerCase().includes(term) ||
        request.transfer_id?.toString().includes(term) ||
        warehouses.find(w => w.warehouse_id === request.transfer_source_warehouse_id)?.warehouse_name.toLowerCase().includes(term) ||
        warehouses.find(w => w.warehouse_id === request.transfer_destination_warehouse_id)?.warehouse_name.toLowerCase().includes(term)
      );
    }

    if (selectedStatusFilter) {
      currentFiltered = currentFiltered.filter(request => request.status === selectedStatusFilter);
    }
    if (selectedSourceWarehouseFilter) {
      currentFiltered = currentFiltered.filter(request => String(request.transfer_source_warehouse_id) === selectedSourceWarehouseFilter);
    }
    if (selectedDestinationWarehouseFilter) {
      currentFiltered = currentFiltered.filter(request => String(request.transfer_destination_warehouse_id) === selectedDestinationWarehouseFilter);
    }

    return currentFiltered;
  }, [loadRequests, searchTerm, selectedStatusFilter, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter, warehouses]);


  const renderContent = () => {
    // Check if essential supporting data is loaded and available
    const isSupportingDataReady = products.length > 0 && warehouses.length > 0 && packagingTypes.length > 0 && baseUnits.length > 0;

    switch (currentView) {
      case 'add': 
        if (!isSupportingDataReady) {
          return (
            <div className="text-center text-gray-600 mt-8">
              <p>جاري تحميل البيانات الأساسية لإضافة طلب تحميل...</p>
              <Loader className="mt-4" />
              {warehouses.length === 0 && <Alert type="warning" message="لا توجد مخازن متاحة. يرجى إضافة مخازن أولاً." className="mt-4" />}
              {products.length === 0 && <Alert type="warning" message="لا توجد منتجات متاحة. يرجى إضافة منتجات أولاً." className="mt-4" />}
              {packagingTypes.length === 0 && <Alert type="warning" message="لا توجد أنواع تعبئة متاحة. يرجى إضافة أنواع تعبئة أولاً." className="mt-4" />}
              {baseUnits.length === 0 && <Alert type="warning" message="لا توجد وحدات قياس أساسية متاحة. يرجى إضافة وحدات أولاً." className="mt-4" />}
            </div>
          );
        }
        return (
          <AddTransferForm
            onAdd={handleAddLoadRequest}
            onCancel={() => setCurrentView('list')}
            warehouses={warehouses}
            allInventoryItems={enrichedInventoryForForm}
            // You might want to pre-select source/destination warehouses if they are fixed for load requests
            // For example, if source is always 'Main Warehouse' and destination is a 'Representative Car Warehouse'
          />
        );
      case 'list':
      default: return (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
            <h3 className="text-2xl font-bold text-gray-800 flex-none">طلبات التحميل</h3>
            <div className="relative flex-grow mx-4">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث عن طلب تحميل..."
                className="w-full pl-4 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="rtl"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-none flex space-x-2 rtl:space-x-reverse">
              <button onClick={() => setCurrentView('add')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md">
                <PlusIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                إضافة طلب تحميل
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
              <FunnelIcon className="h-5 w-5 text-blue-600" />
              خيارات التصفية
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="sourceWarehouseFilter" className="block text-sm font-medium text-gray-700 mb-1">المخزن المصدر</label>
                <SearchableSelect
                    options={warehouseOptions}
                    value={selectedSourceWarehouseFilter}
                    onChange={setSelectedSourceWarehouseFilter}
                    placeholder="اختر مخزن مصدر..."
                />
              </div>
              <div>
                <label htmlFor="destinationWarehouseFilter" className="block text-sm font-medium text-gray-700 mb-1">المخزن الوجهة (سيارة المندوب)</label>
                <SearchableSelect
                    options={warehouseOptions}
                    value={selectedDestinationWarehouseFilter}
                    onChange={setSelectedDestinationWarehouseFilter}
                    placeholder="اختر مخزن وجهة..."
                />
              </div>
              <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <SearchableSelect
                    options={loadRequestStatusOptions}
                    value={selectedStatusFilter}
                    onChange={setSelectedStatusFilter}
                    placeholder="اختر حالة..."
                />
              </div>
            </div>
          </div>

          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}
          {!loading && !error && (
            <TransferListView
              transfers={filteredLoadRequests}
              warehouses={warehouses}
              onUpdateStatus={handleUpdateStatusClick}
            />
          )}
        </>
      );
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
      {isConfirmStatusModalOpen && transferToUpdate && (
        <ConfirmActionModal
          isOpen={isConfirmStatusModalOpen}
          onClose={() => setIsConfirmStatusModalOpen(false)}
          onConfirm={handleConfirmStatusUpdate}
          message={`هل أنت متأكد أنك تريد تغيير حالة طلب التحميل رقم ${transferToUpdate.transfer_id} إلى "${newStatusForUpdate}"؟`}
          confirmButtonText="تأكيد التغيير"
          cancelButtonText="إلغاء"
        />
      )}
    </div>
  );
}
