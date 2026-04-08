// src/components/dashboard/tabs/sales-management/sales-returns/SalesReturnsTab.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { formatCurrency } from '../../../../../utils/currency.js';
import { useOutletContext } from 'react-router-dom';
import {
  XMarkIcon,
  CalendarDaysIcon,
  EyeIcon,
  PencilIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import useCurrency from '../../../../../hooks/useCurrency';

// API Imports - These would need to be created
import { addSalesReturn, updateSalesReturn, getSalesReturnDetails, getAllSalesReturns } from '../../../../../apis/sales_returns';

import SalesReturnForm from './SalesReturnForm';
import SalesReturnDetailsModal from './SalesReturnDetailsModal';
import { isOdooIntegrationEnabled } from '../../../../../utils/odooIntegration';

// Date Range Picker Component
const DateRangePicker = ({ dateFrom, dateTo, onChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '');
  const label = !dateFrom && !dateTo ? 'اختر فترة التاريخ' : dateFrom && dateTo ? `${fmt(dateFrom)} - ${fmt(dateTo)}` : (dateFrom ? `من ${fmt(dateFrom)}` : `إلى ${fmt(dateTo)}`);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm cursor-pointer bg-white hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${(!dateFrom && !dateTo) ? 'text-gray-500' : 'text-gray-900'}`}>{label}</span>
          <div className="flex items-center gap-2">
            {(dateFrom || dateTo) && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input type="date" value={dateFrom} onChange={(e) => onChange(e.target.value, dateTo)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input type="date" value={dateTo} onChange={(e) => onChange(dateFrom, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">تطبيق</button>
              <button type="button" onClick={() => { onClear(); setIsOpen(false); }} className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">مسح</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to unwrap API response {status,message,data}
const unwrapReturnData = (resp) => {
  if (resp && resp.data && (resp.data.returns_id || Array.isArray(resp.data.items))) return resp.data;
  return resp;
};

export default function SalesReturnsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { symbol } = useCurrency();
  const [salesReturns, setSalesReturns] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states - separate pending and applied filters for backend integration
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('');

  
  // Applied filters state - these are sent to backend
  const [appliedFilters, setAppliedFilters] = useState({
  searchTerm: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    clientId: '',
    representativeId: '',
    warehouseId: ''
  });

  // pagination state
  const [page, setPage] = useState(1);
  const [perPage, _setPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState({ total: 0, page: 1, per_page: 10, total_pages: 1 });
  const lastFetchKeyRef = useRef('');

  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit', 'details'
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [odooEnabled, setOdooEnabled] = useState(false);

  // Check if Odoo integration is enabled
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

  const handlePerPageChange = useCallback((value) => {
    _setPerPage(value);
    setPage(1);
  }, [_setPerPage, setPage]);

  // Action handlers used by the GlobalTable actions column
  const handleViewDetails = React.useCallback(async (returnItem) => {
    setCurrentView('details');
    setDetailsLoading(true);
    setSelectedReturn({ ...(returnItem || {}), items: [] });
    try {
      const resp = await getSalesReturnDetails(returnItem.returns_id || returnItem.id);
      const full = unwrapReturnData(resp);
      setSelectedReturn(full);
    } catch (e) {
      void e;
      setGlobalMessage({ type: 'error', message: 'تعذر جلب تفاصيل المرتجع' });
      setCurrentView('list');
    } finally {
      setDetailsLoading(false);
    }
  }, [setGlobalMessage]);

  const handleEditReturn = React.useCallback((returnItem) => {
    setSelectedReturn(returnItem);
    setCurrentView('edit');
  }, []);

  const handlePrintReturnAction = React.useCallback(async (returnItem) => {
    try {
      const resp = await getSalesReturnDetails(returnItem.returns_id || returnItem.id);
      printSalesReturn(unwrapReturnData(resp));
    } catch (e) {
      void e;
      setGlobalMessage({ type: 'error', message: 'تعذر طباعة المرتجع' });
    }
  }, [setGlobalMessage]);

  // Compute options for searchable selects
  const clientOptions = useMemo(() => 
    clients
      .filter(client => client.clients_id && client.clients_company_name)
      .map(client => ({
        value: String(client.clients_id),
        label: client.clients_company_name
      })), [clients]
  );

  // Status options for returns
  const statusOptions = [
    { value: 'Pending', label: 'قيد الانتظار' },
    { value: 'Approved', label: 'مؤكد' },
    { value: 'Rejected', label: 'مرفوض' },
    { value: 'Processed', label: 'مُعالج' }
  ];

  // Function to apply only search term (for apply button)
  const applySearchFilter = useCallback((value) => {
    const nextValue = value !== undefined ? value : pendingSearch;
    setPendingSearch(nextValue);
    setSearchTerm(nextValue);
    setAppliedFilters(prev => ({
      ...prev,
      searchTerm: nextValue
    }));
    setPage(1);
  }, [pendingSearch]);

  // Function to apply non-search filters immediately
  const applyNonSearchFilters = useCallback(() => {
    setAppliedFilters(prev => ({
      ...prev,
      dateFrom,
      dateTo,
      status: selectedStatusFilter,
      clientId: selectedClientFilter
    }));
    setPage(1);
  }, [dateFrom, dateTo, selectedStatusFilter, selectedClientFilter]);

  // Auto-apply non-search filters when they change
  useEffect(() => {
    applyNonSearchFilters();
  }, [dateFrom, dateTo, selectedStatusFilter, selectedClientFilter, applyNonSearchFilters]);

  // Apply initial filters on component mount
  useEffect(() => {
    setAppliedFilters({
      searchTerm,
      dateFrom,
      dateTo,
      status: selectedStatusFilter,
      clientId: selectedClientFilter
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if there are pending search changes (only search needs apply button)
  const hasPendingChanges = useMemo(() => {
    return pendingSearch !== appliedFilters.searchTerm;
  }, [pendingSearch, appliedFilters.searchTerm]);

  // Function to clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setPendingSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectedStatusFilter('');
    setSelectedClientFilter('');
    setAppliedFilters({
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      status: '',
      clientId: '',
      representativeId: '',
      warehouseId: ''
    });
    setPage(1);
  }, []);

  const clearSearchFilter = useCallback(() => {
    setPendingSearch('');
    setSearchTerm('');
    setAppliedFilters(prev => ({
      ...prev,
      searchTerm: ''
    }));
    setPage(1);
  }, []);

  useEffect(() => {
    setPendingSearch(searchTerm);
  }, [searchTerm]);

  // Function to load all necessary data
  const loadAllSalesReturnData = useCallback(async (forceApiRefresh = false) => {
    if (forceApiRefresh) {
      setLoading(true);
      // suppressed informational notification for refresh per UX request
    }
    setError(null);

    // Build a key to guard duplicate fetches in StrictMode based on applied filters
    const key = JSON.stringify({ 
      page, 
      perPage, 
      appliedFilters: appliedFilters || {} 
    });
    if (!forceApiRefresh && lastFetchKeyRef.current === key) {
      return; // prevent duplicate fetch with same params
    }
    lastFetchKeyRef.current = key;
    if (!forceApiRefresh) {
      setLoading(true);
    }

    const readCachedArray = (key) => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.data)) return parsed.data;
        return [];
      } catch (_err) {
        void _err;
        return [];
      }
    };

    setClients(readCachedArray('appClients'));
    setProducts(readCachedArray('appProducts'));
    setBaseUnits(readCachedArray('appBaseUnits'));
    setPackagingTypes(readCachedArray('appPackagingTypes'));
    setWarehouses(readCachedArray('appWarehouses'));

    try {
      const filterParams = {
        page,
        limit: perPage,
        ...(appliedFilters.searchTerm && { search: appliedFilters.searchTerm.trim() }),
        ...(appliedFilters.dateFrom && { date_from: appliedFilters.dateFrom }),
        ...(appliedFilters.dateTo && { date_to: appliedFilters.dateTo }),
        ...(appliedFilters.status && { status: appliedFilters.status }),
        ...(appliedFilters.clientId && { client_id: appliedFilters.clientId }),
        ...(appliedFilters.representativeId && { representative_id: appliedFilters.representativeId }),
        ...(appliedFilters.warehouseId && { warehouse_id: appliedFilters.warehouseId })
      };

      let returnsResp;
      try {
        returnsResp = await getAllSalesReturns(filterParams);
      } catch (_err) {
        void _err;
        returnsResp = { data: [], pagination: { current_page: 1, limit: perPage, total_items: 0, total_pages: 1 } };
      }

      const normArr = (d) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      const normPag = (p) => {
        const src = p || {};
        return {
          total: Number(src.total_items ?? src.total ?? 0) || 0,
          per_page: Number(src.limit ?? src.per_page ?? perPage) || perPage,
          page: Number(src.current_page ?? src.page ?? page) || page,
          total_pages: Number(src.total_pages ?? src.pages ?? 1) || 1,
        };
      };

      setSalesReturns(normArr(returnsResp?.data ?? returnsResp));
      const paginationInfo = normPag(returnsResp?.pagination);
      setServerPagination(paginationInfo);
      if (paginationInfo?.page && paginationInfo.page !== page) {
        setPage(paginationInfo.page);
      }

      if (forceApiRefresh) {
        // suppressed success notification for refresh per UX request
      }
    } catch (error) {
      setError(error.message);
      if (forceApiRefresh) {
        setGlobalMessage({ type: 'error', message: `فشل في تحديث مرتجعات البيع: ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage, page, perPage, appliedFilters]);

  useEffect(() => {
    loadAllSalesReturnData();
  }, [loadAllSalesReturnData]);

  // Handle add new return
  const handleAddReturn = async (returnData) => {
    try {
      setGlobalMessage({ type: 'info', message: 'جاري إنشاء مرتجع البيع...' });

      // Pass the form payload directly; the API layer maps to backend field names
      const result = await addSalesReturn(returnData);

      if (result.status === 'success') {
        setGlobalMessage({ type: 'success', message: 'تم إنشاء مرتجع البيع بنجاح!' });
        setCurrentView('list');
        await loadAllSalesReturnData(true); // Refresh data
      } else {
        throw new Error(result.message || 'فشل في إنشاء مرتجع البيع');
      }
    } catch (error) {
      setGlobalMessage({ type: 'error', message: `خطأ في إنشاء مرتجع البيع: ${error.message}` });
    }
  };

  // Handle update return
  const handleUpdateReturn = async (id, returnData) => {
    try {
      if (!id) {
        throw new Error('رقم المرتجع غير موجود.');
      }
      setGlobalMessage({ type: 'info', message: 'جاري تحديث مرتجع البيع...' });

      const result = await updateSalesReturn(id, returnData);

      if (result.status === 'success') {
        setGlobalMessage({ type: 'success', message: 'تم تحديث مرتجع البيع بنجاح!' });
        setCurrentView('list');
        await loadAllSalesReturnData(true); // Refresh data
      } else {
        throw new Error(result.message || 'فشل في تحديث مرتجع البيع');
      }
    } catch (error) {
      setGlobalMessage({ type: 'error', message: `خطأ في تحديث مرتجع البيع: ${error.message}` });
    }
  };

  // Reset to first page on filter/search/per-page change
  useEffect(() => {
    setPage(1);
  }, [selectedStatusFilter, selectedClientFilter, perPage, searchTerm]);

  // Register the refresh handler with parent
  useEffect(() => {
    const refreshHandler = () => loadAllSalesReturnData(true);
    setChildRefreshHandler(() => refreshHandler);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadAllSalesReturnData]);

  // Clear search and filters
  // Clear filters helper (not used in UI yet)
  // const clearFilters = () => {
  //   setSearchTerm('');
  //   setSelectedStatusFilter('');
  //   setSelectedClientFilter('');
  //   setPerPage(10);
  //   setPage(1);
  // };

  // Memoized filtered and searched data
  const filteredReturns = useMemo(() => {
    const normalizedSearch = (searchTerm || '').trim().toLowerCase();

    return salesReturns.filter(returnItem => {
      const idString = String(returnItem.returns_id ?? returnItem.id ?? returnItem.sales_returns_id ?? '').toLowerCase();
      const matchesSearch = !normalizedSearch ||
        idString.includes(normalizedSearch) ||
        String(returnItem.returns_return_number ?? returnItem.return_number ?? '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(returnItem.returns_client_name ?? returnItem.client_name ?? '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(returnItem.returns_notes ?? returnItem.notes ?? '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(returnItem.returns_reason ?? returnItem.reason ?? '')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus = !selectedStatusFilter || (returnItem.returns_status || returnItem.status) === selectedStatusFilter;
      const matchesClient = !selectedClientFilter || (returnItem.returns_client_id || returnItem.client_id) == selectedClientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [salesReturns, searchTerm, selectedStatusFilter, selectedClientFilter]);

  // Sort by returns_id/id desc (newest first)
  const sortedReturns = useMemo(() => {
    const arr = [...filteredReturns];
    arr.sort((a, b) => {
      const ida = Number(a.returns_id ?? a.id ?? a.sales_returns_id ?? 0);
      const idb = Number(b.returns_id ?? b.id ?? b.sales_returns_id ?? 0);
      return idb - ida;
    });
    return arr;
  }, [filteredReturns]);

  const columnsMemo = React.useMemo(() => ([
    {
      key: 'id',
      title: 'ID',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      sortAccessor: (it) => Number(it.returns_id || it.id || it.sales_returns_id || 0),
      className: 'w-24',
      render: (it) => {
        const value = it.returns_id || it.id || it.sales_returns_id || '—';
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
            {value}
          </span>
        );
      }
    },
    ...(odooEnabled ? [{
      key: 'odoo_id',
      title: 'Odoo ID',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      sortAccessor: (it) => Number(it.returns_odoo_picking_id || 0),
      className: 'w-24',
      render: (it) => {
        const value = it.returns_odoo_picking_id;
        return value ? (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
            {value}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        );
      }
    }] : []),
    {
      key: 'client',
      title: 'العميل',
      sortable: true,
      className: 'min-w-[160px]',
      render: (it) => (
        <div className="font-medium text-gray-900">
          {it.clients_company_name || it.client_name || it.returns_client_name || 'غير محدد'}
        </div>
      )
    },
    {
      key: 'items_count',
      title: 'عدد المنتجات',
      sortable: true,
      sortAccessor: (it) => Number(it.items_count || it.total_items || (Array.isArray(it.items) ? it.items.length : 0) || 0),
      className: 'min-w-[140px]',
      render: (it) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
          {it.items_count || it.total_items || (Array.isArray(it.items) ? it.items.length : 0) || 0} منتج
        </span>
      )
    },
    {
      key: 'returns_return_date',
      title: 'التاريخ',
      sortable: true,
      sortAccessor: (it) => new Date(it.returns_return_date || it.return_date).getTime() || 0,
      className: 'min-w-[140px]',
      render: (it) => (
        <div className="text-sm text-gray-700">
          {it.returns_return_date || it.return_date
            ? new Date(it.returns_return_date || it.return_date).toLocaleDateString('en-GB')
            : '—'}
        </div>
      )
    },
    {
      key: 'returns_status',
      title: 'الحالة',
      sortable: true,
      className: 'min-w-[130px]',
      render: (it) => {
        const status = it.returns_status || it.status || 'غير محدد';
        const tones = {
          Processed: 'bg-green-100 text-green-700',
          Approved: 'bg-blue-100 text-blue-700',
          Pending: 'bg-yellow-100 text-yellow-700',
          Rejected: 'bg-red-100 text-red-700'
        };
        const toneClass = tones[status] || 'bg-gray-100 text-gray-700';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${toneClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      key: 'returns_total_amount',
      title: `الإجمالي (${symbol})`,
      sortable: true,
      sortAccessor: (it) => Number(it.returns_total_amount || it.total_amount || 0),
      className: 'min-w-[150px]',
      render: (it) => (
        <div className="text-sm font-semibold text-green-600">
          {formatCurrency(it.returns_total_amount || it.total_amount || 0)}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      sortable: false,
      headerAlign: 'center',
      align: 'center',
      className: 'w-44',
      render: (it) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleViewDetails(it)}
            className="group p-1.5 rounded-full text-blue-600 hover:text-white hover:bg-blue-600 transition-colors"
            title="عرض"
            type="button"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {(it.returns_status !== 'Processed' && it.returns_status !== 'Cancelled') && (
            <button
              onClick={() => handleEditReturn(it)}
              className="group p-1.5 rounded-full text-green-600 hover:text-white hover:bg-green-600 transition-colors"
              title="تعديل"
              type="button"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handlePrintReturnAction(it)}
            className="group p-1.5 rounded-full text-purple-600 hover:text-white hover:bg-purple-600 transition-colors"
            title="طباعة"
            type="button"
          >
            <PrinterIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]), [symbol, handleViewDetails, handleEditReturn, handlePrintReturnAction]);

  // Handle adding a new return
  // (Implementation moved above to avoid duplication)

  // Handle updating a return
  // (Implementation moved above to avoid duplication)

  // Handle deleting a return
  // (Implementation moved above to avoid duplication)

  // Renders the appropriate component based on the current view state
  const renderContent = () => {
    // Check if supporting data is loaded
    const isSupportingDataLoaded = Array.isArray(clients) &&
                                   Array.isArray(products) &&
                                   Array.isArray(baseUnits) &&
                                   Array.isArray(packagingTypes) &&
                                   Array.isArray(warehouses);

    if (loading && currentView === 'list') { // Only show full-page loader for the list view
      return <Loader className="mt-8" />;
    }

    if (error) {
      return <Alert message={error} type="error" className="mb-4" />;
    }

    switch (currentView) {
      case 'add': return (
        isSupportingDataLoaded ? (
          <SalesReturnForm
            onSubmit={handleAddReturn}
            onCancel={() => setCurrentView('list')}
            clients={clients}
            products={products}
            baseUnits={baseUnits}
            packagingTypes={packagingTypes}
            warehouses={warehouses}
            isEditMode={false}
          />
        ) : (
          <p className="text-center text-gray-600">جاري تحميل البيانات الأساسية...</p>
        )
      );
      case 'edit': return (
        isSupportingDataLoaded && selectedReturn ? (
          <SalesReturnForm
            returnItem={selectedReturn}
            onSubmit={(returnData) => handleUpdateReturn(selectedReturn.sales_returns_id || selectedReturn.returns_id || selectedReturn.id, returnData)}
            onCancel={() => {
              setCurrentView('list');
              setSelectedReturn(null);
            }}
            clients={clients}
            products={products}
            baseUnits={baseUnits}
            packagingTypes={packagingTypes}
            warehouses={warehouses}
            isEditMode={true}
          />
        ) : (
          <p className="text-center text-gray-600">جاري تحميل البيانات...</p>
        )
      );
      case 'details': return (
        isSupportingDataLoaded && selectedReturn ? (
          <SalesReturnDetailsModal
            returnItem={selectedReturn}
            loading={detailsLoading}
            onClose={() => {
              setCurrentView('list');
              setSelectedReturn(null);
            }}
            onPrint={printSalesReturn}
            clients={clients}
            products={products}
            baseUnits={baseUnits}
            packagingTypes={packagingTypes}
            warehouses={warehouses}
          />
        ) : (
          <p className="text-center text-gray-600">جاري تحميل البيانات...</p>
        )
      );
      case 'list':
      default: {
        const totalPages = Math.max(serverPagination.total_pages || 1, 1);
        const renderPagination = () => (
          <PaginationHeaderFooter
            total={serverPagination.total}
            currentPage={page}
            totalPages={totalPages}
            itemsPerPage={perPage}
            onItemsPerPageChange={handlePerPageChange}
            onFirst={() => setPage(1)}
            onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            onLast={() => setPage(totalPages)}
            loading={loading}
            onNavigateStart={() => setLoading(true)}
          />
        );

        return (
          <>
          <CustomPageHeader
            title="مرتجعات البيع"
            subtitle="إدارة وتتبع مرتجعات البيع"
            statValue={serverPagination.total}
            statLabel="إجمالي المرتجعات"
            actionButton={<button onClick={() => setCurrentView('add')} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md">إضافة مرتجع بيع</button>}
          />

          <FilterBar
            title="بحث وفلاتر مرتجعات البيع"
            searchConfig={{
              placeholder: 'ابحث عن مرتجع... ',
              value: pendingSearch,
              onChange: (v) => setPendingSearch(v),
              onClear: clearSearchFilter,
              searchWhileTyping: false,
              onSubmit: (value) => applySearchFilter(value),
              showApplyButton: true,
              applyLabel: 'تطبيق',
              isDirty: hasPendingChanges
            }}
            dateRangeConfig={{
              from: dateFrom,
              to: dateTo,
              onChange: (from, to) => { setDateFrom(from); setDateTo(to); },
              onClear: () => { setDateFrom(''); setDateTo(''); }
            }}
            selectFilters={[
              { key: 'status', label: 'الحالة', value: selectedStatusFilter, onChange: setSelectedStatusFilter, options: statusOptions },
              { key: 'client', label: 'العميل', value: selectedClientFilter, onChange: setSelectedClientFilter, options: clientOptions }
            ]}
            activeChips={(() => {
              const chips = [];
              if (appliedFilters.searchTerm) chips.push({ key: 'search', label: 'بحث', value: appliedFilters.searchTerm, tone: 'green', onRemove: clearSearchFilter });
              if (appliedFilters.dateFrom || appliedFilters.dateTo) chips.push({ key: 'date', label: 'التاريخ', value: `${appliedFilters.dateFrom || 'من البداية'} - ${appliedFilters.dateTo || 'حتى النهاية'}`, tone: 'gray', onRemove: () => { setDateFrom(''); setDateTo(''); } });
              if (appliedFilters.status) chips.push({ key: 'status', label: 'الحالة', value: statusOptions.find(s => s.value === appliedFilters.status)?.label || appliedFilters.status, tone: 'purple', onRemove: () => { setSelectedStatusFilter(''); } });
              if (appliedFilters.clientId) chips.push({ key: 'client', label: 'العميل', value: clientOptions.find(c => c.value === appliedFilters.clientId)?.label || appliedFilters.clientId, tone: 'yellow', onRemove: () => { setSelectedClientFilter(''); } });
              return chips;
            })()}
            onClearAll={clearAllFilters}
          />

          <div className="mt-4">
            {renderPagination()}
          </div>

          <div className="mt-4">
            <GlobalTable
              data={sortedReturns}
              rowKey={(item) => item.returns_id || item.id || item.sales_returns_id}
              totalCount={serverPagination.total}
              searchTerm={searchTerm}
              tableClassName="text-sm"
              headerClassName="text-xs"
              columns={columnsMemo}
            />
          </div>

          <div className="mt-4">
            {renderPagination()}
          </div>
          </>
        );
      }
    }
  };

  // Print helper
  const printSalesReturn = async (data) => {
    if (!data) return;
    const items = Array.isArray(data.items) ? data.items : [];
    // Derive subtotal, tax and discounts from items to avoid backend inconsistencies
    // Dynamic detection similar to details modal
    let totalReturnedQty = 0, totalOrderedQty = 0;
    let itemDiscountSum = 0;
    const EPS = 0.01;

    const lineSummaries = items.map(it => {
      const lineRaw = Number(it.return_items_total_price || it.total_price || 0) || 0;
      const providedTax = Number(it.return_items_tax_amount || it.tax_amount || 0) || 0;
      const qty = Number(it.return_items_quantity || it.quantity || 0) || 0;
      const orderedQty = Number(it.ordered_quantity || it.sales_order_items_quantity || it.sales_order_items_quantity || 0) || 0;
      totalReturnedQty += qty;
      totalOrderedQty += orderedQty;
      const taxRate = Number(it.return_items_tax_rate || it.tax_rate || it._tax_rate || it.sales_order_items_tax_rate || 0) || 0;
      const hasTax = Boolean(it.return_items_has_tax ?? it.has_tax ?? it.sales_order_items_has_tax) || taxRate > 0;
      return { it, lineRaw, providedTax, qty, orderedQty, taxRate, hasTax };
    });

    const rawSum = lineSummaries.reduce((sum, line) => sum + line.lineRaw, 0);
    const providedTaxSum = lineSummaries.reduce((sum, line) => sum + line.providedTax, 0);

    const headerTotal = Number(data.returns_total_amount || data.total_amount || 0) || 0;
    const netPlusTax = rawSum + providedTaxSum;
    let rawIsNet = true;
    if (headerTotal > 0) {
      if (Math.abs(headerTotal - netPlusTax) < EPS) rawIsNet = true; else if (Math.abs(headerTotal - rawSum) < EPS) rawIsNet = false;
    }

    // Compute per-item discount (prorated for returned qty) and build rows including discount column
    let computedTaxSum = 0;

    const rows = lineSummaries.map(({ it, lineRaw, providedTax, qty, orderedQty, taxRate, hasTax }, idx) => {
      const rateFraction = taxRate > 0 ? (taxRate / 100) : 0;
      let tax = providedTax;
      let netLine;
      let grossLine;

      if (hasTax && rateFraction > 0 && Math.abs(tax) <= EPS) {
        if (rawIsNet) {
          netLine = lineRaw;
          tax = netLine * rateFraction;
          grossLine = netLine + tax;
        } else {
          grossLine = lineRaw;
          netLine = grossLine / (1 + rateFraction);
          tax = grossLine - netLine;
        }
      } else {
        netLine = rawIsNet ? lineRaw : (lineRaw - tax);
        grossLine = rawIsNet ? (lineRaw + tax) : lineRaw;
      }

      computedTaxSum += tax;
      const unit = qty > 0 ? netLine / qty : 0;
      const lineTotal = grossLine;

      // Determine discount value stored on item (could be total discount for ordered qty)
      const itemDiscountRaw = Number(it.return_items_discount_amount || it.return_items_discount || it.sales_order_items_discount_amount || it.discount_amount || 0) || 0;
      const itemDiscountForReturned = (itemDiscountRaw / Math.max(1, orderedQty || 1)) * qty;
      itemDiscountSum += itemDiscountForReturned;

      return `<tr>
        <td style='padding:6px;border:1px solid #ddd;'>${idx + 1}</td>
        <td style='padding:6px;border:1px solid #ddd;'>${it.product_name || it.variant_name || '-'}</td>
        <td style='padding:6px;border:1px solid #ddd;'>${it.packaging_type_name || it.packaging_types_name || '-'}</td>
        <td style='padding:6px;border:1px solid #ddd;text-align:center;'>${qty.toLocaleString('en-US')}</td>
        <td style='padding:6px;border:1px solid #ddd;text-align:center;'>${unit.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td style='padding:6px;border:1px solid #ddd;text-align:center;'>${itemDiscountForReturned.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td style='padding:6px;border:1px solid #ddd;text-align:center;'>${tax.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td style='padding:6px;border:1px solid #ddd;text-align:center;'>${lineTotal.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      </tr>`;
    }).join('');

  const derivedSubtotal = rawIsNet ? rawSum : (rawSum - computedTaxSum);
  const derivedTax = computedTaxSum;
    // header order-level discount (from linked sales order)
    const headerOrderDiscount = Number(data.sales_orders_discount_amount || data.sales_order_discount_amount || data.sales_orders_discount || 0) || 0;
    const proratedOrderDiscount = (headerOrderDiscount > 0 && totalOrderedQty > 0) ? (headerOrderDiscount * (totalReturnedQty / totalOrderedQty)) : 0;
    const totalDiscount = itemDiscountSum + proratedOrderDiscount;
    const computedTotal = derivedSubtotal + derivedTax - totalDiscount;
    const totalAmount = computedTotal;
    const subTotal = derivedSubtotal;
    const taxAmount = derivedTax;
    // (number formatting reused via formatCurrency and Intl where needed)

    const displayDate = (() => {
      const raw = data.returns_date || data.return_date || '';
      const d = new Date(String(raw).replace(' ', 'T'));
      if (isNaN(d.getTime())) return '-';
      return new Intl.DateTimeFormat('en-GB').format(d);
    })();

    const html = `<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='UTF-8'/><title>طباعة مرتجع بيع</title>
    <style>body{font-family:Arial,system-ui;direction:rtl;margin:24px;} h1{font-size:20px;margin-bottom:6px;} table{width:100%;border-collapse:collapse;margin-top:12px;} .meta{margin-top:8px;display:flex;flex-wrap:wrap;gap:10px;font-size:13px;} .meta div{padding:6px 8px;border-radius:6px;} .totals{margin-top:12px;max-width:360px;} .totals table td{padding:6px 8px;} .badge{display:inline-block;padding:4px 10px;border-radius:8px;font-size:12px;background:#2563eb;color:#fff;} </style></head><body>
    <h1>مرتجع بيع رقم ${data.returns_return_number || data.return_number || data.returns_id}</h1>
    <div class='meta'>
      <div>العميل: ${data.clients_company_name || data.client_name || 'غير محدد'}</div>
      <div>التاريخ: ${displayDate}</div>
      <div>الحالة: <span class='badge'>${data.returns_status || data.status || '-'}</span></div>
    </div>
    <table><thead><tr style='background:#f8fafc'>
      <th style='padding:8px;border:1px solid #ddd;text-align:right;'>#</th>
      <th style='padding:8px;border:1px solid #ddd;text-align:right;'>المنتج</th>
      <th style='padding:8px;border:1px solid #ddd;text-align:right;'>التعبئة</th>
      <th style='padding:8px;border:1px solid #ddd;text-align:center;'>الكمية</th>
      <th style='padding:8px;border:1px solid #ddd;text-align:center;'>سعر الوحدة</th>
      <th style='padding:8px;border:1px solid #ddd;text-align:center;'>خصم</th>
      <th style='padding:8px;border:1px solid #ddd;text-align:center;'>الضريبة</th>
      <th style='padding:8px;border:1px solid #ddd;text-align:center;'>الإجمالي</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class='totals'>
      <table>
        <tr><td>الإجمالي بدون ضريبة:</td><td>${formatCurrency(subTotal,{fractionDigits:2})}</td></tr>
        <tr><td>إجمالي الضريبة:</td><td>${formatCurrency(taxAmount,{fractionDigits:2})}</td></tr>
        <tr><td>إجمالي الخصم (عناصر):</td><td>${formatCurrency(itemDiscountSum,{fractionDigits:2})}</td></tr>
        ${proratedOrderDiscount>0 ? `<tr><td>خصم على الطلب (مخصص):</td><td>${formatCurrency(proratedOrderDiscount,{fractionDigits:2})}</td></tr>` : ''}
        <tr style='font-weight:700;border-top:1px solid #ddd;'><td>الإجمالي بعد الخصم:</td><td>${formatCurrency(totalAmount,{fractionDigits:2})}</td></tr>
      </table>
      <div style='margin-top:12px;font-size:18px;font-weight:700'>الإجمالي الكلي:</div>
      <div style='font-size:20px;margin-top:6px;margin-bottom:6px;'>${formatCurrency(totalAmount,{fractionDigits:2})}</div>
      ${headerTotal>0 && Math.abs(headerTotal-totalAmount)>0.01 ? `<div style='color:#ea580c;font-size:12px'>(الأصلي: ${formatCurrency(headerTotal,{fractionDigits:2})})</div>` : ''}
    </div>
    ${data.returns_notes || data.notes ? `<p style='margin-top:16px;font-size:13px;'>ملاحظات: ${data.returns_notes || data.notes}</p>` : ''}
    </body></html>`;
    try {
  const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(html, { title: 'طباعة مرتجع بيع', closeAfter: 700 });
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
    </div>
  );
}
