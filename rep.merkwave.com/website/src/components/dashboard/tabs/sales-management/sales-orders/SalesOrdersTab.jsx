// src/components/dashboard/tabs/sales-management/sales-orders/SalesOrdersTab.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon, 
  FunnelIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDoubleLeftIcon, 
  ChevronDoubleRightIcon,
  CalendarDaysIcon,
  PlusIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';

// API Imports
import { addSalesOrder, updateSalesOrder, getSalesOrderDetails, getAllSalesOrders } from '../../../../../apis/sales_orders';
import { getAppClients, getAppWarehouses } from '../../../../../apis/auth';
// Don't fetch users repeatedly; read representatives from localStorage

// Sub-components for Sales Orders
import SalesOrderListView from './SalesOrderListView';
import AddSalesOrderForm from './AddSalesOrderForm';
import { formatCurrency } from '../../../../../utils/currency';
import UpdateSalesOrderForm from './UpdateSalesOrderForm';
import SalesOrderDetailsModal from './SalesOrderDetailsModal';
import DeliveryFormModal from './DeliveryFormModal';
import { isOdooIntegrationEnabled } from '../../../../../utils/odooIntegration';

const parseAmount = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const computeOrderItemsTotal = (items = []) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const explicitTotal = parseAmount(
      item?.sales_order_items_total_price ?? item?.total_price ?? item?.total
    );
    if (explicitTotal > 0) {
      return sum + explicitTotal;
    }

    const quantity = parseAmount(
      item?.sales_order_items_quantity ?? item?.quantity_ordered ?? item?.quantity
    );
    const unitPrice = parseAmount(
      item?.sales_order_items_unit_price ?? item?.unit_cost ?? item?.unit_price
    );

    if (quantity > 0 && unitPrice > 0) {
      return sum + quantity * unitPrice;
    }

    return sum;
  }, 0);
};

const getOrderTotalAmount = (order) => {
  if (!order) return 0;

  const directTotal = parseAmount(
    order?.sales_orders_total_amount ?? order?.total_amount ?? order?.grand_total
  );

  if (directTotal > 0) {
    return Number(directTotal.toFixed(2));
  }

  const itemsTotal = computeOrderItemsTotal(order?.items);
  if (itemsTotal > 0) {
    return Number(itemsTotal.toFixed(2));
  }

  return 0;
};

const normalizeStatus = (status) => {
  if (typeof status !== 'string') return '';
  return status.trim().toLowerCase();
};

const calculateInvoiceBalanceDelta = (previousStatus, nextStatus, previousTotalAmount, nextTotalAmount) => {
  const prevTotal = Number.isFinite(previousTotalAmount) ? previousTotalAmount : 0;
  const nextTotal = Number.isFinite(nextTotalAmount) ? nextTotalAmount : 0;

  const wasInvoiced = normalizeStatus(previousStatus) === 'invoiced';
  const isInvoiced = normalizeStatus(nextStatus) === 'invoiced';

  if (!wasInvoiced && isInvoiced) {
    return -nextTotal;
  }

  if (wasInvoiced && !isInvoiced) {
    return prevTotal;
  }

  if (wasInvoiced && isInvoiced) {
    return prevTotal - nextTotal;
  }

  return 0;
};

