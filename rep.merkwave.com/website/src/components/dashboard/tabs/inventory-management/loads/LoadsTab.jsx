// src/components/dashboard/tabs/inventory-management/loads/LoadsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, EyeIcon, PlusIcon, TruckIcon, CalendarIcon } from '@heroicons/react/24/outline';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';

// Common Components
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import ConfirmActionModal from '../../../../common/ConfirmActionModal';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';

// API Imports
import { getAllTransferRequests, updateTransferRequestStatus } from '../../../../../apis/transfer_requests';
import { getAllInventory } from '../../../../../apis/inventory';
import { getAppWarehouses, getAppProducts, getAppPackagingTypes, getAppBaseUnits, invalidateInventoryCache } from '../../../../../apis/auth';

// Load-specific components
import RequestDetailsModal from './RequestDetailsModal';

export default function LoadsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedSourceWarehouseFilter, setSelectedSourceWarehouseFilter] = useState('');
  const [selectedDestinationWarehouseFilter, setSelectedDestinationWarehouseFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isRequestDetailsModalOpen, setIsRequestDetailsModalOpen] = useState(false);

  const tabName = 'loads';

  // Function to load all necessary data
  const loadAllLoadsData = useCallback(async (forceApiRefresh = false) => {
    if (forceApiRefresh) {
      setLoading(true);
      setGlobalMessage({ type: 'info', message: 'جاري تحديث بيانات طلبات التحميل...' });
    }
    setError('');
    try {
      const [
        requestsData,
        warehousesData,
        inventoryData,
        productsData,
        unitsData,
        packagingTypesData
      ] = await Promise.all([
        getAllTransferRequests(), // Get all requests, not just pending
        getAppWarehouses(forceApiRefresh, true),
        getAllInventory(),
        getAppProducts(forceApiRefresh),
        getAppBaseUnits(forceApiRefresh),
        getAppPackagingTypes(forceApiRefresh)
      ]);


      // Handle requests data structure correctly
      if (requestsData?.success && Array.isArray(requestsData.data)) {
        setRequests(requestsData.data);
      } else if (Array.isArray(requestsData)) {
        // Handle case where API returns array directly
        setRequests(requestsData);
      } else {
        console.error('❌ LoadsTab - Invalid requests data structure:', requestsData);
        setError('فشل في تحميل طلبات التحميل - بنية بيانات غير صحيحة');
        setRequests([]);
      }

      setWarehouses(warehousesData?.data || []);
      setAllInventoryItems(inventoryData?.data || []);
      setProducts(productsData?.data || []);
      setBaseUnits(unitsData?.data || []);
      setPackagingTypes(packagingTypesData?.data || []);

      if (forceApiRefresh) {
        setGlobalMessage({ type: 'success', message: 'تم تحديث طلبات التحميل بنجاح!' });
      }
    } catch (error) {
      console.error('❌ LoadsTab - Error loading requests:', error);
      const errorMessage = error.message || 'Error loading loads data';
      setError(errorMessage);
      setGlobalMessage({ type: 'error', message: `فشل في تحميل بيانات طلبات التحميل: ${errorMessage}` });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Initial data loading
  useEffect(() => {
    loadAllLoadsData();
  }, [loadAllLoadsData]);

  // Register refresh handler
  useEffect(() => {
    if (setChildRefreshHandler) {
      setChildRefreshHandler(tabName, () => loadAllLoadsData(true));
    }
    return () => {
      if (setChildRefreshHandler) {
        setChildRefreshHandler(tabName, null);
      }
    };
  }, [loadAllLoadsData, setChildRefreshHandler, tabName]);

  // Enrich inventory items with product and warehouse information
  const enrichedInventoryForForm = useMemo(() => {
    return allInventoryItems.map(item => {
      const product = products.find(p => p.product_id === item.product_id);
      const variant = product?.variants?.find(v => v.variant_id === item.variant_id);
      const warehouse = warehouses.find(w => w.warehouse_id === item.warehouse_id);
      const packaging = packagingTypes.find(pt => pt.packaging_types_id === item.packaging_type_id);
      const unit = baseUnits.find(u => u.base_unit_id === item.base_unit_id);

      return {
        ...item,
        product_name: product?.product_name || 'Unknown Product',
        variant_name: variant?.variant_name || 'Unknown Variant',
        warehouse_name: warehouse?.warehouse_name || 'Unknown Warehouse',
        packaging_type_name: packaging?.packaging_types_name || 'Unknown Packaging',
        unit_name: unit?.unit_name || 'Unknown Unit'
      };
    });
  }, [allInventoryItems, products, warehouses, packagingTypes, baseUnits]);

  // Filter and search logic
  const filteredRequests = useMemo(() => {
    let currentFiltered = [...requests];

    // Search filter
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(request =>
        String(request.request_id || '').includes(term) ||
        String(request.request_notes || '').toLowerCase().includes(term) ||
        String(request.created_by_name || '').toLowerCase().includes(term) ||
        warehouses.find(w => w.warehouse_id === request.request_source_warehouse_id)?.warehouse_name.toLowerCase().includes(term) ||
        warehouses.find(w => w.warehouse_id === request.request_destination_warehouse_id)?.warehouse_name.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (selectedStatusFilter) {
      currentFiltered = currentFiltered.filter(request => request.request_status === selectedStatusFilter);
    }

    // Source warehouse filter
    if (selectedSourceWarehouseFilter) {
      currentFiltered = currentFiltered.filter(request => String(request.request_source_warehouse_id) === selectedSourceWarehouseFilter);
    }

    // Destination warehouse filter
    if (selectedDestinationWarehouseFilter) {
      currentFiltered = currentFiltered.filter(request => String(request.request_destination_warehouse_id) === selectedDestinationWarehouseFilter);
    }

    return currentFiltered;
  }, [requests, searchTerm, selectedStatusFilter, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter, warehouses]);

  // Action Handlers
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setIsRequestDetailsModalOpen(true);
  };

  const closeRequestDetailsModal = () => {
    setIsRequestDetailsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApproveAllocateRequest = async (requestId, allocations, adminNote) => {
    try {
      
      // Update request status to Approved - the backend will automatically create transfers and set them to Completed
      await updateTransferRequestStatus(requestId, 'Approved', adminNote, allocations);
      
      // Invalidate inventory cache since approving affects inventory quantities
      invalidateInventoryCache();
      setGlobalMessage({
        type: 'success',
        message: 'تم تخصيص المخزون وإنشاء التحويل بنجاح'
      });
      await loadAllLoadsData(true);
      closeRequestDetailsModal();
    } catch (error) {
      console.error('Error completing request:', error);
      setGlobalMessage({
        type: 'error',
        message: error.message || 'حدث خطأ أثناء معالجة الطلب'
      });
    }
  };

  const handleRejectRequestFromModal = async (requestId, adminNote) => {
    try {
      await updateTransferRequestStatus(requestId, 'Rejected', adminNote);
      setGlobalMessage({
        type: 'success',
        message: 'تم رفض طلب التحميل'
      });
      await loadAllLoadsData(true);
      closeRequestDetailsModal();
    } catch (error) {
      console.error('Error rejecting request:', error);
      setGlobalMessage({
        type: 'error',
        message: 'حدث خطأ أثناء رفض الطلب'
      });
    }
  };

  // Options for filters
  const statusOptions = useMemo(() => [
    { value: '', label: 'جميع الحالات' },
    { value: 'Pending', label: 'في الانتظار' },
    { value: 'Approved', label: 'مقبول' },
    { value: 'Rejected', label: 'مرفوض' },
    { value: 'Cancelled', label: 'ملغي' }
  ], []);

  const warehouseOptions = useMemo(() => [
    { value: '', label: 'جميع المخازن' },
    ...warehouses.map(w => ({ 
      value: String(w.warehouse_id), 
      label: w.warehouse_name 
    }))
  ], [warehouses]);

  const selectFilters = useMemo(() => [
    {
      key: 'sourceWarehouse',
      options: warehouseOptions,
      value: selectedSourceWarehouseFilter,
      onChange: setSelectedSourceWarehouseFilter,
      placeholder: 'اختر المخزن المصدر...'
    },
    {
      key: 'destinationWarehouse',
      options: warehouseOptions,
      value: selectedDestinationWarehouseFilter,
      onChange: setSelectedDestinationWarehouseFilter,
      placeholder: 'اختر المخزن الوجهة...'
    },
    {
      key: 'status',
      options: statusOptions,
      value: selectedStatusFilter,
      onChange: setSelectedStatusFilter,
      placeholder: 'اختر الحالة...'
    }
  ], [warehouseOptions, statusOptions, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter, selectedStatusFilter]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedSourceWarehouseFilter) {
      const option = warehouseOptions.find(o => o.value === selectedSourceWarehouseFilter);
      if (option) chips.push({ key: 'sourceWarehouse', label: 'المخزن المصدر', value: option.label, onRemove: () => setSelectedSourceWarehouseFilter('') });
    }
    if (selectedDestinationWarehouseFilter) {
      const option = warehouseOptions.find(o => o.value === selectedDestinationWarehouseFilter);
      if (option) chips.push({ key: 'destinationWarehouse', label: 'المخزن الوجهة', value: option.label, onRemove: () => setSelectedDestinationWarehouseFilter('') });
    }
    if (selectedStatusFilter) {
      const option = statusOptions.find(o => o.value === selectedStatusFilter);
      if (option) chips.push({ key: 'status', label: 'الحالة', value: option.label, onRemove: () => setSelectedStatusFilter('') });
    }
    return chips;
  }, [selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter, selectedStatusFilter, warehouseOptions, statusOptions]);

  const handleClearAll = () => {
    setSearchTerm('');
    setSelectedSourceWarehouseFilter('');
    setSelectedDestinationWarehouseFilter('');
    setSelectedStatusFilter('');
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    const statusMap = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'في الانتظار' },
      'approved': { color: 'bg-green-100 text-green-800', text: 'مقبول' },
      'rejected': { color: 'bg-red-100 text-red-800', text: 'مرفوض' },
      'cancelled': { color: 'bg-gray-100 text-gray-800', text: 'ملغي' }
    };
    
    const statusInfo = statusMap[normalizedStatus] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading) return <Loader />;

  return (
    <div className="p-4 overflow-visible" dir="rtl" style={{position: 'relative', zIndex: 1}}>
      <CustomPageHeader
        title="طلبات التحميل"
        subtitle="إدارة طلبات تحميل المنتجات"
        icon={<TruckIcon className="h-8 w-8 text-white" />}
        statValue={filteredRequests.length}
        statLabel="إجمالي الطلبات"
      />

      {error && <Alert type="error" message={error} className="mb-4" />}

      {/* Search and Filters */}
      <FilterBar
        searchConfig={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'البحث في الطلبات...' }}
        selectFilters={selectFilters}
        activeChips={activeChips}
        onClearAll={handleClearAll}
        className="mb-6"
      />

      {/* Requests Table */}
      <div className="mb-4">
        <GlobalTable
          data={filteredRequests}
          loading={loading}
          error={error}
          rowKey="request_id"
          tableClassName=""
          headerClassName=""
          bodyClassName=""
          showSummary={false}
          initialSort={{ key: 'request_id', direction: 'desc' }}
          columns={[
            { key: 'request_id', title: 'رقم الطلب', className: 'w-16', sortable: true },
            { key: 'sourceWarehouse', title: 'المخزن المصدر', className: '', sortable: true },
            { key: 'destinationWarehouse', title: 'المخزن الوجهة', className: '', sortable: true },
            { key: 'created_by_name', title: 'منشئ الطلب', className: 'min-w-[140px]', sortable: true },
            { key: 'request_status', title: 'الحالة', className: '', sortable: true },
            { key: 'request_created_at', title: 'تاريخ الإنشاء', className: 'min-w-[180px]', sortable: true },
            { key: 'actions', title: 'الإجراءات', className: 'w-32 text-center border-r border-gray-200', sortable: false },
          ]}
          renderRow={(request) => {
            const sourceWarehouse = warehouses.find(w => w.warehouse_id === request.request_source_warehouse_id);
            const destinationWarehouse = warehouses.find(w => w.warehouse_id === request.request_destination_warehouse_id);

            return (
              <>
                <td className="px-4 py-4 text-sm font-medium text-blue-600 border-r border-gray-200">#{request.request_id}</td>
                <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200">{sourceWarehouse?.warehouse_name || 'غير محدد'}</td>
                <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200">{destinationWarehouse?.warehouse_name || 'غير محدد'}</td>
                <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200">{request.created_by_name || 'غير محدد'}</td>
                <td className="px-4 py-4 border-r border-gray-200">{getStatusBadge(request.request_status)}</td>
                <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200">
                  <div className="flex items-center"><CalendarIcon className="h-4 w-4 ml-1 text-gray-400" />{new Date(request.request_created_at).toLocaleDateString('ar-EG')}</div>
                </td>
                <td className="px-4 py-4 text-sm font-medium text-center border-r border-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleViewRequest(request)}
                      title="عرض التفاصيل"
                      className="group p-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-full transition-all"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </>
            );
          }}
        />
      </div>

      {/* Request Details Modal */}
      {isRequestDetailsModalOpen && selectedRequest && (
        <RequestDetailsModal
          isOpen={isRequestDetailsModalOpen}
          onClose={closeRequestDetailsModal}
          request={selectedRequest}
          warehouses={warehouses}
          products={products}
          packagingTypes={packagingTypes}
          allInventoryItems={allInventoryItems}
          enrichedInventoryForForm={enrichedInventoryForForm}
          onApproveAllocate={handleApproveAllocateRequest}
          onReject={handleRejectRequestFromModal}
          setGlobalMessage={setGlobalMessage}
          refreshData={() => loadAllLoadsData(true)}
        />
      )}
    </div>
  );
}
