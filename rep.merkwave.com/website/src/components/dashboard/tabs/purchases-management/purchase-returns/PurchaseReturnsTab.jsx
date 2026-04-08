// src/components/dashboard/tabs/purchases-management/purchase-returns/PurchaseReturnsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, EyeIcon, PrinterIcon } from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';

// API Imports
import { addPurchaseReturnSimple, updatePurchaseReturn, getPurchaseReturnsPaginated, getPurchaseReturnDetails } from '../../../../../apis/purchase_returns';
// Use the centralized getApp* functions from auth for supporting data
import { 
  getAppSuppliers, 
  getAppProducts, 
  getAppBaseUnits, 
  getAppPackagingTypes, 
  getAppWarehouses, 
  
} from '../../../../../apis/auth';

// Hook imports
import useCurrency from '../../../../../hooks/useCurrency';

// Sub-components for Purchase Returns
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import AddPurchaseReturnForm from './AddPurchaseReturnForm_new';
import { isOdooIntegrationEnabled } from '../../../../../utils/odooIntegration';
import UpdatePurchaseReturnForm from './UpdatePurchaseReturnForm';
import PurchaseReturnDetailsModal from './PurchaseReturnDetailsModal';

export default function PurchaseReturnsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { formatCurrency: formatMoney } = useCurrency();
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // pendingSearch is used so search only applies when the user clicks "تطبيق"
  const [pendingSearch, setPendingSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState(null);

  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit', 'details'
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [odooEnabled, setOdooEnabled] = useState(false);

  // Check if Odoo integration is enabled
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

  // Function to load all necessary data
  const loadAllPurchaseReturnData = useCallback(async (forceApiRefresh = false) => {
  // Only show the main loader on initial load or forced refresh
  if (forceApiRefresh) {
    setLoading(true);
    // Intentionally do not show global 'updating' notification here
  }
    setError(null);
    try {
      const [returnsDataRaw, suppliersData, productsDataRaw, unitsDataRaw, packagingTypesDataRaw, warehousesDataRaw] = await Promise.all([
        getPurchaseReturnsPaginated({
          page: currentPage,
          limit: itemsPerPage,
          status: selectedStatusFilter || undefined,
          supplier_id: selectedSupplierFilter || undefined,
          search: searchTerm || undefined,
        }),
        getAppSuppliers(forceApiRefresh), 
        getAppProducts(forceApiRefresh), 
        getAppBaseUnits(forceApiRefresh), 
        getAppPackagingTypes(forceApiRefresh),
        getAppWarehouses(forceApiRefresh),
      ]);

      const extractedReturns = Array.isArray(returnsDataRaw) ? returnsDataRaw : (returnsDataRaw?.data || returnsDataRaw?.purchase_returns || []);
      setPagination(returnsDataRaw?.pagination || null);

  // Normalize all fetched collections to plain arrays to avoid runtime .map errors
  const normalizedSuppliers = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data || suppliersData?.suppliers || []);
  const normalizedProducts = Array.isArray(productsDataRaw) ? productsDataRaw : (productsDataRaw?.products || []);
  const normalizedUnits = Array.isArray(unitsDataRaw) ? unitsDataRaw : (unitsDataRaw?.data || []);
  const normalizedPackaging = Array.isArray(packagingTypesDataRaw) ? packagingTypesDataRaw : (packagingTypesDataRaw?.data || []);
  const normalizedWarehouses = Array.isArray(warehousesDataRaw) ? warehousesDataRaw : (warehousesDataRaw?.data || warehousesDataRaw?.warehouses || []);

  setPurchaseReturns(extractedReturns);
  setSuppliers(normalizedSuppliers);
  setProducts(normalizedProducts);
  setBaseUnits(normalizedUnits);
  setPackagingTypes(normalizedPackaging);
  setWarehouses(normalizedWarehouses);

      if (forceApiRefresh) {
        // Intentionally suppress global 'updated' success notification
      }

    } catch (e) {
      const errorMessage = e.message || 'Error loading purchase returns data';
      setError(errorMessage);
      setGlobalMessage({ type: 'error', message: `فشل في تحميل بيانات مرتجعات الشراء: ${errorMessage}` });
    } finally {
      // Always turn off loading, even if it wasn't turned on by this call
      setLoading(false);
    }
  }, [setGlobalMessage, currentPage, itemsPerPage, selectedStatusFilter, selectedSupplierFilter, searchTerm]);

  // Initial data load
  const lastFetchKeyRef = React.useRef(null);
  useEffect(() => {
    const key = `${currentPage}|${itemsPerPage}|${selectedStatusFilter || ''}|${selectedSupplierFilter || ''}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    loadAllPurchaseReturnData(false); // Initial load and on pagination/filter changes
  }, [loadAllPurchaseReturnData, currentPage, itemsPerPage, selectedStatusFilter, selectedSupplierFilter]);

  // UPDATED: This effect correctly registers the refresh handler.
  useEffect(() => {
    // The handler is a function that calls loadAllPurchaseReturnData with forceApiRefresh = true.
    const refreshHandler = () => loadAllPurchaseReturnData(true);
    setChildRefreshHandler(refreshHandler);
  
    // Cleanup function to unregister the handler when the component unmounts
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadAllPurchaseReturnData]);

  // CRUD operations
  const handleAdd = async (newData) => {
    setLoading(true);
    try {
      // Ensure we send the desired status and a date if not present
      const payload = {
        ...newData,
        status: newData.status || 'Processed',
        purchase_return_date: newData.purchase_return_date || new Date().toISOString().slice(0,19).replace('T',' ')
      };
      await addPurchaseReturnSimple(payload);
      setGlobalMessage({ type: 'success', message: 'تم إضافة مرتجع الشراء بنجاح!' });
      
      // Refresh the data after successful addition
      await loadAllPurchaseReturnData(true);
      setCurrentView('list');
      
    } catch (error) {
      console.error("Error adding purchase return:", error);
      setGlobalMessage({ type: 'error', message: `فشل في إضافة مرتجع الشراء: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedData) => {
    setLoading(true);
    try {
  await updatePurchaseReturn(selectedReturn.purchase_returns_id, updatedData);
      setGlobalMessage({ type: 'success', message: 'تم تحديث مرتجع الشراء بنجاح!' });
      
      // Refresh the data after successful update
      await loadAllPurchaseReturnData(true);
      setCurrentView('list');
      setSelectedReturn(null);
      
    } catch (error) {
      console.error("Error updating purchase return:", error);
      setGlobalMessage({ type: 'error', message: `فشل في تحديث مرتجع الشراء: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // View handlers
  const handleViewDetails = useCallback((returnData) => {
    setSelectedReturn(returnData);
    setCurrentView('details');
  }, []);

  const handleCancelAction = () => {
    setCurrentView('list');
    setSelectedReturn(null);
  };

  // Print handler (consistent style with Purchase Orders)
  const handlePrint = useCallback(async (returnItem) => {
    try {
      setGlobalMessage({ type: 'info', message: 'جاري تحضير الطباعة...' });

      // Always fetch fresh detailed data
      const detailed = await getPurchaseReturnDetails(returnItem.purchase_returns_id);

      // Supplier name
      const supplier = suppliers?.find(s => s.supplier_id == detailed.purchase_returns_supplier_id);
      const supplierName = supplier ? supplier.supplier_name : 'غير محدد';

  const formattedDate = detailed.purchase_returns_date ? new Date(detailed.purchase_returns_date).toLocaleDateString('en-GB') + ' ' + new Date(detailed.purchase_returns_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';

  // Items calculation: only quantity * unitPrice used for print
  const itemsForPrint = (detailed.items || []).map((item, index) => {
        const name = item.products_name || item.variant_name || 'غير محدد';
        const packaging = item.packaging_types_name || 'غير محدد';
        const quantity = parseFloat(item.purchase_return_items_quantity || 0);
        const unitPrice = parseFloat(item.purchase_return_items_unit_cost || 0);
  const total = quantity * unitPrice;
  // We intentionally ignore per-item discount/tax/subtotal columns in print as requested
        return {
          serial: index + 1,
          name,
          packaging,
          quantity,
          unit_price: unitPrice,
          total
        };
      });
      // grand total is sum of quantity * unitPrice per item
      const itemsTotal = itemsForPrint.reduce((s,it)=> s + (parseFloat(it.total)||0), 0);
      // Try explicit discount fields, otherwise parse notes (e.g. "(خصم إرجاع: 3000)")
      let orderDiscount = parseFloat(detailed.purchase_returns_order_discount || detailed.purchase_return_order_discount || 0) || 0;
      if (!orderDiscount && detailed.purchase_returns_notes) {
        const notes = String(detailed.purchase_returns_notes || '');
        const reArabic = /خصم\s*إرجاع\s*[:：]?\s*([0-9.,]+)/i;
        const reGeneric = /discount\s*[:：]?\s*([0-9.,]+)/i;
        const m = notes.match(reArabic) || notes.match(reGeneric);
        if (m && m[1]) {
          const cleaned = m[1].replace(/,/g, '');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) orderDiscount = parsed;
        }
      }
      const grandTotal = Math.max(itemsTotal - orderDiscount, 0);
      const currentDate = new Date();
      const printContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>مرتجع شراء رقم #${detailed.purchase_returns_id}</title><style>
        * { box-sizing:border-box; }
        body { font-family:Arial,sans-serif; margin:0; padding:20px; background:#fff; color:#000; direction:rtl; }
        .order-container { max-width:210mm; margin:0 auto; background:#fff; }
        .header { text-align:center; margin-bottom:30px; border-bottom:3px solid #000; padding-bottom:15px; }
        .header h1 { margin:0; font-size:24px; font-weight:bold; }
        .order-info { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:30px; }
        .info-section { border:2px solid #000; padding:15px; }
        .info-section h3 { margin-top:0; font-size:16px; margin-bottom:12px; }
  .info-row { display:flex; font-size:13px; margin-bottom:6px; }
        .info-label { font-weight:bold; min-width:110px; }
  table { width:100%; border-collapse:collapse; margin-bottom:25px; border:2px solid #000; }
  th, td { border:1px solid #000; padding:6px 5px; font-size:12px; text-align:right; }
  th { background:#f0f0f0; }
  tr:nth-child(even) { background:#f9f9f9; }
        .totals-section { border:2px solid #000; padding:15px; margin-bottom:30px; background:#f8f9fa; }
        .totals-row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px; }
        .totals-row.grand-total { font-weight:bold; font-size:16px; border-top:1px solid #000; padding-top:8px; margin-top:10px; }
        .status-section { border:1px solid #000; padding:15px; margin-bottom:30px; }
        .footer { margin-top:40px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:30px; text-align:center; }
        .signature-box { border:1px solid #000; padding:15px; height:60px; }
        .signature-label { font-weight:bold; margin-bottom:10px; }
        .print-date { text-align:center; margin-top:20px; font-size:12px; color:#555; }
        @media print { body { margin:0; padding:10px; } .order-container { border:none; box-shadow:none; margin:0; padding:0; } }
      </style></head><body>
        <div class="order-container">
          <div class="header"><h1>مرتجع شراء رقم #${detailed.purchase_returns_id}</h1></div>
          <div class="order-info">
            <div class="info-section">
              <h3>معلومات المرتجع</h3>
              <div class="info-row"><span class="info-label">رقم المرتجع:</span><span>#${detailed.purchase_returns_id}</span></div>
              <div class="info-row"><span class="info-label">التاريخ:</span><span>${formattedDate}</span></div>
              <div class="info-row"><span class="info-label">الحالة:</span><span>${detailed.purchase_returns_status || '-'}</span></div>
              ${detailed.purchase_returns_purchase_order_id ? `<div class="info-row"><span class="info-label">أمر الشراء:</span><span>#${detailed.purchase_returns_purchase_order_id}</span></div>` : ''}
            </div>
            <div class="info-section">
              <h3>معلومات المورد</h3>
              <div class="info-row"><span class="info-label">اسم المورد:</span><span>${supplierName}</span></div>
              <div class="info-row"><span class="info-label">إجمالي المرتجع:</span><span>${formatMoney(grandTotal)}</span></div>
            </div>
          </div>
          ${itemsForPrint.length ? `<table class="items-table"><thead><tr><th>م</th><th>اسم المنتج</th><th>نوع التعبئة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${itemsForPrint.map(i=>`<tr><td>${i.serial}</td><td>${i.name}</td><td>${i.packaging}</td><td>${Number(i.quantity).toLocaleString('en-GB')}</td><td>${formatMoney(i.unit_price)}</td><td>${formatMoney(i.total)}</td></tr>`).join('')}</tbody></table>`: ''}
          <div class="totals-section">
            <h3 style="margin-bottom:15px;">ملخص المبالغ</h3>
            <div class="totals-row"><span>المجموع الفرعي:</span><span>${formatMoney(itemsTotal)}</span></div>
            ${orderDiscount > 0 ? `<div class="totals-row"><span>خصم على الطلب:</span><span>-${formatMoney(orderDiscount)}</span></div>` : ''}
            <div class="totals-row grand-total"><span>المبلغ النهائي:</span><span>${formatMoney(grandTotal)}</span></div>
          </div>
          ${detailed.purchase_returns_reason ? `<div class="status-section"><h3>سبب المرتجع</h3><p>${detailed.purchase_returns_reason}</p></div>` : ''}
          ${detailed.purchase_returns_notes ? `<div class="status-section"><h3>ملاحظات</h3><p>${detailed.purchase_returns_notes}</p></div>` : ''}
          <div class="footer"><div class="signature-box"><div class="signature-label">توقيع المورد</div></div><div class="signature-box"><div class="signature-label">توقيع المستلم</div></div><div class="signature-box"><div class="signature-label">ختم الشركة</div></div></div>
          <div class="print-date">تم إنشاء هذا المستند بتاريخ: ${currentDate.toLocaleDateString('en-GB')} ${currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </body></html>`;

      const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(printContent, { title: 'تفاصيل مرتجع شراء', closeAfter: 700 });
      setGlobalMessage({ type: 'success', message: 'تم تحضير الطباعة بنجاح!' });
    } catch (error) {
      console.error('Print failed', error);
      setGlobalMessage({ type: 'error', message: `فشل في طباعة مرتجع الشراء: ${error.message}` });
    }
  }, [suppliers, setGlobalMessage, formatMoney]);

  const filteredReturns = useMemo(() => {
    let currentFiltered = purchaseReturns;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(item =>
        item.supplier_name?.toLowerCase().includes(term) ||
        item.purchase_returns_reason?.toLowerCase().includes(term) ||
        item.purchase_returns_notes?.toLowerCase().includes(term) ||
        item.purchase_returns_id?.toString().includes(term)
      );
    }
    if (selectedStatusFilter) {
      currentFiltered = currentFiltered.filter(item => item.purchase_returns_status === selectedStatusFilter);
    }
    if (selectedSupplierFilter) {
      currentFiltered = currentFiltered.filter(item => item.purchase_returns_supplier_id?.toString() === selectedSupplierFilter);
    }
    return currentFiltered;
  }, [purchaseReturns, searchTerm, selectedStatusFilter, selectedSupplierFilter]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };

  

  // Keep pendingSearch in sync with committed searchTerm (e.g., when cleared programmatically)
  useEffect(() => {
    setPendingSearch(searchTerm || '');
  }, [searchTerm]);

  // Active chips to display in the FilterBar
  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedStatusFilter) {
      chips.push({ key: 'status', label: 'الحالة', value: selectedStatusFilter, tone: 'blue', onRemove: async () => { setSelectedStatusFilter(''); setCurrentPage(1); try { await loadAllPurchaseReturnData(true); } catch { /* ignore */ } } });
    }
    if (selectedSupplierFilter) {
      const found = suppliers?.find(s => String(s.supplier_id||s.id) === String(selectedSupplierFilter));
      const supplierLabel = found ? (found.supplier_name || found.name) : String(selectedSupplierFilter);
      chips.push({ key: 'supplier', label: 'المورد', value: supplierLabel, tone: 'indigo', onRemove: async () => { setSelectedSupplierFilter(''); setCurrentPage(1); try { await loadAllPurchaseReturnData(true); } catch { /* ignore */ } } });
    }
    if (searchTerm && searchTerm.trim() !== '') {
      chips.push({ key: 'search', label: 'بحث', value: searchTerm, tone: 'green', onRemove: async () => { setSearchTerm(''); setPendingSearch(''); setCurrentPage(1); try { await loadAllPurchaseReturnData(true); } catch { /* ignore */ } } });
    }
    return chips;
  }, [selectedStatusFilter, selectedSupplierFilter, searchTerm, suppliers, loadAllPurchaseReturnData]);

  const tableColumns = [
    { key: '__idx', title: '#', headerAlign: 'center', align: 'center', headerClassName: 'w-16', render: (r, i) => (<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{i + 1}</span>) },
    { key: 'purchase_returns_id', title: 'رقم المرتجع', sortable: true, headerAlign: 'center', render: (r) => (<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">#{r.purchase_returns_id}</span>) },
    ...(odooEnabled ? [{ key: 'purchase_returns_odoo_picking_id', title: 'Odoo ID', sortable: true, headerAlign: 'center', align: 'center', headerClassName: 'w-24', render: (r) => r.purchase_returns_odoo_picking_id ? (<span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-semibold">{r.purchase_returns_odoo_picking_id}</span>) : (<span className="text-gray-400">-</span>) }] : []),
    { key: 'supplier_name', title: 'المورد', sortable: true, headerClassName: 'min-w-[150px]', render: (r) => (r.supplier_name || 'غير محدد') },
    { key: 'purchase_returns_date', title: 'التاريخ', sortable: true, headerClassName: 'min-w-[120px]', render: (r) => formatDate(r.purchase_returns_date) },
  { key: 'purchase_returns_total_amount', title: 'إجمالي المبلغ', sortable: true, headerClassName: 'min-w-[120px]', align: 'right', render: (r) => (<>{formatMoney(r.purchase_returns_total_amount)}</>) },
    { key: 'purchase_returns_reason', title: 'السبب', headerClassName: 'min-w-[200px]', render: (r) => (<div className="line-clamp-2" title={r.purchase_returns_reason}>{r.purchase_returns_reason || 'لا يوجد سبب محدد'}</div>) },
    { key: 'actions', title: 'إجراءات', headerAlign: 'center', align: 'center', className: 'w-32', render: (r) => (
      <div className="flex items-center justify-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); handleViewDetails(r); }} className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" title="عرض التفاصيل"><EyeIcon className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); handlePrint(r); }} className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" title="طباعة"><PrinterIcon className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  const renderContent = () => {
    if (currentView === 'add') {
      return (
        <AddPurchaseReturnForm
          suppliers={suppliers}
          products={products}
          packagingTypes={packagingTypes}
          warehouses={warehouses}
          onAdd={handleAdd}
          onCancel={handleCancelAction}
        />
      );
    }

    if (currentView === 'edit' && selectedReturn) {
      return (
        <UpdatePurchaseReturnForm
          purchaseReturn={selectedReturn}
          suppliers={suppliers}
          products={products}
          baseUnits={baseUnits}
          packagingTypes={packagingTypes}
          warehouses={warehouses}
          onSubmit={handleUpdate}
          onCancel={handleCancelAction}
          loading={loading}
        />
      );
    }

  if (currentView === 'details' && selectedReturn) {
      return (
        <PurchaseReturnDetailsModal
          purchaseReturn={selectedReturn}
          suppliers={suppliers}
          products={products}
          baseUnits={baseUnits}
          packagingTypes={packagingTypes}
          warehouses={warehouses}
          onClose={handleCancelAction}
      onPrint={handlePrint}
        />
      );
    }

    return (
      <>
        <CustomPageHeader
          title="مرتجعات الشراء"
          subtitle="قائمة مرتجعات الشراء وإدارتها"
          statValue={pagination?.total_items ?? filteredReturns.length}
          statLabel="إجمالي المرتجعات"
          actionButton={<button onClick={() => setCurrentView('add')} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md">إضافة مرتجع شراء</button>}
        />

        <FilterBar
          title="بحث وفلاتر مرتجعات الشراء"
          searchConfig={{
            placeholder: 'ابحث عن مرتجع شراء...',
            value: pendingSearch,
            onChange: (v) => setPendingSearch(v),
            onClear: () => { setPendingSearch(''); setSearchTerm(''); setCurrentPage(1); },
            searchWhileTyping: false,
            onSubmit: async (v) => { setSearchTerm(v); setCurrentPage(1); try { await loadAllPurchaseReturnData(true); } catch { /* ignore */ } },
            showApplyButton: true,
            applyLabel: 'تطبيق'
          }}
          selectFilters={[
            { key: 'status', label: 'الحالة', value: selectedStatusFilter, onChange: async (v) => { setSelectedStatusFilter(v); setCurrentPage(1); try { await loadAllPurchaseReturnData(true); } catch { /* ignore */ } }, options: [ { value: '', label: 'كل الحالات' }, { value: 'Draft', label: 'مسودة' }, { value: 'Pending', label: 'قيد الانتظار' }, { value: 'Approved', label: 'موافق عليه' }, { value: 'Rejected', label: 'مرفوض' }, { value: 'Processed', label: 'معالج' }, { value: 'Cancelled', label: 'ملغي' } ] },
            { key: 'supplier', label: 'المورد', value: selectedSupplierFilter, onChange: async (v) => { setSelectedSupplierFilter(v); setCurrentPage(1); try { await loadAllPurchaseReturnData(true); } catch { /* ignore */ } }, options: (Array.isArray(suppliers) ? [{ value: '', label: 'كل الموردين' }, ...suppliers.map(s => ({ value: String(s.supplier_id || s.id), label: s.supplier_name || s.name }))] : [{ value: '', label: 'كل الموردين' }]) },
          ]}
          activeChips={activeChips}
          onClearAll={async () => { setSelectedStatusFilter(''); setSelectedSupplierFilter(''); setPendingSearch(''); setSearchTerm(''); setCurrentPage(1); try { await loadAllPurchaseReturnData(true); } catch { /* ignore */ } }}
        />

        {loading && <Loader className="mt-8" />}
        {error && <Alert message={error} type="error" className="mb-4" />}

        {!loading && !error && (
          <PaginationHeaderFooter
            total={pagination?.total_items ?? filteredReturns.length}
            currentPage={pagination?.current_page ?? currentPage}
            totalPages={pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredReturns.length) / itemsPerPage))}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
            onFirst={() => setCurrentPage(1)}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredReturns.length) / itemsPerPage)), p + 1))}
            onLast={() => setCurrentPage(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredReturns.length) / itemsPerPage)))}
            loading={loading}
            onNavigateStart={() => setLoading(true)}
          />
        )}

        {!loading && !error && (
          <GlobalTable
            data={filteredReturns}
            loading={loading}
            error={error}
            columns={tableColumns}
            rowKey="purchase_returns_id"
            totalCount={pagination?.total_items ?? filteredReturns.length}
            searchTerm={searchTerm}
            initialSort={{ key: 'purchase_returns_date', direction: 'desc' }}
            tableClassName="text-sm"
          />
        )}

        {!loading && (
          <PaginationHeaderFooter
            total={pagination?.total_items ?? filteredReturns.length}
            currentPage={pagination?.current_page ?? currentPage}
            totalPages={pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredReturns.length) / itemsPerPage))}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
            onFirst={() => setCurrentPage(1)}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredReturns.length) / itemsPerPage)), p + 1))}
            onLast={() => setCurrentPage(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredReturns.length) / itemsPerPage)))}
            loading={loading}
            onNavigateStart={() => setLoading(true)}
          />
        )}
      </>
    );
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
    </div>
  );
}
