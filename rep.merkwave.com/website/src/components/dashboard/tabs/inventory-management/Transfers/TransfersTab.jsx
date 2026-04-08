// src/components/dashboard/tabs/inventory-management/Transfers/TransfersTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, EyeIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Corrected relative paths for common components
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';

// API Imports
import { getTransfersPaginated, addTransfer, updateTransferStatus, getTransferDetails } from '../../../../../apis/transfers';
import { getAllTransferRequests } from '../../../../../apis/transfer_requests';
// Use the centralized getApp* functions from auth for supporting data
import { getAppWarehouses, getAppProducts, getAppBaseUnits, getAppPackagingTypes, getAppInventory, invalidateInventoryCache } from '../../../../../apis/auth';

// Sub-components for Transfers
import AddTransferForm from './AddTransferForm';
import TransferListView from './TransferListView';
import ConfirmActionModal from '../../../../common/ConfirmActionModal';
import TransferDetailsModal from './TransferDetailsModal';
import RequestDetailsModal from './RequestDetailsModal';

export default function TransfersTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [transfers, setTransfers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]); // State to hold all inventory
  const [products, setProducts] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedSourceWarehouseFilter, setSelectedSourceWarehouseFilter] = useState('');
  const [selectedDestinationWarehouseFilter, setSelectedDestinationWarehouseFilter] = useState('');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState(null); // { total, per_page, page, total_pages }

  const [currentView, setCurrentView] = useState('list');
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  // const [deleteLoading, setDeleteLoading] = useState(false); // removed unused state

  const [isConfirmStatusModalOpen, setIsConfirmStatusModalOpen] = useState(false);
  const [transferToUpdate, setTransferToUpdate] = useState(null);
  const [newStatusForUpdate, setNewStatusForUpdate] = useState('');
  const [isTransferDetailsModalOpen, setIsTransferDetailsModalOpen] = useState(false);
  const [isRequestDetailsModalOpen, setIsRequestDetailsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Function to load all necessary data
  const loadAllTransferData = useCallback(async (forceApiRefresh = false) => {
    if (forceApiRefresh) {
      setLoading(true);
      setGlobalMessage({ type: 'info', message: 'جاري تحديث بيانات التحويلات...' });
    }
    setError(null);
    try {
      const [
        transfersResp,
        requestsData,
        warehousesData,
        productsData,
        unitsData,
        packagingTypesData,
        inventoryData
      ] = await Promise.all([
        getTransfersPaginated({
          page: currentPage,
          limit: itemsPerPage,
          status: selectedStatusFilter || undefined,
          source_warehouse_id: selectedSourceWarehouseFilter || undefined,
          destination_warehouse_id: selectedDestinationWarehouseFilter || undefined,
        }),
        getAllTransferRequests({ status: 'Pending' }),
        getAppWarehouses(forceApiRefresh, true), // Include all warehouses for transfers
        getAppProducts(forceApiRefresh),
        getAppBaseUnits(forceApiRefresh),
        getAppPackagingTypes(forceApiRefresh),
        getAppInventory(forceApiRefresh)
      ]);

      const extractedTransfers = Array.isArray(transfersResp) ? transfersResp : (transfersResp?.data || []);
      setTransfers(extractedTransfers);
      setServerPagination(transfersResp?.pagination || null);
      setRequests(requestsData || []);
      setWarehouses(warehousesData?.data || []);
      setAllInventoryItems(Array.isArray(inventoryData) ? inventoryData : []);
      setProducts(productsData?.data || []);
      setBaseUnits(unitsData?.data || []);
      setPackagingTypes(packagingTypesData?.data || []);

      if (forceApiRefresh) {
        setGlobalMessage({ type: 'success', message: 'تم تحديث التحويلات بنجاح!' });
      }
    } catch (e) {
      const errorMessage = e.message || 'Error loading transfers data';
      setError(errorMessage);
      setGlobalMessage({ type: 'error', message: `فشل في تحميل بيانات التحويلات: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage, currentPage, itemsPerPage, selectedStatusFilter, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter]);

  // TARGETED: Enter Add mode without reloading transfers list (performance + UX)
  const handleEnterAddView = useCallback(async () => {
    // If we already have warehouses and supporting data, just switch view
    const haveWarehouses = Array.isArray(warehouses) && warehouses.length > 0;
    const haveProducts = Array.isArray(products) && products.length > 0;
    const havePackaging = Array.isArray(packagingTypes) && packagingTypes.length > 0;
    const haveUnits = Array.isArray(baseUnits) && baseUnits.length > 0;
    if (haveWarehouses && haveProducts && havePackaging && haveUnits) {
      setCurrentView('add');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [warehousesData, productsData, unitsData, packagingTypesData, inventoryData] = await Promise.all([
        getAppWarehouses(true, true), // Force refresh + include all warehouses
        getAppProducts(true),
        getAppBaseUnits(true),
        getAppPackagingTypes(true),
        getAppInventory(true)
      ]);

      setWarehouses(warehousesData?.data || []);
      setAllInventoryItems(Array.isArray(inventoryData) ? inventoryData : []);
      setProducts(productsData?.data || []);
      setBaseUnits(unitsData?.data || []);
      setPackagingTypes(packagingTypesData?.data || []);
      setCurrentView('add');
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في تجهيز نموذج التحويل.' });
      setError(e.message || 'Error preparing add transfer form');
    } finally {
      setLoading(false);
    }
  }, [warehouses, products, packagingTypes, baseUnits, setGlobalMessage]);

  // Exposed refresh specifically for AddTransferForm (manual user trigger)
  const refreshSupportingDataForAdd = useCallback(async () => {
    setLoading(true);
    try {
      const [warehousesData, productsData, unitsData, packagingTypesData, inventoryData] = await Promise.all([
        getAppWarehouses(true, true), // Force refresh + include all warehouses
        getAppProducts(true),
        getAppBaseUnits(true),
        getAppPackagingTypes(true),
        getAppInventory(true)
      ]);

      setWarehouses(warehousesData?.data || []);
      setAllInventoryItems(Array.isArray(inventoryData) ? inventoryData : []);
      setProducts(productsData?.data || []);
      setBaseUnits(unitsData?.data || []);
      setPackagingTypes(packagingTypesData?.data || []);
      setGlobalMessage({ type: 'success', message: 'تم تحديث بيانات النموذج.' });
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في تحديث بيانات النموذج.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Initial data load
  const lastFetchKeyRef = React.useRef(null);
  useEffect(() => {
    const key = `${currentPage}|${itemsPerPage}|${selectedStatusFilter}|${selectedSourceWarehouseFilter}|${selectedDestinationWarehouseFilter}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    loadAllTransferData(false);
  }, [loadAllTransferData, currentPage, itemsPerPage, selectedStatusFilter, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter]);

  // Register refresh handler for DashboardLayout
  useEffect(() => {
    const refreshHandler = () => loadAllTransferData(true);
    setChildRefreshHandler(refreshHandler);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadAllTransferData]);

  // Enrich inventory items for the AddTransferForm and filtering
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


  // CRUD operations
  const handleAdd = async (newData) => {
    setLoading(true);
    try {
      const message = await addTransfer(newData);
      // Invalidate inventory cache since transfer changes inventory quantities
      invalidateInventoryCache();
      setGlobalMessage({ type: 'success', message: message || 'تم إضافة التحويل بنجاح!' });
      setCurrentView('list');
      await loadAllTransferData(true);
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في إضافة التحويل.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle status update confirmation (called from TransferListView and TransferDetailsModal)
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
      // Invalidate inventory cache if status update might affect inventory (e.g., completing/confirming transfers)
      if (['تم التحويل', 'مكتمل', 'تم التأكيد'].includes(newStatusForUpdate)) {
        invalidateInventoryCache();
      }
      setGlobalMessage({ type: 'success', message: message || `تم تحديث حالة التحويل إلى ${newStatusForUpdate} بنجاح!` });
      setIsConfirmStatusModalOpen(false);
      setTransferToUpdate(null);
      setNewStatusForUpdate('');
      await loadAllTransferData(true); // Refresh data
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في تحديث حالة التحويل.' });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch and open transfer details modal
  const openTransferDetailsModal = async (transferSummary) => {
    if (transferSummary?.type === 'request') {
      // Open Request Details without extra fetch (items included from get_all)
      const full = (requests || []).find(r => r.request_id === transferSummary.transfer_id);
      if (!full) return;
      setSelectedRequest(full);
      setIsRequestDetailsModalOpen(true);
      return;
    }
    setLoading(true); // Show loader while fetching details
    setError(null);
    try {
      const detailedTransfer = await getTransferDetails(transferSummary.transfer_id);
      setSelectedTransfer(detailedTransfer);
      setIsTransferDetailsModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch transfer details:", err);
      setError('فشل في تحميل تفاصيل التحويل: ' + (err.message || 'خطأ غير معروف'));
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل تفاصيل التحويل.' });
    } finally {
      setLoading(false); // Hide loader
    }
  };

  // Function to close transfer details modal
  const closeTransferDetailsModal = () => {
    setIsTransferDetailsModalOpen(false);
    setSelectedTransfer(null);
  };

  const closeRequestDetailsModal = () => {
    setIsRequestDetailsModalOpen(false);
    setSelectedRequest(null);
  };

  // Request actions
  const handleRejectRequest = async () => {
    // Per user request: Do not call request status APIs. Just close modal.
    closeRequestDetailsModal();
  };

  const handleApproveAllocateRequest = async (request, adminNote = '', allocations = []) => {
    if (!request?.request_id) return;
    setLoading(true);
    try {
      // Build a transfer from selected allocations using one API: transfers/add.php
      if (!Array.isArray(allocations) || allocations.length === 0) {
        throw new Error('برجاء اختيار الدُفعات والكميات قبل إنشاء التحويل.');
      }
      const payload = {
        source_warehouse_id: request.request_source_warehouse_id,
        destination_warehouse_id: request.request_destination_warehouse_id,
        status: 'Pending',
        notes: `From Request REQ-${request.request_id}${adminNote ? ' - ' + adminNote : ''}`,
        items: allocations.map(a => ({ inventory_id: a.inventory_id, quantity: a.quantity }))
      };
      await addTransfer(payload);
      setGlobalMessage({ type: 'success', message: 'تم إنشاء التحويل من الطلب بنجاح.' });
      closeRequestDetailsModal();
      await loadAllTransferData(true);
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في الموافقة على الطلب.' });
    } finally {
      setLoading(false);
    }
  };


  // Filter options for SearchableSelect
  const warehouseOptions = useMemo(() => {
    const opts = warehouses.map(w => ({
      value: w.warehouse_id.toString(),
      label: `${w.warehouse_name} (${w.warehouse_code})${w.warehouse_type ? ' - ' + (w.warehouse_type === 'Van' ? 'فان' : w.warehouse_type) : ''}`
    }));
    return [{ value: '', label: 'كل المخازن' }, ...opts];
  }, [warehouses]);

  const transferStatusOptions = useMemo(() => {
    // These are common transfer statuses, adjust if your API uses different ones
    const statuses = ['Pending', 'In Transit', 'Completed', 'Cancelled'];
    return [{ value: '', label: 'كل الحالات' }, ...statuses.map(s => ({ value: s, label: s }))];
  }, []);

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
      options: transferStatusOptions,
      value: selectedStatusFilter,
      onChange: setSelectedStatusFilter,
      placeholder: 'اختر الحالة...'
    }
  ], [warehouseOptions, transferStatusOptions, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter, selectedStatusFilter]);

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
      const option = transferStatusOptions.find(o => o.value === selectedStatusFilter);
      if (option) chips.push({ key: 'status', label: 'الحالة', value: option.label, onRemove: () => setSelectedStatusFilter('') });
    }
    return chips;
  }, [selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter, selectedStatusFilter, warehouseOptions, transferStatusOptions]);

  const handleClearAll = () => {
    setSearchTerm('');
    setSelectedSourceWarehouseFilter('');
    setSelectedDestinationWarehouseFilter('');
    setSelectedStatusFilter('');
  };

  // Client-side filtering for transfers
  const filteredTransfers = useMemo(() => {
    // Map requests into the same shape used by the list view
    const mappedRequests = (requests || []).map(r => ({
      type: 'request',
      transfer_id: r.request_id, // used as key internally
      display_id: `REQ-${r.request_id}`,
      transfer_source_warehouse_id: r.request_source_warehouse_id,
      transfer_destination_warehouse_id: r.request_destination_warehouse_id,
      status: r.request_status,
      created_at: r.request_created_at,
      notes: r.request_notes,
    }));

    // Combine: show requests together with normal transfers
    let currentFiltered = [ ...(Array.isArray(transfers) ? transfers : []), ...mappedRequests ];

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(transfer =>
  transfer.notes?.toLowerCase().includes(term) ||
        transfer.status?.toLowerCase().includes(term) ||
        transfer.transfer_id?.toString().includes(term) ||
        warehouses.find(w => w.warehouse_id === transfer.transfer_source_warehouse_id)?.warehouse_name.toLowerCase().includes(term) ||
        warehouses.find(w => w.warehouse_id === transfer.transfer_destination_warehouse_id)?.warehouse_name.toLowerCase().includes(term)
      );
    }

    if (selectedStatusFilter) {
      currentFiltered = currentFiltered.filter(transfer => transfer.status === selectedStatusFilter);
    }
    if (selectedSourceWarehouseFilter) {
      currentFiltered = currentFiltered.filter(transfer => String(transfer.transfer_source_warehouse_id) === selectedSourceWarehouseFilter);
    }
    if (selectedDestinationWarehouseFilter) {
      currentFiltered = currentFiltered.filter(transfer => String(transfer.transfer_destination_warehouse_id) === selectedDestinationWarehouseFilter);
    }

    return currentFiltered;
  }, [transfers, requests, searchTerm, selectedStatusFilter, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter, warehouses]);

  // Clamp/Reset pagination when filters/search change or data updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatusFilter, selectedSourceWarehouseFilter, selectedDestinationWarehouseFilter]);

  const totalPages = useMemo(() => {
    if (serverPagination?.total_pages) return Number(serverPagination.total_pages);
    const tot = Number(serverPagination?.total ?? filteredTransfers.length);
    const per = Number(serverPagination?.per_page ?? itemsPerPage);
    return Math.max(1, Math.ceil((tot || 0) / (per || 10)));
  }, [serverPagination, filteredTransfers.length, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const pagedTransfers = useMemo(() => filteredTransfers, [filteredTransfers]);


  const renderContent = () => {
    // Check if essential supporting data is loaded and available
    const isSupportingDataReady = products.length > 0 && warehouses.length > 0 && packagingTypes.length > 0 && baseUnits.length > 0;

    switch (currentView) {
      case 'add':
        if (!isSupportingDataReady) {
          return (
            <div className="text-center text-gray-600 mt-8">
              <p>جاري تحميل البيانات الأساسية لإضافة تحويل...</p>
              <Loader className="mt-4" />
              {/* Provide more specific alerts if data is empty after loading */}
              {warehouses.length === 0 && <Alert type="warning" message="لا توجد مخازن متاحة. يرجى إضافة مخازن أولاً." className="mt-4" />}
              {products.length === 0 && <Alert type="warning" message="لا توجد منتجات متاحة. يرجى إضافة منتجات أولاً." className="mt-4" />}
              {packagingTypes.length === 0 && <Alert type="warning" message="لا توجد أنواع تعبئة متاحة. يرجى إضافة أنواع تعبئة أولاً." className="mt-4" />}
              {baseUnits.length === 0 && <Alert type="warning" message="لا توجد وحدات قياس أساسية متاحة. يرجى إضافة وحدات أولاً." className="mt-4" />}
            </div>
          );
        }
        return (
          <AddTransferForm
            onAdd={handleAdd}
            onCancel={() => setCurrentView('list')}
            warehouses={warehouses}
            allInventoryItems={enrichedInventoryForForm}
            onRefreshSupporting={refreshSupportingDataForAdd}
            setGlobalMessage={setGlobalMessage}
          />
        );
      // case 'deleteConfirm': return <DeleteConfirmationModal ... />; // Future: Delete confirmation
      case 'list':
      default: return (
        <>
          <CustomPageHeader
            title="إدارة التحويلات"
            subtitle="إدارة تحويلات المنتجات بين المخازن"
            icon={<ArrowPathIcon className="h-8 w-8 text-white" />}
            statValue={serverPagination?.total || transfers.length}
            statLabel="إجمالي التحويلات"
            actionButton={
              <button
                onClick={handleEnterAddView}
                className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
              >
                <PlusIcon className="h-5 w-5" />
                إضافة تحويل
              </button>
            }
          />
          <FilterBar
            searchConfig={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'ابحث عن تحويل...' }}
            selectFilters={selectFilters}
            activeChips={activeChips}
            onClearAll={handleClearAll}
            className="mb-6"
          />
          {/* action button moved into header */}

          {/* Pagination header (top) - styled like Sales Orders */}
          {!loading && (
            (() => {
              const tp = totalPages; const cur = serverPagination?.page || currentPage; const tot = Number(serverPagination?.total ?? filteredTransfers.length);
              return (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <div className="text-sm md:text-base text-gray-700">
                    إجمالي التحويلات: <span className="font-semibold text-blue-600">{tot}</span>
                    {tot > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        صفحة <span className="font-semibold">{cur}</span> من <span className="font-semibold">{tp}</span>
                        <span className="mx-2">•</span>
                        عرض <span className="font-semibold">{Math.min(tot, (cur - 1) * itemsPerPage + (pagedTransfers.length ? 1 : 0))}</span>
                        {' - '}
                        <span className="font-semibold">{Math.min(tot, (cur - 1) * itemsPerPage + pagedTransfers.length)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2" dir="rtl">
                    <label className="text-sm text-gray-600">عدد العناصر:</label>
                    <select
                      value={serverPagination?.per_page ?? itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 border rounded-md text-sm bg-white"
                    >
                      {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <button type="button" title="الأولى" onClick={() => setCurrentPage(1)} disabled={cur<=1} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronDoubleRightIcon className="h-5 w-5" />
                      </button>
                      <button type="button" title="السابق" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={cur<=1} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                      <span className="px-2 py-1 text-sm text-gray-700">{cur} / {tp}</span>
                      <button type="button" title="التالي" onClick={() => setCurrentPage(p => Math.min(tp, p+1))} disabled={cur>=tp} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <button type="button" title="الأخيرة" onClick={() => setCurrentPage(tp)} disabled={cur>=tp} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronDoubleLeftIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}
          {!loading && !error && (
            <GlobalTable
              data={pagedTransfers}
              loading={loading}
              error={error}
              rowKey="transfer_id"
              tableClassName=""
              headerClassName=""
              bodyClassName=""
              showSummary={false}
              // Default sort: newest transfers first
              initialSort={{ key: 'created_at', direction: 'desc' }}
              columns={[
                { key: 'display_id', title: '#ID', className: 'w-24', sortable: true },
                { key: 'source_warehouse_name', title: 'المخزن المصدر', className: '', sortable: true },
                { key: 'destination_warehouse_name', title: 'المخزن الوجهة', className: '', sortable: true },
                { key: 'status', title: 'الحالة', className: '', sortable: true },
                // Use a numeric sortAccessor for reliable date sorting
                { key: 'created_at', title: 'التاريخ', className: 'min-w-[140px]', sortable: true, sortAccessor: (it) => it?.created_at ? new Date(it.created_at).getTime() : 0 },
                { key: 'notes', title: 'ملاحظات', className: 'min-w-[200px]', sortable: false },
                { key: 'actions', title: 'الإجراءات', className: 'w-32 text-center', sortable: false, showDivider: false },
              ]}
              renderRow={(transfer) => {
                const sourceWarehouse = warehouses.find(w => w.warehouse_id === transfer.transfer_source_warehouse_id);
                const destinationWarehouse = warehouses.find(w => w.warehouse_id === transfer.transfer_destination_warehouse_id);
                const displayId = transfer.display_id || transfer.transfer_id || (transfer.type === 'request' ? `REQ-${transfer.transfer_id}` : transfer.transfer_id);
                const formattedDate = transfer.formatted_transfer_date || (transfer.created_at ? format(new Date(transfer.created_at), 'yyyy-MM-dd HH:mm') : 'N/A');

                return (
                  <>
                    <td className="px-4 py-4 text-sm font-medium text-blue-600 border-r border-gray-200">{displayId}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200">{sourceWarehouse?.warehouse_name || transfer.source_warehouse_name || 'غير معروف'}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200">{destinationWarehouse?.warehouse_name || transfer.destination_warehouse_name || 'غير معروف'}</td>
                    <td className="px-4 py-4 border-r border-gray-200">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transfer.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        transfer.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                        transfer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200">{formattedDate}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-200 max-w-xs overflow-hidden text-ellipsis">{transfer.notes || 'لا يوجد'}</td>
                    <td className="px-4 py-4 text-sm font-medium text-center border-r border-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openTransferDetailsModal(transfer)}
                          className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                          title="عرض التفاصيل"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                );
              }}
            />
          )}

          {/* Pagination footer (bottom) */}
          {!loading && (
            (() => {
              const tp = totalPages; const cur = serverPagination?.page || currentPage; const tot = Number(serverPagination?.total ?? filteredTransfers.length);
              return (
                <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-sm md:text-base text-gray-700">
                    إجمالي التحويلات: <span className="font-semibold text-blue-600">{tot}</span>
                    {tot > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        صفحة <span className="font-semibold">{cur}</span> من <span className="font-semibold">{tp}</span>
                        <span className="mx-2">•</span>
                        عرض <span className="font-semibold">{Math.min(tot, (cur - 1) * itemsPerPage + (pagedTransfers.length ? 1 : 0))}</span>
                        {' - '}
                        <span className="font-semibold">{Math.min(tot, (cur - 1) * itemsPerPage + pagedTransfers.length)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2" dir="rtl">
                    <label className="text-sm text-gray-600">عدد العناصر:</label>
                    <select
                      value={serverPagination?.per_page ?? itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 border rounded-md text-sm bg-white"
                    >
                      {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <button type="button" title="الأولى" onClick={() => setCurrentPage(1)} disabled={cur<=1} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronDoubleRightIcon className="h-5 w-5" />
                      </button>
                      <button type="button" title="السابق" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={cur<=1} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                      <span className="px-2 py-1 text-sm text-gray-700">{cur} / {tp}</span>
                      <button type="button" title="التالي" onClick={() => setCurrentPage(p => Math.min(tp, p+1))} disabled={cur>=tp} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <button type="button" title="الأخيرة" onClick={() => setCurrentPage(tp)} disabled={cur>=tp} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronDoubleLeftIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </>
      );
    }
  };

  return (
    <div className="p-4 overflow-visible" dir="rtl" style={{position: 'relative', zIndex: 1}}>
      {renderContent()}
      {/* Confirmation Modal for Status Update */}
      {isConfirmStatusModalOpen && transferToUpdate && (
        <ConfirmActionModal
          isOpen={isConfirmStatusModalOpen}
          onClose={() => setIsConfirmStatusModalOpen(false)}
          onConfirm={handleConfirmStatusUpdate}
          message={`هل أنت متأكد أنك تريد تغيير حالة التحويل رقم ${transferToUpdate.transfer_id} إلى "${newStatusForUpdate}"؟`}
          confirmButtonText="تأكيد التغيير"
          cancelButtonText="إلغاء"
        />
      )}
      {/* Transfer Details Modal */}
      {isTransferDetailsModalOpen && selectedTransfer && (
        <TransferDetailsModal
          isOpen={isTransferDetailsModalOpen}
          onClose={closeTransferDetailsModal}
          transfer={selectedTransfer}
          warehouses={warehouses}
          products={products}
          packagingTypes={packagingTypes}
          baseUnits={baseUnits}
          onUpdateStatus={handleUpdateStatusClick}
          allInventoryItems={allInventoryItems} // Pass all inventory items
          setGlobalMessage={setGlobalMessage} // Pass setGlobalMessage
          refreshData={loadAllTransferData} // Pass the refresh function
        />
      )}
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
          onApproveAllocate={handleApproveAllocateRequest}
          onReject={handleRejectRequest}
          setGlobalMessage={setGlobalMessage}
          refreshData={loadAllTransferData}
        />
      )}
    </div>
  );
}
