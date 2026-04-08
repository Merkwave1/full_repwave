// src/components/dashboard/tabs/shared/delivery/DeliveryHistoryTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { useOutletContext } from 'react-router-dom';
import { TruckIcon, EyeIcon, CalendarIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getSalesDeliveryDetails, getSalesDeliveriesPaginated } from '../../../../../apis/sales_deliveries';
import { getAppWarehouses, getAppClients } from '../../../../../apis/auth';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';

const normalizeApiList = (payload, extraKeys = []) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const directData = payload.data;
  if (Array.isArray(directData)) return directData;
  if (directData && typeof directData === 'object') {
    if (Array.isArray(directData.data)) return directData.data;
    if (Array.isArray(directData.items)) return directData.items;
  }

  for (const key of extraKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      if (Array.isArray(value.data)) return value.data;
      if (Array.isArray(value.items)) return value.items;
    }
  }

  return [];
};

export default function DeliveryHistoryTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [deliveries, setDeliveries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filters, setFilters] = useState({ search: '', date_from: '', date_to: '', warehouse_id: '', client_id: '' });
  const [searchInput, setSearchInput] = useState('');
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState(null);

  // Load static data (clients, warehouses) once or on explicit refresh
  const loadStaticData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      // Try to read clients from localStorage first (developer may cache these)
      let localClients = null;
      try {
        const raw = localStorage.getItem('app_clients');
        if (raw) localClients = JSON.parse(raw);
      } catch {
        // ignore parse errors
        localClients = null;
      }

      const warehousesData = await getAppWarehouses(forceRefresh);
      setWarehouses(normalizeApiList(warehousesData, ['warehouses']));

      const localClientsList = normalizeApiList(localClients, ['clients']);
      if (localClientsList.length > 0) {
        setClients(localClientsList);
      } else {
        const clientsData = await getAppClients(forceRefresh);
        setClients(normalizeApiList(clientsData, ['clients']));
      }
    } catch (err) {
      console.error('Error loading static data:', err);
      setError(err.message || 'فشل في تحميل البيانات.');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات.' });
    }
  }, [setGlobalMessage]);

  // Refs to keep latest pagination values for refresh handler
  const pageRef = React.useRef(currentPage);
  const limitRef = React.useRef(itemsPerPage);
  const lastFetchKeyRef = React.useRef(null);
  useEffect(() => { pageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { limitRef.current = itemsPerPage; }, [itemsPerPage]);
  useEffect(() => { setSearchInput(filters.search || ''); }, [filters.search]);

  // Load only the current page of deliveries (optionally for a specific page/limit)
  const loadDeliveriesPage = useCallback(async (forceRefresh = false, pageArg, limitArg, filtersArg = {}) => {
    try {
      setError(null);
      const page = pageArg ?? pageRef.current;
      const limit = limitArg ?? limitRef.current;
      const deliveriesResp = await getSalesDeliveriesPaginated({
        page,
        limit,
        forceRefresh,
        search: filtersArg.search || undefined,
        date_from: filtersArg.date_from || undefined,
        date_to: filtersArg.date_to || undefined,
        warehouse_id: filtersArg.warehouse_id || undefined,
        client_id: filtersArg.client_id || undefined,
      });
      const sourceArray = Array.isArray(deliveriesResp) ? deliveriesResp : (deliveriesResp?.data || deliveriesResp?.sales_deliveries || []);
      setDeliveries(sourceArray);
      setServerPagination(deliveriesResp?.pagination || null);
    } catch (err) {
      console.error('Error loading deliveries:', err);
      setError(err.message || 'فشل في تحميل البيانات.');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات.' });
    }
  }, [setGlobalMessage]);

  // Removed unused global handlePrint (per design; each row has its own print)

  const handleViewDetails = async (delivery) => {
    try {
      setLoadingDetails(true);
      setSelectedDelivery(delivery);
      setShowDetailModal(true);
      
      const details = await getSalesDeliveryDetails(delivery.sales_deliveries_id);
      setDeliveryDetails(details);
    } catch (err) {
      console.error('Error loading delivery details:', err);
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل تفاصيل التسليم.' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrintDelivery = async (delivery) => {
    try {
      // Get delivery details with items first
      const details = await getSalesDeliveryDetails(delivery.sales_deliveries_id);
      
  const { printHtml } = await import('../../../../../utils/printUtils.js');
      const warehouseName = warehouses.find(w => w.warehouse_id === delivery.sales_deliveries_warehouse_id)?.warehouse_name || 'غير محدد';
  const clientId = delivery.sales_deliveries_client_id || delivery.client_id || delivery.clients_id || delivery.sales_orders_client_id;
  const clientName = clients.find(c => c.client_id === clientId)?.client_name || delivery.clients_company_name || 'غير محدد';
      const dateTime = formatDateTime(delivery.sales_deliveries_delivery_date);
      
  const html = `
        <html dir="rtl">
          <head>
            <title>إيصال تسليم بضائع</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                direction: rtl; 
                margin: 0;
                padding: 20px;
                font-size: 14px;
              }
              .page-header {
                text-align: right;
                margin-bottom: 20px;
                font-size: 12px;
              }
              .main-title {
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                margin: 20px 0;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              .info-section {
                display: flex;
                justify-content: space-between;
                margin: 20px 0;
              }
              .info-box {
                border: 2px solid #000;
                padding: 15px;
                width: 48%;
              }
              .info-box h3 {
                text-align: center;
                margin: 0 0 15px 0;
                font-size: 16px;
                font-weight: bold;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
                border-bottom: 1px dotted #ccc;
              }
              .info-label {
                font-weight: bold;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                border: 2px solid #000;
              }
              .items-table th {
                background-color: #f0f0f0;
                border: 1px solid #000;
                padding: 10px;
                text-align: center;
                font-weight: bold;
              }
              .items-table td {
                border: 1px solid #000;
                padding: 10px;
                text-align: center;
              }
              .signature-section {
                display: flex;
                justify-content: space-between;
                margin-top: 30px;
              }
              .signature-box {
                width: 30%;
                height: 80px;
                border: 2px solid #000;
                text-align: center;
                padding: 10px;
              }
              .signature-box h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
              }
              .footer-note {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="page-header">
              ${new Date().toLocaleDateString('en-GB', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} - ${new Date().toLocaleTimeString('en-GB')}
            </div>
            
            <h1 class="main-title">إيصال تسليم بضائع</h1>
            
            <div class="info-section">
              <div class="info-box">
                <h3>معلومات الطلب</h3>
                <div class="info-row">
                  <span class="info-label">رقم الطلب:</span>
                  <span>#${delivery.sales_deliveries_sales_order_id}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">تاريخ الطلب:</span>
                  <span>${dateTime.date}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">تاريخ التسليم:</span>
                  <span>${dateTime.date}</span>
                </div>
              </div>
              
              <div class="info-box">
                <h3>معلومات العميل</h3>
                <div class="info-row">
                  <span class="info-label">اسم العميل:</span>
                  <span>${clientName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">المخزن:</span>
                  <span>${warehouseName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">عنوان التسليم:</span>
                  <span>غير محدد</span>
                </div>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم الصنف</th>
                  <th>كود الصنف</th>
                  <th>نوع العبوة</th>
                  <th>الكمية المُسلَّمة</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                ${details && details.items ? details.items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.variant_name || item.products_name || 'غير محدد'}</td>
                    <td>${item.variant_sku || item.sales_order_items_variant_id || '-'}</td>
                    <td>${item.packaging_types_name || 'غير محدد'}</td>
                    <td>${parseFloat(item.sales_delivery_items_quantity_delivered || 0).toFixed(2)}</td>
                    <td>${item.sales_delivery_items_notes || ''}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>1</td>
                    <td>لا توجد بيانات تفصيلية</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td></td>
                  </tr>
                `}
              </tbody>
            </table>
            
            <div class="signature-section">
              <div class="signature-box">
                <h4>توقيع المُسلَّم</h4>
              </div>
              
              <div class="signature-box">
                <h4>توقيع المُستلم</h4>
              </div>
              
              <div class="signature-box">
                <h4>ختم الشركة</h4>
              </div>
            </div>
            
            <div class="footer-note">
              تم إنشاء هذا الإيصال بتاريخ ${new Date().toLocaleDateString('en-GB')} في ${new Date().toLocaleTimeString('en-GB')}
            </div>
          </body>
        </html>`;
      await printHtml(html, { title: 'إيصال تسليم', closeAfter: 700 });
    } catch (err) {
      console.error('Error printing delivery:', err);
      // Fallback to basic print without items
  const { printHtml: printHtmlUtil } = await import('../../../../../utils/printUtils.js');
      const warehouseName = warehouses.find(w => w.warehouse_id === delivery.sales_deliveries_warehouse_id)?.warehouse_name || 'غير محدد';
  const clientId2 = delivery.sales_deliveries_client_id || delivery.client_id || delivery.clients_id || delivery.sales_orders_client_id;
  const clientName = clients.find(c => c.client_id === clientId2)?.client_name || delivery.clients_company_name || 'غير محدد';
      const dateTime = formatDateTime(delivery.sales_deliveries_delivery_date);
      
  const html2 = `
        <html dir="rtl">
          <head>
            <title>إيصال تسليم بضائع</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; margin: 20px; }
              .main-title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
              .info-section { display: flex; justify-content: space-between; margin: 20px 0; }
              .info-box { border: 2px solid #000; padding: 15px; width: 48%; }
            </style>
          </head>
          <body>
            <h1 class="main-title">إيصال تسليم بضائع</h1>
            <div class="info-section">
              <div class="info-box">
                <h3>معلومات الطلب</h3>
                <p>رقم الطلب: #${delivery.sales_deliveries_sales_order_id}</p>
                <p>تاريخ التسليم: ${dateTime.date}</p>
              </div>
              <div class="info-box">
                <h3>معلومات العميل</h3>
                <p>اسم العميل: ${clientName}</p>
                <p>المخزن: ${warehouseName}</p>
              </div>
            </div>
          </body>
        </html>`;
      await printHtmlUtil(html2, { title: 'إيصال تسليم', closeAfter: 700 });
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB'), // DD/MM/YYYY format
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), // 24-hour format
      full: date.toLocaleString('en-GB') // Full date and time
    };
  };

  // On mount: load static data once and register refresh handler
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadStaticData(false);
        if (setChildRefreshHandler) {
          setChildRefreshHandler(() => async () => {
            await loadStaticData(true);
            await loadDeliveriesPage(true, undefined, undefined, filters);
          });
        }
        // initial load
        await loadDeliveriesPage(false, currentPage, itemsPerPage, filters);
      } catch (err) {
        console.error('Error during initial static load:', err);
        if (!cancelled) {
          setError(err.message || 'فشل في تحميل البيانات.');
          setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات.' });
        }
      }
    })();
    return () => { cancelled = true; if (setChildRefreshHandler) setChildRefreshHandler(null); };
  }, [loadStaticData, loadDeliveriesPage, setChildRefreshHandler, setGlobalMessage, currentPage, itemsPerPage, filters]);

  // When page or page size changes, fetch only deliveries (no clients/warehouses)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const key = `${currentPage}|${itemsPerPage}|${filters.search}|${filters.date_from}|${filters.date_to}|${filters.warehouse_id}|${filters.client_id}`;
        if (lastFetchKeyRef.current === key) return;
        lastFetchKeyRef.current = key;
        setLoading(true);
        await loadDeliveriesPage(false, currentPage, itemsPerPage, filters);
      } catch (err) {
        console.error('Error loading deliveries on page change:', err);
        if (!cancelled) {
          setError(err.message || 'فشل في تحميل البيانات.');
          setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPage, itemsPerPage, filters.search, filters.date_from, filters.date_to, filters.warehouse_id, filters.client_id, loadDeliveriesPage, setGlobalMessage, filters]);

  // Pagination derived values
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage]);
  const totalPages = useMemo(() => {
    if (serverPagination?.total_pages) return Number(serverPagination.total_pages);
    const tot = Number(serverPagination?.total ?? deliveries.length);
    const per = Number(serverPagination?.per_page ?? itemsPerPage);
    return Math.max(1, Math.ceil((tot||0)/(per||10)));
  }, [serverPagination, deliveries.length, itemsPerPage]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages, currentPage]);
  const pagedDeliveries = useMemo(() => deliveries, [deliveries]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value ?? '' }));
    setCurrentPage(1);
  }, [setFilters, setCurrentPage]);

  const handleApplySearch = useCallback((value) => {
    const userValue = typeof value === 'string' ? value : searchInput;
    const normalized = userValue.trim();
    if (normalized === (filters.search || '')) {
      if (searchInput !== normalized) {
        setSearchInput(normalized);
      }
      return;
    }
    setSearchInput(normalized);
    handleFilterChange('search', normalized);
  }, [filters.search, handleFilterChange, searchInput]);

  const handleClearAllFilters = useCallback(() => {
    setFilters({ search: '', date_from: '', date_to: '', warehouse_id: '', client_id: '' });
    setSearchInput('');
    setCurrentPage(1);
  }, [setFilters, setCurrentPage, setSearchInput]);

  const searchConfig = useMemo(() => ({
    value: searchInput,
    placeholder: 'ابحث برقم التسليم أو رقم الطلب',
    onChange: (value) => setSearchInput(value),
    onClear: () => {
      setSearchInput('');
      if (filters.search) {
        handleFilterChange('search', '');
      }
    },
    onSubmit: handleApplySearch,
    isDirty: searchInput !== (filters.search || ''),
    applyLabel: 'تطبيق',
  }), [filters.search, handleApplySearch, handleFilterChange, searchInput]);

  const dateRangeConfig = useMemo(() => ({
    from: filters.date_from,
    to: filters.date_to,
    onChange: (fromVal, toVal) => {
      setFilters((prev) => ({ ...prev, date_from: fromVal || '', date_to: toVal || '' }));
      setCurrentPage(1);
    },
    onClear: () => {
      setFilters((prev) => ({ ...prev, date_from: '', date_to: '' }));
      setCurrentPage(1);
    },
  }), [filters.date_from, filters.date_to, setFilters, setCurrentPage]);

  const selectFilters = useMemo(() => [
    {
      key: 'warehouse',
      value: filters.warehouse_id,
      placeholder: 'جميع المستودعات',
      options: [{ value: '', label: 'جميع المستودعات' }, ...warehouses.map(w => ({ value: String(w.warehouses_id || w.warehouse_id), label: w.warehouses_name || w.warehouse_name }))],
      onChange: (value) => handleFilterChange('warehouse_id', value),
      wrapperClassName: 'flex-1 min-w-[160px]',
    },
    {
      key: 'client',
      value: filters.client_id,
      placeholder: 'جميع العملاء',
      options: [{ value: '', label: 'جميع العملاء' }, ...clients.map(u => ({ value: String(u.clients_id || u.client_id || u.id), label: u.clients_company_name || u.client_name || u.name }))],
      onChange: (value) => handleFilterChange('client_id', value),
      wrapperClassName: 'flex-1 min-w-[160px]',
    },
  ], [filters.warehouse_id, filters.client_id, warehouses, clients, handleFilterChange]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.search) {
      chips.push({
        key: 'search',
        label: 'البحث',
        value: filters.search,
        tone: 'blue',
        onRemove: () => handleFilterChange('search', ''),
      });
    }
    if (filters.date_from || filters.date_to) {
      chips.push({
        key: 'date',
        label: 'التاريخ',
        value: `${filters.date_from || 'من البداية'} - ${filters.date_to || 'حتى النهاية'}`,
        tone: 'green',
        onRemove: () => {
          setFilters((prev) => ({ ...prev, date_from: '', date_to: '' }));
          setCurrentPage(1);
        },
      });
    }
    if (filters.warehouse_id) {
      const matchedWarehouse = warehouses.find(w => String(w.warehouse_id || w.warehouses_id) === String(filters.warehouse_id));
      const warehouseLabel = matchedWarehouse?.warehouse_name || matchedWarehouse?.warehouses_name || 'غير محدد';
      chips.push({
        key: 'warehouse',
        label: 'المستودع',
        value: warehouseLabel,
        tone: 'indigo',
        onRemove: () => handleFilterChange('warehouse_id', ''),
      });
    }
    if (filters.client_id) {
  const matchedClient = clients.find(c => String(c.client_id || c.clients_id || c.id) === String(filters.client_id));
  const clientLabel = matchedClient?.client_name || matchedClient?.clients_company_name || matchedClient?.name || 'غير محدد';
      chips.push({
        key: 'client',
        label: 'العميل',
        value: clientLabel,
        tone: 'orange',
        onRemove: () => handleFilterChange('client_id', ''),
      });
    }
    return chips;
  }, [filters.search, filters.date_from, filters.date_to, filters.warehouse_id, filters.client_id, warehouses, clients, handleFilterChange, setFilters, setCurrentPage]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <CustomPageHeader
        title="تاريخ التسليم"
        subtitle="مراجعة وإدارة عمليات التسليم"
        icon={<TruckIcon className="h-8 w-8 text-white" />}
        statValue={serverPagination?.total ?? deliveries.length}
        statLabel="عملية تسليم"
      />

      {/* FilterBar (contains its own floating label) */}
      <div className="mb-3">
        <FilterBar
          searchConfig={searchConfig}
          dateRangeConfig={dateRangeConfig}
          selectFilters={selectFilters}
          activeChips={activeChips}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* Pagination header (top) - Sales Orders style */}
      { (serverPagination?.total ?? deliveries.length) > 0 && (
        <PaginationHeaderFooter
          total={serverPagination?.total ?? deliveries.length}
          currentPage={serverPagination?.page || currentPage}
          totalPages={totalPages}
          itemsPerPage={serverPagination?.per_page ?? itemsPerPage}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
          onFirst={() => setCurrentPage(1)}
          onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
          onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          onLast={() => setCurrentPage(totalPages)}
        />
      )}

  {/* Deliveries List */}
  <div className="bg-transparent rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <GlobalTable
            data={pagedDeliveries}
            loading={loading}
            error={error}
            columns={[
              { key: 'sales_deliveries_id', title: 'ID', headerClassName: 'w-16 border-r border-gray-200', cellClassName: 'w-16 border-r border-gray-200', sortable: true },
              { key: 'sales_deliveries_sales_order_id', title: 'رقم الطلب', headerClassName: 'border-r border-gray-200', cellClassName: 'border-r border-gray-200', sortable: true },
              { key: 'warehouse_name', title: 'المستودع', headerClassName: 'min-w-[140px] border-r border-gray-200', cellClassName: 'border-r border-gray-200', sortable: true },
              { key: 'client_name', title: 'العميل', headerClassName: 'min-w-[140px] border-r border-gray-200', cellClassName: 'border-r border-gray-200', sortable: true },
              { key: 'delivery_datetime', title: 'تاريخ / وقت التسليم', headerClassName: 'min-w-[180px] border-r border-gray-200', cellClassName: 'border-r border-gray-200', sortable: true },
              { key: 'actions', title: 'الإجراءات', headerClassName: 'w-32 text-center border-r border-gray-200', cellClassName: 'text-center border-r border-gray-200', sortable: false, align: 'center' },
            ]}
            rowKey="sales_deliveries_id"
            totalCount={serverPagination?.total ?? deliveries.length}
            searchTerm={filters.search}
            initialSort={{ key: 'sales_deliveries_id', direction: 'desc' }}
            showSummary={false}
            renderRow={(delivery) => {
              const dateTime = formatDateTime(delivery.sales_deliveries_delivery_date);
              return (
                <>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600 border-r border-gray-200">#{delivery.sales_deliveries_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 border-r border-gray-200">#{delivery.sales_deliveries_sales_order_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 border-r border-gray-200">{warehouses.find(w => w.warehouse_id === delivery.sales_deliveries_warehouse_id)?.warehouse_name || 'غير محدد'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 border-r border-gray-200">{(() => { const id = delivery.sales_deliveries_client_id || delivery.client_id || delivery.clients_id || delivery.sales_orders_client_id; const nm = clients.find(c => c.client_id === id)?.client_name; return nm || delivery.clients_company_name || 'غير محدد'; })()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 border-r border-gray-200"><div className="flex items-center"><CalendarIcon className="h-4 w-4 ml-1 text-gray-400" />{dateTime.full}</div></td>
                  <td className="px-6 py-4 text-sm font-medium text-center border-r border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                        onClick={() => handlePrintDelivery(delivery)}
                        title="طباعة سند التسليم"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="group p-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-full transition-all"
                        onClick={() => handleViewDetails(delivery)}
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
        </div>
      </div>

      {/* Pagination footer (bottom) */}
      { (serverPagination?.total ?? deliveries.length) > 0 && (
        <div className="mt-4">
          <PaginationHeaderFooter
            total={serverPagination?.total ?? deliveries.length}
            currentPage={serverPagination?.page || currentPage}
            totalPages={totalPages}
            itemsPerPage={serverPagination?.per_page ?? itemsPerPage}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            onFirst={() => setCurrentPage(1)}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            onLast={() => setCurrentPage(totalPages)}
          />
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDelivery && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 ml-3">
                    <TruckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    تفاصيل التسليم #{selectedDelivery.sales_deliveries_id}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setDeliveryDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="flex justify-center py-8">
                  <Loader />
                </div>
              ) : (
                <>
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم التسليم</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">#{selectedDelivery.sales_deliveries_id}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطلب</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">#{selectedDelivery.sales_deliveries_sales_order_id}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المستودع</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {warehouses.find(w => w.warehouse_id === selectedDelivery.sales_deliveries_warehouse_id)?.warehouse_name || 'غير محدد'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {(() => { const id = selectedDelivery.sales_deliveries_client_id || selectedDelivery.client_id || selectedDelivery.clients_id || selectedDelivery.sales_orders_client_id; const nm = clients.find(c => c.client_id === id)?.client_name; return nm || selectedDelivery.clients_company_name || 'غير محدد'; })()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسليم الكامل</label>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-sm text-gray-900">{formatDateTime(selectedDelivery.sales_deliveries_delivery_date).full}</p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <CalendarIcon className="h-4 w-4 ml-1" />
                            <span>التاريخ: {formatDateTime(selectedDelivery.sales_deliveries_delivery_date).date}</span>
                            <span className="mx-2">•</span>
                            <span>الوقت: {formatDateTime(selectedDelivery.sales_deliveries_delivery_date).time}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded min-h-[60px]">
                          {selectedDelivery.sales_deliveries_notes || 'لا توجد ملاحظات'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Delivered Items */}
                  {deliveryDetails && deliveryDetails.items && (
                    <div className="border-t pt-6">
                      <h4 className="text-lg font-medium text-gray-800 mb-4">
                        المنتجات المُسلَّمة ({deliveryDetails.items.length})
                      </h4>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                #
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                اسم الصنف
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                كود الصنف
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                نوع العبوة
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الكمية المُسلَّمة
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ملاحظات
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {deliveryDetails.items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-center text-sm text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  {item.variant_name || item.products_name || 'غير محدد'}
                                  {item.products_name && item.variant_name && item.products_name !== item.variant_name && (
                                    <span className="text-gray-500 text-xs block">
                                      ({item.products_name})
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-500">
                                  {item.variant_sku || item.sales_order_items_variant_id || '-'}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-500">
                                  {item.packaging_types_name || 'غير محدد'}
                                </td>
                                <td className="px-6 py-4 text-center text-sm font-medium text-green-600">
                                  {parseFloat(item.sales_delivery_items_quantity_delivered || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-500">
                                  {item.sales_delivery_items_notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!deliveryDetails && !loadingDetails && (
                    <div className="border-t pt-6">
                      <div className="text-center text-gray-500 py-8">
                        <p>لا توجد تفاصيل إضافية متاحة لهذا التسليم</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Modal Footer */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <button
                  onClick={() => handlePrintDelivery(selectedDelivery)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <PrinterIcon className="h-4 w-4 ml-1" />
                  طباعة سند التسليم
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setDeliveryDetails(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