// Date Range Picker Component (similar to SafeTransfersTab)
const DateRangePicker = ({ dateFrom, dateTo, onChange, onClear }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getDisplayText = () => {
    if (!dateFrom && !dateTo) return 'اختر فترة التاريخ';
    if (dateFrom && dateTo) return `${formatDateForDisplay(dateFrom)} - ${formatDateForDisplay(dateTo)}`;
    if (dateFrom) return `من ${formatDateForDisplay(dateFrom)}`;
    if (dateTo) return `إلى ${formatDateForDisplay(dateTo)}`;
    return 'اختر فترة التاريخ';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm cursor-pointer bg-white hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm ${(!dateFrom && !dateTo) ? 'text-gray-500' : 'text-gray-900'}`}>{getDisplayText()}</span>
          <div className="flex items-center gap-2">
            {(dateFrom || dateTo) && (
              <button type="button" onClick={(e)=>{ e.stopPropagation(); onClear(); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input type="date" value={dateFrom} onChange={(e)=>onChange(e.target.value, dateTo)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input type="date" value={dateTo} onChange={(e)=>onChange(dateFrom, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">تطبيق</button>
              <button type="button" onClick={() => { onClear(); setIsOpen(false); }} className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">مسح</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default function SalesOrdersTab({ lockedStatusFilter = null, title = 'أوامر البيع', subtitle = 'إدارة وتتبع أوامر البيع', statLabel = 'إجمالي الأوامر', printMode = 'quote' }) {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const location = useLocation();
  const initialPathRef = useRef(location.pathname);
  const [salesOrders, setSalesOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [representatives, setRepresentatives] = useState([]);
  const [loading, setLoading] = useState(true);
  // Restored states (were accidentally removed during large refactor)
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(lockedStatusFilter || '');
  const [selectedDeliveryStatusFilter, setSelectedDeliveryStatusFilter] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  const [selectedRepresentativeFilter, setSelectedRepresentativeFilter] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    status: lockedStatusFilter || '',
    deliveryStatus: '',
    clientId: '',
    representativeId: '',
    warehouseId: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [_lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [odooEnabled, setOdooEnabled] = useState(false);

  const loadRepresentativesFromCache = useCallback(async () => {
    try {
      const raw = localStorage.getItem('appUsers') || localStorage.getItem('appRepresentatives') || localStorage.getItem('users');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.users) ? parsed.users : (Array.isArray(parsed?.data) ? parsed.data : []));
      if (Array.isArray(list) && list.length) setRepresentatives(list);
    } catch (e) {
      console.warn('Failed to load representatives from cache', e);
    }
  }, []);

  // Populate representatives from cache on mount immediately so filter options appear
  useEffect(() => {
    loadRepresentativesFromCache();
  }, [loadRepresentativesFromCache]);

  // Check Odoo integration status on mount
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

  const loadAllSalesOrderData = useCallback(async () => {
    // Fetch on tab enter or when deps change; manage loader consistently
    setLoading(true);
    setError(null);
    try {
      // Fetch orders from backend; supporting datasets come from localStorage cache
      const ordersResp = await getAllSalesOrders({
        page: currentPage,
        limit: itemsPerPage,
        search: appliedFilters.searchTerm || undefined,
        date_from: appliedFilters.dateFrom || undefined,
        date_to: appliedFilters.dateTo || undefined,
        status: appliedFilters.status || undefined,
        delivery_status: appliedFilters.deliveryStatus || undefined,
        client_id: appliedFilters.clientId || undefined,
        representative_id: appliedFilters.representativeId || undefined,
        warehouse_id: appliedFilters.warehouseId || undefined,
      });

      // Normalize various possible response shapes from get.php
      let rawOrders = [];
      let incomingPagination = null;

      if (Array.isArray(ordersResp)) {
        rawOrders = ordersResp;
      } else if (ordersResp && Array.isArray(ordersResp.data)) {
        rawOrders = ordersResp.data;
        incomingPagination = ordersResp.pagination || null;
        // Normalize pagination whether present or not
        const totalRaw = Number(ordersResp.total ?? ordersResp.count ?? ordersResp.total_items ?? NaN);
        const perRaw = Number(ordersResp.per_page ?? ordersResp.limit ?? itemsPerPage);
        const pageRaw = Number(ordersResp.page ?? ordersResp.current_page ?? currentPage);
        const pagesRemaining = Number.isFinite(Number(ordersResp.pages_remaining)) ? Number(ordersResp.pages_remaining) : null;
        const totalPagesRaw = Number(ordersResp.total_pages ?? NaN);
        const computedTotalPages = Number.isFinite(totalRaw) && perRaw ? Math.max(1, Math.ceil(totalRaw / perRaw)) : (pagesRemaining != null ? pagesRemaining + pageRaw : undefined);
        const normalized = {
          total: Number.isFinite(totalRaw) ? totalRaw : (Number.isFinite(incomingPagination?.total_items) ? Number(incomingPagination.total_items) : undefined),
          per_page: Number.isFinite(perRaw) ? perRaw : Number(incomingPagination?.per_page ?? incomingPagination?.limit ?? itemsPerPage),
          page: Number.isFinite(pageRaw) ? pageRaw : Number(incomingPagination?.page ?? incomingPagination?.current_page ?? currentPage),
          total_pages: Number.isFinite(totalPagesRaw) ? totalPagesRaw : (incomingPagination?.total_pages ?? computedTotalPages),
          pages_remaining: pagesRemaining ?? incomingPagination?.pages_remaining,
        };
        incomingPagination = normalized;
      } else if (ordersResp && Array.isArray(ordersResp.sales_orders)) {
        rawOrders = ordersResp.sales_orders;
        // Normalize pagination from alternative shape
        const p = ordersResp.pagination || null;
        incomingPagination = p ? {
          total: Number(p.total ?? p.total_items ?? p.count ?? 0),
          per_page: Number(p.per_page ?? p.limit ?? itemsPerPage),
          page: Number(p.page ?? p.current_page ?? currentPage),
          total_pages: Number(p.total_pages ?? Math.max(1, Math.ceil((Number(p.total ?? p.total_items ?? 0)) / Number(p.per_page ?? p.limit ?? itemsPerPage))))
        } : null;
      } else if (ordersResp?.data && Array.isArray(ordersResp.data.data)) {
        rawOrders = ordersResp.data.data;
        const p = ordersResp.data.pagination || null;
        incomingPagination = p ? {
          total: Number(p.total ?? p.total_items ?? p.count ?? 0),
          per_page: Number(p.per_page ?? p.limit ?? itemsPerPage),
          page: Number(p.page ?? p.current_page ?? currentPage),
          total_pages: Number(p.total_pages ?? Math.max(1, Math.ceil((Number(p.total ?? p.total_items ?? 0)) / Number(p.per_page ?? p.limit ?? itemsPerPage))))
        } : null;
      } else {
        rawOrders = [];
      }

  const extractedOrders = rawOrders.map(order => ({
        id: order.sales_orders_id,
        order_number: order.sales_orders_id || `SO-${order.sales_orders_id}`,
        client_name: order.clients_company_name,
        client_id: order.clients_id,
        order_date: order.sales_orders_order_date,
        status: order.sales_orders_status,
        delivery_status: order.sales_orders_delivery_status,
        total_amount: order.sales_orders_total_amount,
        representative_name: order.representative_name,
        // Ensure representative id present for edit form
        sales_orders_representative_id: order.sales_orders_representative_id || order.representative_id || order.representative_user_id,
        notes: order.sales_orders_notes || '',
        // Keep original fields for backward compatibility
        ...order
      }));

      const readCache = (key) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          return JSON.parse(raw);
        } catch {
          return null;
        }
      };

      const clientsData = readCache('appClients');
      const productsDataRaw = readCache('appProducts');
      const unitsData = readCache('appBaseUnits');
      const packagingTypesData = readCache('appPackagingTypes');
      const warehousesData = readCache('appWarehouses');
      const usersData = readCache('appUsers');

      setSalesOrders(extractedOrders);
      setPagination(incomingPagination);
      
      // Handle clients - fetch from API if cache is empty
      if (clientsData != null && (Array.isArray(clientsData) ? clientsData.length > 0 : (clientsData?.data?.length > 0))) {
        setClients(Array.isArray(clientsData) ? clientsData : clientsData?.data || []);
      } else {
        // Fetch from API if cache is empty
        try {
          const freshClients = await getAppClients(true);
          setClients(Array.isArray(freshClients) ? freshClients : freshClients?.data || []);
        } catch (e) {
          console.warn('Failed to fetch clients:', e);
        }
      }
      if (productsDataRaw != null) {
        setProducts(Array.isArray(productsDataRaw) ? productsDataRaw : productsDataRaw?.products || productsDataRaw?.data || []);
      }
      if (unitsData != null) {
        setBaseUnits(Array.isArray(unitsData) ? unitsData : unitsData?.data || []);
      }
      if (packagingTypesData != null) {
        setPackagingTypes(Array.isArray(packagingTypesData) ? packagingTypesData : packagingTypesData?.data || []);
      }
      
      // Handle warehouses - fetch from API if cache is empty
      if (warehousesData != null && (Array.isArray(warehousesData) ? warehousesData.length > 0 : (warehousesData?.data?.length > 0))) {
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : warehousesData?.data || []);
      } else {
        // Fetch from API if cache is empty
        try {
          const freshWarehouses = await getAppWarehouses(true);
          setWarehouses(Array.isArray(freshWarehouses) ? freshWarehouses : freshWarehouses?.data || []);
        } catch (e) {
          console.warn('Failed to fetch warehouses:', e);
        }
      }

      const normalizedUsers = Array.isArray(usersData) ? usersData : usersData?.data || [];
      if (normalizedUsers.length) {
        setRepresentatives(normalizedUsers);
      } else {
        loadRepresentativesFromCache();
      }

      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error('Error loading sales order data:', error);
      setError('فشل في تحميل البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, appliedFilters, loadRepresentativesFromCache]);

  // Check if supporting data is loaded
  const isSupportingDataLoaded = useMemo(() => {
    return clients.length > 0 && products.length > 0 && baseUnits.length > 0 && packagingTypes.length > 0 && warehouses.length > 0;
  }, [clients, products, baseUnits, packagingTypes, warehouses]);

  // Check if data needed for edit form is loaded (clients and warehouses only)
  const isEditDataLoaded = useMemo(() => {
    return clients.length > 0 && warehouses.length > 0;
  }, [clients, warehouses]);

  // Function to apply only search term (for apply button)
  const applySearchFilter = useCallback((term) => {
    const normalizedTerm = term ?? pendingSearch ?? '';
    setPendingSearch(normalizedTerm);
    setSearchTerm(normalizedTerm);
    setAppliedFilters(prev => ({
      ...prev,
      searchTerm: normalizedTerm
    }));
    setCurrentPage(1);
  }, [pendingSearch]);

  // Function to apply non-search filters immediately
  const applyNonSearchFilters = useCallback(() => {
    setAppliedFilters(prev => ({
      ...prev,
      dateFrom,
      dateTo,
      status: selectedStatusFilter,
      deliveryStatus: selectedDeliveryStatusFilter,
      clientId: selectedClientFilter,
      representativeId: selectedRepresentativeFilter,
      warehouseId: selectedWarehouseFilter
    }));
    setCurrentPage(1);
  }, [dateFrom, dateTo, selectedStatusFilter, selectedDeliveryStatusFilter, selectedClientFilter, selectedRepresentativeFilter, selectedWarehouseFilter]);

  // Keep pending search input synchronized with committed value
  useEffect(() => {
    setPendingSearch(searchTerm || '');
  }, [searchTerm]);

  // Keep selectedStatusFilter locked if provided via props
  useEffect(() => {
    if (lockedStatusFilter) {
      setSelectedStatusFilter(lockedStatusFilter);
    }
  }, [lockedStatusFilter]);

  // Auto-apply non-search filters when they change
  useEffect(() => {
    applyNonSearchFilters();
  }, [dateFrom, dateTo, selectedStatusFilter, selectedDeliveryStatusFilter, selectedClientFilter, selectedRepresentativeFilter, selectedWarehouseFilter, applyNonSearchFilters]);

  // Initial data load and refetch on page/filters change — with guard to avoid duplicate calls
  const lastFetchKeyRef = useRef(null);
  useEffect(() => {
    const key = `${currentPage}|${itemsPerPage}|${JSON.stringify(appliedFilters)}`;
    if (lastFetchKeyRef.current === key) return; // guard against duplicate triggers (e.g., StrictMode)
    lastFetchKeyRef.current = key;
  loadAllSalesOrderData();
  }, [currentPage, itemsPerPage, appliedFilters, loadAllSalesOrderData]);

  // Set refresh handler for parent component
  useEffect(() => {
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => loadAllSalesOrderData);
    }
  }, [setChildRefreshHandler, loadAllSalesOrderData]);

  // Reset view to 'list' when route changes away from this tab
  useEffect(() => {
    // If the current pathname is different from when this component was first mounted,
    // it means user navigated away, so reset the view
    if (location.pathname !== initialPathRef.current) {
      setCurrentView('list');
      setSelectedOrder(null);
      setIsDeliveryModalOpen(false);
    }
  }, [location.pathname]);

  // Apply initial filters on component mount
  useEffect(() => {
    setAppliedFilters({
      searchTerm,
      dateFrom,
      dateTo,
      status: selectedStatusFilter,
      deliveryStatus: selectedDeliveryStatusFilter,
      clientId: selectedClientFilter,
      representativeId: selectedRepresentativeFilter,
      warehouseId: selectedWarehouseFilter
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if there are pending search changes (only search needs apply button)
  const hasPendingChanges = useMemo(() => {
    return (pendingSearch ?? '') !== (appliedFilters.searchTerm ?? '');
  }, [pendingSearch, appliedFilters.searchTerm]);

  // Status options based on database ENUM (stable memoized references)
  const statusOptions = useMemo(() => [
    { value: 'Draft', label: 'مسودة' },
    { value: 'Pending', label: 'في الانتظار' },
    { value: 'Approved', label: 'مُعتمد' },
    { value: 'Invoiced', label: 'تم إصدار الفاتورة' },
    { value: 'Cancelled', label: 'ملغي' }
  ], []);

  // Delivery status options (stable memoized references)
  const deliveryStatusOptions = useMemo(() => [
    { value: 'Not_Delivered', label: 'لم يتم التسليم' },
    { value: 'Processing_Delivery', label: 'جارى معالجة التسليم' },
    { value: 'Shipped', label: 'تم الشحن' },
    { value: 'Partially_Delivered', label: 'تم التسليم الجزئى' },
    { value: 'Delivered', label: 'تم التسليم' }
  ], []);

  // Active chips for FilterBar (summarize applied filters)
  const activeChips = useMemo(() => {
    const chips = [];
    if (appliedFilters.searchTerm) {
      chips.push({ key: 'search', label: 'بحث', value: appliedFilters.searchTerm, tone: 'green', onRemove: () => { setSearchTerm(''); setPendingSearch(''); applySearchFilter(''); } });
    }
    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      chips.push({ key: 'date', label: 'التاريخ', value: `${appliedFilters.dateFrom || 'من البداية'} - ${appliedFilters.dateTo || 'حتى النهاية'}`, tone: 'gray', onRemove: () => { setDateFrom(''); setDateTo(''); applyNonSearchFilters(); } });
    }
    if (appliedFilters.clientId) {
      const label = clients.find(c => String(c.clients_id) === appliedFilters.clientId)?.clients_company_name || appliedFilters.clientId;
      chips.push({ key: 'client', label: 'العميل', value: label, tone: 'purple', onRemove: () => { setSelectedClientFilter(''); applyNonSearchFilters(); } });
    }
    if (appliedFilters.representativeId) {
      const label = representatives.find(r => String(r.users_id) === appliedFilters.representativeId)?.users_name || appliedFilters.representativeId;
      chips.push({ key: 'rep', label: 'المندوب', value: label, tone: 'orange', onRemove: () => { setSelectedRepresentativeFilter(''); applyNonSearchFilters(); } });
    }
    if (appliedFilters.warehouseId) {
      const label = warehouses.find(w => String(w.warehouses_id || w.warehouse_id) === appliedFilters.warehouseId)?.warehouses_name || appliedFilters.warehouseId;
      chips.push({ key: 'warehouse', label: 'المستودع', value: label, tone: 'indigo', onRemove: () => { setSelectedWarehouseFilter(''); applyNonSearchFilters(); } });
    }
    if (appliedFilters.status) {
      const label = statusOptions.find(s => s.value === appliedFilters.status)?.label || appliedFilters.status;
      const removable = !lockedStatusFilter; // if this tab was created with a locked status, don't allow removing it
      chips.push({ key: 'status', label: 'الحالة', value: label, tone: 'red', onRemove: removable ? () => { setSelectedStatusFilter(''); applyNonSearchFilters(); } : undefined });
    }
    if (appliedFilters.deliveryStatus) {
      const label = deliveryStatusOptions.find(s => s.value === appliedFilters.deliveryStatus)?.label || appliedFilters.deliveryStatus;
      chips.push({ key: 'delivery', label: 'حالة التسليم', value: label, tone: 'yellow', onRemove: () => { setSelectedDeliveryStatusFilter(''); applyNonSearchFilters(); } });
    }
    return chips;
  }, [appliedFilters, clients, representatives, warehouses, statusOptions, deliveryStatusOptions, applyNonSearchFilters, applySearchFilter, lockedStatusFilter]);

  // Function to clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setPendingSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectedStatusFilter(lockedStatusFilter || '');
    setSelectedDeliveryStatusFilter('');
    setSelectedClientFilter('');
    setSelectedRepresentativeFilter('');
    setSelectedWarehouseFilter('');
    setAppliedFilters({
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      status: lockedStatusFilter || '',
      deliveryStatus: '',
      clientId: '',
      representativeId: '',
      warehouseId: ''
    });
    setCurrentPage(1);
  }, [lockedStatusFilter]);

  // Handle adding a new order
  const handleAddOrder = async (orderData) => {
    const clientId = orderData?.sales_orders_client_id;
    const orderTotal = getOrderTotalAmount(orderData);
    const delta = calculateInvoiceBalanceDelta(null, orderData?.sales_orders_status, 0, orderTotal);

    try {
      await addSalesOrder(orderData);
  await loadAllSalesOrderData();

      if (clientId && Number.isFinite(delta) && delta !== 0) {
        adjustClientBalance(clientId, delta);
      }

      setCurrentView('list');
      setGlobalMessage({ type: 'success', message: 'تم إضافة أمر البيع بنجاح!' });
    } catch (error) {
      console.error('Error adding sales order:', error);
      setGlobalMessage({ type: 'error', message: `فشل في إضافة أمر البيع: ${error.message}` });
    }
  };

  // Handle updating an order
  const handleUpdateOrder = async (orderData) => {
    const previousOrder = selectedOrder;
    const previousStatus = previousOrder?.sales_orders_status ?? previousOrder?.status ?? null;
    const previousTotal = getOrderTotalAmount(previousOrder);
    const nextStatus = orderData?.sales_orders_status ?? orderData?.status ?? null;
    const nextTotal = getOrderTotalAmount(orderData);
    const clientId = orderData?.sales_orders_client_id ?? previousOrder?.sales_orders_client_id ?? previousOrder?.client_id ?? null;
    const delta = calculateInvoiceBalanceDelta(previousStatus, nextStatus, previousTotal, nextTotal);

    try {
      await updateSalesOrder(orderData);
  await loadAllSalesOrderData();

      if (clientId && Number.isFinite(delta) && delta !== 0) {
        adjustClientBalance(clientId, delta);
      }

      setCurrentView('list');
      setSelectedOrder(null);
      setGlobalMessage({ type: 'success', message: 'تم تحديث أمر البيع بنجاح!' });
    } catch (error) {
      console.error('Error updating sales order:', error);
      setGlobalMessage({ type: 'error', message: `فشل في تحديث أمر البيع: ${error.message}` });
    }
  };

  // إزالة وظيفة الحذف (مطلوب)

  // (statusOptions and deliveryStatusOptions are declared earlier above activeChips)

  // Since we're using backend filtering, we just sort the orders by ID (newest first)
  const sortedSalesOrders = useMemo(() => {
    const arr = [...salesOrders];
    arr.sort((a, b) => {
      const ida = Number(a.sales_orders_id ?? a.id ?? 0);
      const idb = Number(b.sales_orders_id ?? b.id ?? 0);
      return idb - ida;
    });
    return arr;
  }, [salesOrders]);

  // Helper: option lists for selects
  const clientOptions = useMemo(() => (clients || []).map(c => ({ value: String(c.clients_id || c.id), label: c.clients_company_name || c.company_name || c.name || `#${c.clients_id || c.id}` })), [clients]);
  const representativeOptions = useMemo(() => (representatives || []).map(r => ({
    value: String(r.users_id || r.id || r.users_id),
    label: r.users_name || r.users_full_name || r.name || r.full_name || r.username || `#${r.users_id || r.id}`
  })), [representatives]);
  const warehouseOptions = useMemo(() => (warehouses || []).map(w => ({ value: String(w.warehouses_id || w.warehouse_id || w.id), label: w.warehouses_name || w.warehouse_name || w.name || `#${w.warehouses_id || w.warehouse_id || w.id}` })), [warehouses]);

  // adjustClientBalance stub: project has various places that call this helper; if not present, just no-op but log
  const adjustClientBalance = useCallback((clientId, delta) => {
    try {
      // Best-effort: notify parent to refresh client balances elsewhere if implemented
      console.debug('adjustClientBalance called for', clientId, delta);
    } catch (e) {
      console.warn('adjustClientBalance stub failed', e);
    }
  }, []);

  // Derived pagination values
  const totalOrders = useMemo(() => {
    if (pagination?.total != null) return Number(pagination.total);
    if (pagination?.total_items != null) return Number(pagination.total_items);
    // Derive from total_pages * per_page if available and greater than current data length
    if (pagination?.total_pages && (pagination?.per_page || itemsPerPage)) {
      const estimate = Number(pagination.total_pages) * Number(pagination.per_page || itemsPerPage);
      return Math.max(sortedSalesOrders.length, estimate);
    }
    return sortedSalesOrders.length;
  }, [sortedSalesOrders, pagination, itemsPerPage]);
  const totalPages = useMemo(() => {
    if (pagination) {
      if (Number(pagination.total_pages)) return Number(pagination.total_pages);
      const per = Number(pagination.per_page || itemsPerPage);
      const tot = Number(pagination.total ?? pagination.total_items ?? 0);
      return Math.max(1, Math.ceil(tot / (per || 10)));
    }
    return Math.max(1, Math.ceil(sortedSalesOrders.length / itemsPerPage));
  }, [pagination, sortedSalesOrders.length, itemsPerPage]);
  const currentSlice = useMemo(() => sortedSalesOrders, [sortedSalesOrders]);

  // Handle view details with API call
  const handleViewOrderDetails = async (order) => {
    try {
      setGlobalMessage({ type: 'info', message: 'جاري تحميل تفاصيل الأمر...' });
      const detailedOrder = await getSalesOrderDetails(order.sales_orders_id || order.id);
      setSelectedOrder(detailedOrder);
      setCurrentView('details');
      setGlobalMessage(null);
    } catch (error) {
      console.error('Error loading order details:', error);
      setGlobalMessage({ type: 'error', message: `فشل في تحميل تفاصيل الأمر: ${error.message}` });
    }
  };

  // Handle delivery
  const handleDeliver = async (order) => {
    try {
      setGlobalMessage({ type: 'info', message: 'جاري تحميل بيانات الأمر للتسليم...' });
      const detailedOrder = await getSalesOrderDetails(order.sales_orders_id || order.id);
      setSelectedOrder(detailedOrder);
      setIsDeliveryModalOpen(true);
      setGlobalMessage(null);
    } catch (error) {
      console.error('Error loading order for delivery:', error);
      setGlobalMessage({ type: 'error', message: `فشل في تحميل بيانات الأمر: ${error.message}` });
    }
  };

  // Handle print
  const handlePrint = async (order) => {
    try {
      // Load detailed order data including items
      const orderId = order.sales_orders_id || order.id;
      const orderDetails = await getSalesOrderDetails(orderId);
      const currentDate = new Date();
  const statusValue = (orderDetails.sales_orders_status || order.sales_orders_status || '').toString();
  const isInvoiced = statusValue.toLowerCase() === 'invoiced';
  const isQuotePrint = printMode === 'quote';
  const printHeaderTitle = isQuotePrint ? 'عرض سعر' : 'فاتورة';
  const orderNumberLabel = isQuotePrint ? 'رقم العرض:' : 'رقم الفاتورة:';
  const orderInfoHeading = isQuotePrint ? 'معلومات العرض' : 'معلومات الفاتورة';
  const notesHeading = isQuotePrint ? 'ملاحظات العرض' : 'ملاحظات الفاتورة';
  const statusLabel = isQuotePrint ? 'حالة العرض:' : 'حالة الفاتورة:';
  const printDocumentTitle = `${printHeaderTitle} #${orderId ?? ''}`;
      
      // Prepare items for print
      const itemsForPrint = orderDetails.items?.map((item, index) => ({
        serial: index + 1,
        name: item.variant_name || item.product_name || 'غير محدد',
        sku: item.variant_sku || item.products_sku || `ID: ${item.product_variant_id}` || 'غير محدد',
        packaging: item.packaging_types_name || 'غير محدد',
        quantity: parseFloat(item.sales_order_items_quantity || 0),
        unit_price: parseFloat(item.sales_order_items_unit_price || 0),
        discount: parseFloat(item.sales_order_items_discount_amount || 0),
        tax_rate: item.sales_order_items_has_tax ? parseFloat(item.sales_order_items_tax_rate || 0) : 0,
        tax_amount: parseFloat(item.sales_order_items_tax_amount || 0),
        total: parseFloat(item.sales_order_items_total_price || 0),
        delivered: parseFloat(item.delivered_quantity || 0),
        remaining: parseFloat(item.sales_order_items_quantity || 0) - parseFloat(item.delivered_quantity || 0),
        notes: item.sales_order_items_notes || ''
      })) || [];

      // Calculate totals
  const subtotal = itemsForPrint.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const itemsDiscountTotal = itemsForPrint.reduce((sum, item) => sum + item.discount, 0); // خصم المنتجات
  const orderLevelDiscount = parseFloat(orderDetails.sales_orders_discount_amount || order.sales_orders_discount_amount || 0) || 0; // خصم الطلب
  const combinedDiscount = itemsDiscountTotal + orderLevelDiscount; // إجمالي الخصم
  const totalTax = itemsForPrint.reduce((sum, item) => sum + item.tax_amount, 0);
  const grandTotal = parseFloat(orderDetails.sales_orders_total_amount || order.sales_orders_total_amount || (subtotal - combinedDiscount + totalTax) || 0);

      // Create print content
      const printContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${printDocumentTitle}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #fff;
              direction: rtl;
              text-align: right;
            }
            
            .order-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border: 2px solid #000;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
              color: #000;
            }
            
            .order-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            
            .info-section {
              border: 1px solid #000;
              padding: 15px;
            }
            
            .info-section h3 {
              margin: 0 0 10px 0;
              font-size: 16px;
              font-weight: bold;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 14px;
            }
            
            .info-label {
              font-weight: bold;
              min-width: 100px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              border: 2px solid #000;
            }
            
            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 8px 6px;
              text-align: right;
              font-size: 12px;
            }
            
            .items-table th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            
            .items-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            .totals-section {
              border: 2px solid #000;
              padding: 15px;
              margin-bottom: 30px;
              background-color: #f8f9fa;
            }
            
            .totals-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 14px;
            }
            
            .totals-row.grand-total {
              font-weight: bold;
              font-size: 16px;
              border-top: 1px solid #000;
              padding-top: 8px;
              margin-top: 10px;
            }
            
            .status-section {
              border: 1px solid #000;
              padding: 15px;
              margin-bottom: 30px;
            }
            
            .footer {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 30px;
              text-align: center;
            }
            
            .signature-box {
              border: 1px solid #000;
              padding: 15px;
              height: 60px;
            }
            
            .signature-label {
              font-weight: bold;
              margin-bottom: 10px;
            }
            
            .print-date {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
            
            @media print {
              body { margin: 0; padding: 10px; }
              .order-container { border: none; box-shadow: none; margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="order-container">
            <div class="header">
              <h1>${printHeaderTitle} رقم #${orderId}</h1>
            </div>
            
            <div class="order-info">
              <div class="info-section">
                <h3>${orderInfoHeading}</h3>
                <div class="info-row">
                  <span class="info-label">${orderNumberLabel}</span>
                  <span>#${orderId}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">تاريخ الطلب:</span>
                  <span>${new Date(order.sales_orders_order_date || orderDetails.sales_orders_order_date).toLocaleDateString('en-GB')}</span>
                </div>
                ${(isQuotePrint && isInvoiced) ? '' : `
                <div class="info-row">
                  <span class="info-label">${statusLabel}</span>
                  <span>${statusValue || '—'}</span>
                </div>`}
                <div class="info-row">
                  <span class="info-label">المندوب:</span>
                  <span>${order.representative_name || 'غير محدد'}</span>
                </div>
              </div>
              
              <div class="info-section">
                <h3>معلومات العميل</h3>
                <div class="info-row">
                  <span class="info-label">اسم العميل:</span>
                  <span>${order.clients_company_name || order.clients_contact_name || 'غير محدد'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">المخزن:</span>
                  <span>${order.warehouse_name || order.warehouses_name || 'غير محدد'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">عنوان العميل:</span>
                  <span>${order.clients_address || 'غير محدد'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">هاتف العميل:</span>
                  <span>${order.clients_phone || 'غير محدد'}</span>
                </div>
              </div>
            </div>
            
            ${itemsForPrint.length > 0 ? `
            <table class="items-table">
              <thead>
                <tr>
                  <th>م</th>
                  <th>اسم المنتج</th>
                  <th>كود المنتج</th>
                  <th>نوع التعبئة</th>
                  <th>الكمية المطلوبة</th>
                  <th>الكمية المُسلَّمة</th>
                  <th>المتبقي</th>
                  <th>سعر الوحدة</th>
                  <th>الخصم</th>
                  <th>الضريبة</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${itemsForPrint.map(item => `
                  <tr>
                    <td>${item.serial}</td>
                    <td>${item.name}</td>
                    <td>${item.sku}</td>
                    <td>${item.packaging}</td>
                    <td>${item.quantity.toLocaleString('ar-EG')}</td>
                    <td>${item.delivered.toLocaleString('ar-EG')}</td>
                    <td>${item.remaining.toLocaleString('ar-EG')}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td>${formatCurrency(item.discount)}</td>
                    <td>${item.tax_rate > 0 ? `${item.tax_rate}% (${formatCurrency(item.tax_amount)})` : 'لا يوجد'}</td>
                    <td>${formatCurrency(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="totals-section">
              <h3 style="margin-bottom: 15px;">ملخص المبالغ</h3>
              <div class="totals-row">
                <span>المجموع الفرعي:</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              <div class="totals-row">
                <span>خصم المنتجات:</span>
                <span>${formatCurrency(itemsDiscountTotal)}</span>
              </div>
              <div class="totals-row">
                <span>خصم الطلب:</span>
                <span>${formatCurrency(orderLevelDiscount)}</span>
              </div>
              <div class="totals-row">
                <span>إجمالي الخصم:</span>
                <span>${formatCurrency(combinedDiscount)}</span>
              </div>
              <div class="totals-row">
                <span>إجمالي الضريبة:</span>
                <span>${formatCurrency(totalTax)}</span>
              </div>
              <div class="totals-row grand-total">
                <span>المبلغ الإجمالي:</span>
                <span>${formatCurrency(grandTotal)}</span>
              </div>
            </div>
            ` : ''}
            
            ${orderDetails.sales_orders_notes ? `
              <div class="status-section">
                <h3>${notesHeading}</h3>
                <p>${orderDetails.sales_orders_notes}</p>
              </div>
            ` : ''}
            
            <div class="footer">
              <div class="signature-box">
                <div class="signature-label">توقيع العميل</div>
              </div>
              <div class="signature-box">
                <div class="signature-label">توقيع المندوب</div>
              </div>
              <div class="signature-box">
                <div class="signature-label">ختم الشركة</div>
              </div>
            </div>
            
            <div class="print-date">
              ${isQuotePrint ? 'تم إنشاء هذا العرض' : 'تم إصدار هذه الفاتورة'} بتاريخ: ${currentDate.toLocaleDateString('en-GB')} ${currentDate.toLocaleTimeString('en-US')}
            </div>
          </div>
        </body>
        </html>
      `;

  // Robust print
  const { printHtml } = await import('../../../../../utils/printUtils.js');
  await printHtml(printContent, { title: printHeaderTitle, closeAfter: 700 });
      
    } catch (error) {
      console.error('Error printing order:', error);
      setGlobalMessage({ 
        type: 'error', 
        message: `فشل في طباعة الأمر: ${error.message}` 
      });
    }
  };

  // Handle delivery success
  const handleDeliverySuccess = () => {
  loadAllSalesOrderData();
    setIsDeliveryModalOpen(false);
    setSelectedOrder(null);
  };

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  // Render views based on currentView state
  const renderView = () => {
    switch (currentView) {
      case 'add': return (
        <>
          {/* Modal Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setCurrentView('list')}></div>
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                {isSupportingDataLoaded ? (
                  <AddSalesOrderForm
                    onSubmit={(orderData) => handleAddOrder(orderData)}
                    onCancel={() => setCurrentView('list')}
                    clients={clients}
                    products={products}
                    baseUnits={baseUnits}
                    packagingTypes={packagingTypes}
                    warehouses={warehouses}
                  />
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-center text-gray-600">جاري تحميل البيانات الأساسية...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      );
      case 'edit': return (
        <>
          {/* Modal Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => {
            setCurrentView('list');
            setSelectedOrder(null);
          }}></div>
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                {isEditDataLoaded && selectedOrder ? (
                  <UpdateSalesOrderForm
                    order={selectedOrder}
                    onSubmit={(orderData) => handleUpdateOrder(orderData)}
                    onCancel={() => {
                      setCurrentView('list');
                      setSelectedOrder(null);
                    }}
                    clients={clients}
                    warehouses={warehouses}
                  />
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-center text-gray-600">جاري تحميل البيانات...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      );
      case 'details': return (
        isSupportingDataLoaded && selectedOrder ? (
          <SalesOrderDetailsModal
            order={selectedOrder}
            onClose={() => {
              setCurrentView('list');
              setSelectedOrder(null);
            }}
          />
        ) : (
          <p className="text-center text-gray-600">جاري تحميل البيانات...</p>
        )
      );
  case 'deleteConfirm': return null; // معطل
      case 'list':
      default: return (
        <>
          {/* Unified header + FilterBar like Purchases tab */}
          <CustomPageHeader
            title={title}
            subtitle={subtitle}
            statValue={pagination?.total ?? totalOrders}
            statLabel={statLabel}
            actionButton={<button onClick={() => setCurrentView('add')} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md">أمر بيع جديد</button>}
          />

          <FilterBar
            title="بحث وفلاتر أوامر البيع"
            searchConfig={{
              placeholder: 'ابحث عن أمر بيع...',
              value: pendingSearch,
              onChange: (v) => setPendingSearch(v),
              onClear: () => { setPendingSearch(''); applySearchFilter(''); },
              searchWhileTyping: false,
              onSubmit: (value) => { applySearchFilter(value); },
              showApplyButton: true,
              applyLabel: hasPendingChanges ? 'تطبيق' : 'تطبيق',
              // expose pending state so FilterBar can render differently if it supports it
              hasPendingChanges,
            }}
            selectFilters={[
              // dateRange handled by dateRangeConfig below
              { key: 'client', label: 'العميل', value: selectedClientFilter, onChange: (v) => setSelectedClientFilter(v), options: clientOptions },
              { key: 'representative', label: 'المندوب', value: selectedRepresentativeFilter, onChange: (v) => setSelectedRepresentativeFilter(v), options: representativeOptions },
              { key: 'warehouse', label: 'المستودع', value: selectedWarehouseFilter, onChange: (v) => setSelectedWarehouseFilter(v), options: warehouseOptions },
              !lockedStatusFilter ? { key: 'status', label: 'الحالة', value: selectedStatusFilter, onChange: (v) => setSelectedStatusFilter(v), options: statusOptions } : null,
              { key: 'delivery', label: 'حالة التسليم', value: selectedDeliveryStatusFilter, onChange: (v) => setSelectedDeliveryStatusFilter(v), options: deliveryStatusOptions },
            ].filter(Boolean)}
            activeChips={activeChips}
            dateRangeConfig={{
              from: dateFrom,
              to: dateTo,
              onChange: (fromVal, toVal) => { setDateFrom(fromVal); setDateTo(toVal); },
              onClear: () => { setDateFrom(''); setDateTo(''); }
            }}
            onClearAll={() => { clearAllFilters(); }}
          />

          {/* Top pagination/header using shared component */}
          <PaginationHeaderFooter
            total={totalOrders}
            currentPage={pagination?.page ?? currentPage}
            totalPages={pagination?.total_pages ?? totalPages}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
            onFirst={() => setCurrentPage(1)}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            onLast={() => setCurrentPage(totalPages)}
            transparent={false}
            loading={loading}
            onNavigateStart={() => setLoading(true)}
          />

          {/* Orders List (existing component) */}
          <SalesOrderListView
            orders={currentSlice}
            onEdit={async (order) => {
              try {
                setGlobalMessage({ type: 'info', message: 'جاري تحميل بيانات الأمر للتعديل...' });
                const detailedOrder = await getSalesOrderDetails(order.sales_orders_id || order.id);
                setSelectedOrder(detailedOrder);
                setCurrentView('edit');
                setGlobalMessage(null);
              } catch (error) {
                console.error('Error loading order for edit:', error);
                setGlobalMessage({ type: 'error', message: `فشل في تحميل بيانات الأمر: ${error.message}` });
              }
            }}
            onViewDetails={handleViewOrderDetails}
            onDeliver={handleDeliver}
            onPrint={handlePrint}
            statusOptions={statusOptions}
            searchTerm={searchTerm}
            odooEnabled={odooEnabled}
          />

          {/* Bottom pagination */}
          <PaginationHeaderFooter
            total={totalOrders}
            currentPage={pagination?.page ?? currentPage}
            totalPages={pagination?.total_pages ?? totalPages}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
            onFirst={() => setCurrentPage(1)}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            onLast={() => setCurrentPage(totalPages)}
            loading={loading}
            onNavigateStart={() => setLoading(true)}
          />
        </>
      );
    }
  };

  return (
    <div className="p-6">

      {renderView()}
      
      {/* Delivery Form Modal */}
      <DeliveryFormModal
        isOpen={isDeliveryModalOpen}
        onClose={() => {
          setIsDeliveryModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSuccess={handleDeliverySuccess}
        setGlobalMessage={setGlobalMessage}
      />
    </div>
  );
}
