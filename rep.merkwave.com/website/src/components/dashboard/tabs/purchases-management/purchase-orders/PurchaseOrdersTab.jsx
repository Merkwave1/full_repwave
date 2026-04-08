import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';

// API Imports
import { addPurchaseOrder, updatePurchaseOrder, getPurchaseOrdersPaginated, getPurchaseOrderDetails } from '../../../../../apis/purchase_orders';
// Supporting reference data will be read from localStorage cache keys instead of fetching here

// Sub-components for Purchase Orders
import PurchaseOrderListView from './PurchaseOrderListView';
import AddPurchaseOrderForm from './AddPurchaseOrderForm';
import UpdatePurchaseOrderForm from './UpdatePurchaseOrderForm';
import PurchaseOrderDetailsModal from './PurchaseOrderDetailsModal';
import useCurrency from '../../../../../hooks/useCurrency';
import { isOdooIntegrationEnabled } from '../../../../../utils/odooIntegration';


export default function PurchaseOrdersTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { symbol } = useCurrency();
  
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Local pending search that updates while typing; only commit to `searchTerm` when user clicks Apply
  const [pendingSearch, setPendingSearch] = useState('');

  // Keep pendingSearch in sync with committed searchTerm (e.g., when cleared programmatically)
  useEffect(() => {
    setPendingSearch(searchTerm || '');
  }, [searchTerm]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  // Keep supplier filter as string to match SearchableSelect values
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState(null); // { current_page, limit, total_items, total_pages }

  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit', 'details'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [odooEnabled, setOdooEnabled] = useState(false);

  // Check if Odoo integration is enabled
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);


  // Function to load all necessary data
  // Accept optional overrides so callers can trigger immediate fetches using freshly selected
  // values even if React state update hasn't propagated yet.
  const loadAllPurchaseOrderData = useCallback(async (forceApiRefresh = false, overrides = {}) => {
  // Only show the main loader on initial load or forced refresh
  if (forceApiRefresh) {
    setLoading(true);
    // Removed global info notification for refresh
  }
    setError(null);
    try {
      // Respect overrides first, then fall back to current state values
      const pageToUse = overrides.page ?? currentPage;
      const limitToUse = overrides.limit ?? itemsPerPage;
      const statusToUse = (overrides.status !== undefined) ? overrides.status : selectedStatusFilter;
      const supplierRaw = (overrides.supplier_id !== undefined) ? overrides.supplier_id : selectedSupplierFilter;
      const supplierToUse = supplierRaw ? (Number.isNaN(Number(supplierRaw)) ? supplierRaw : Number(supplierRaw)) : undefined;
      const searchToUse = (overrides.search !== undefined) ? overrides.search : searchTerm;

      // Fetch purchase orders from server, but read supporting lists from localStorage to avoid extra network calls
      const ordersDataRaw = await getPurchaseOrdersPaginated({
        page: pageToUse,
        limit: limitToUse,
        status: statusToUse || undefined,
        supplier_id: supplierToUse,
        // server-side search term (only provided when user applies search)
        search: searchToUse || undefined,
      });

      // Helper: safe read from localStorage and parse JSON
      const readCache = (key) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          return JSON.parse(raw);
        } catch {
          return null;
        }
      };

      const suppliersData = readCache('appSuppliers');
      const productsDataRaw = readCache('appProducts');
      const unitsData = readCache('appBaseUnits');
      const packagingTypesData = readCache('appPackagingTypes');
      const warehousesData = readCache('appWarehouses');

      // Normalize incoming response { data, pagination }
      const extractedOrders = Array.isArray(ordersDataRaw)
        ? ordersDataRaw
        : (ordersDataRaw?.data || ordersDataRaw?.purchase_orders || []);
      const incomingPagination = ordersDataRaw?.pagination || null;

      // Debug logging for all data

      setPurchaseOrders(extractedOrders);
      setPagination(incomingPagination);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || []);
      setProducts(Array.isArray(productsDataRaw) ? productsDataRaw : productsDataRaw?.products || productsDataRaw?.data || []);
      setBaseUnits(Array.isArray(unitsData) ? unitsData : unitsData?.data || []);
      setPackagingTypes(Array.isArray(packagingTypesData) ? packagingTypesData : packagingTypesData?.data || []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : warehousesData?.data || []);

      if (forceApiRefresh) {
        // Removed global success notification for refresh
      }

    } catch (e) {
      const errorMessage = e.message || 'Error loading purchase orders data';
      setError(errorMessage);
      setGlobalMessage({ type: 'error', message: `فشل في تحميل بيانات أوامر الشراء: ${errorMessage}` });
    } finally {
      // Always turn off loading, even if it wasn't turned on by this call
      setLoading(false);
    }
  }, [setGlobalMessage, currentPage, itemsPerPage, selectedStatusFilter, selectedSupplierFilter, searchTerm]);

  // Function to handle viewing order details
  const handleViewDetails = useCallback(async (order) => {
    try {
      setLoading(true);
      setSelectedOrder(null); // Clear previous data
      
      // Fetch detailed order data including items
      const detailedOrder = await getPurchaseOrderDetails(order.purchase_orders_id);
      
      // Transform the data to match what the modal expects
      const transformedOrder = {
        // Map the main order fields
        purchase_order_id: detailedOrder.purchase_orders_id,
        purchase_order_supplier_id: detailedOrder.purchase_orders_supplier_id,
        purchase_order_warehouse_id: detailedOrder.purchase_orders_warehouse_id,
        purchase_order_date: detailedOrder.purchase_orders_order_date,
        purchase_order_expected_delivery_date: detailedOrder.purchase_orders_expected_delivery_date,
        purchase_order_actual_delivery_date: detailedOrder.purchase_orders_actual_delivery_date,
        purchase_order_total_amount: detailedOrder.purchase_orders_total_amount,
        purchase_orders_order_discount: detailedOrder.purchase_orders_order_discount,
        purchase_order_status: detailedOrder.purchase_orders_status,
        purchase_order_notes: detailedOrder.purchase_orders_notes,
        
        // Map the items and transform field names to match what the modal expects
        items: detailedOrder.items?.map(item => {
          return {
            purchase_order_items_id: item.purchase_order_items_id,
            purchase_order_items_product_id: item.purchase_order_items_variant_id, // Map variant to product for the modal
            purchase_order_items_quantity: item.purchase_order_items_quantity_ordered,
            purchase_order_items_unit_price: item.purchase_order_items_unit_cost,
            purchase_order_items_discount_amount: item.purchase_order_items_discount_amount,
            purchase_order_items_tax_rate: item.purchase_order_items_tax_rate,
            purchase_order_items_has_tax: item.purchase_order_items_has_tax,
            purchase_order_items_total_cost: item.purchase_order_items_total_cost,
            purchase_order_items_packaging_type_id: item.purchase_order_items_packaging_type_id,
            purchase_order_items_notes: item.purchase_order_items_notes,
            // Additional fields for display
            product_name: item.product_name,
            product_variant_name: item.product_variant_name,
            packaging_type_name: item.packaging_type_name,
            base_unit_name: item.base_unit_name
          };
        }) || []
      };
      
      setSelectedOrder(transformedOrder);
      setCurrentView('details'); // Only show modal after data is ready
    } catch (error) {
      setGlobalMessage({ 
        type: 'error', 
        message: `فشل في تحميل تفاصيل أمر الشراء: ${error.message}` 
      });
      setCurrentView('list');
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Function to handle editing an order: fetch full details then open the edit form
  const handleEdit = useCallback(async (order) => {
    try {
      setLoading(true);
      setSelectedOrder(null);

      // Fetch detailed order data including items so the Update form has all fields
      const detailedOrder = await getPurchaseOrderDetails(order.purchase_orders_id);

      // Use the backend response directly so fields like purchase_orders_order_discount are present
      setSelectedOrder(detailedOrder);
      setCurrentView('edit');
    } catch (error) {
      setGlobalMessage({ type: 'error', message: `فشل في تحميل بيانات الطلب للتحرير: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Function to handle printing from the table
  const handlePrint = useCallback(async (order) => {
    try {
      setGlobalMessage({ type: 'info', message: 'جاري تحضير الطباعة...' });
      
      // Fetch detailed order data including items
      const detailedOrder = await getPurchaseOrderDetails(order.purchase_orders_id);
      
      // Transform the data for printing
      const transformedOrder = {
        purchase_order_id: detailedOrder.purchase_orders_id,
        purchase_order_supplier_id: detailedOrder.purchase_orders_supplier_id,
        purchase_order_warehouse_id: detailedOrder.purchase_orders_warehouse_id,
        purchase_order_date: detailedOrder.purchase_orders_order_date,
        purchase_order_status: detailedOrder.purchase_orders_status,
        purchase_order_notes: detailedOrder.purchase_orders_notes,
        items: detailedOrder.items?.map(item => ({
          ...item,
          display_name: item.product_name || item.product_variant_name || 'غير محدد',
          purchase_order_items_quantity: item.purchase_order_items_quantity_ordered,
          purchase_order_items_unit_price: item.purchase_order_items_unit_cost,
        })) || [],
        order_discount: detailedOrder.purchase_orders_order_discount || detailedOrder.purchase_order_order_discount || 0
      };
      
      // Get supplier and warehouse names
      const supplier = suppliers?.find(s => s.supplier_id == transformedOrder.purchase_order_supplier_id);
      const warehouse = warehouses?.find(w => w.warehouse_id == transformedOrder.purchase_order_warehouse_id);
      
      const supplierName = supplier ? supplier.supplier_name : 'غير محدد';
      const warehouseName = warehouse ? warehouse.warehouse_name : 'غير محدد';
      const formattedDate = new Date(transformedOrder.purchase_order_date).toLocaleDateString('ar-SA');
      
      // Calculate totals
      let subtotal = 0;

      const itemsForPrint = transformedOrder.items.map((item, index) => {
        const quantity = parseFloat(item.purchase_order_items_quantity || 0);
        const unitPrice = parseFloat(item.purchase_order_items_unit_price || 0);

        const itemSubtotal = quantity * unitPrice;
        const total = itemSubtotal; // No per-item discount or tax applied in print

        subtotal += itemSubtotal;

        return {
          serial: index + 1,
          name: item.display_name,
          packaging: item.packaging_type_name || 'غير محدد',
          quantity,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
          total
        };
      });

  const orderLevelDiscount = parseFloat(transformedOrder.order_discount || 0) || 0;
  const grandTotal = subtotal - orderLevelDiscount; // Apply only order-level discount
      const currentDate = new Date();
      
      const printContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>أمر شراء رقم #${transformedOrder.purchase_order_id}</title><style>
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
          <div class="header"><h1>أمر شراء رقم #${transformedOrder.purchase_order_id}</h1></div>
          <div class="order-info">
            <div class="info-section">
              <h3>معلومات الطلب</h3>
              <div class="info-row"><span class="info-label">رقم الطلب:</span><span>#${transformedOrder.purchase_order_id}</span></div>
              <div class="info-row"><span class="info-label">تاريخ الطلب:</span><span>${formattedDate}</span></div>
              <div class="info-row"><span class="info-label">حالة الطلب:</span><span>${transformedOrder.purchase_order_status}</span></div>
              <div class="info-row"><span class="info-label">المستودع:</span><span>${warehouseName}</span></div>
            </div>
            <div class="info-section">
              <h3>معلومات المورد</h3>
              <div class="info-row"><span class="info-label">اسم المورد:</span><span>${supplierName}</span></div>
              <div class="info-row"><span class="info-label">إجمالي الطلب:</span><span>${grandTotal.toFixed(2)} ${symbol}</span></div>
            </div>
          </div>
          ${itemsForPrint.length ? `<table class="items-table"><thead><tr><th>م</th><th>اسم المنتج</th><th>نوع التعبئة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${itemsForPrint.map(i=>`<tr><td>${i.serial}</td><td>${i.name}</td><td>${i.packaging}</td><td>${i.quantity}</td><td>${i.unit_price.toFixed(2)} ${symbol}</td><td>${i.total.toFixed(2)} ${symbol}</td></tr>`).join('')}</tbody></table>`: ''}
          <div class="totals-section">
            <h3 style="margin-bottom:15px;">ملخص المبالغ</h3>
            <div class="totals-row"><span>المجموع الفرعي:</span><span>${subtotal.toFixed(2)} ${symbol}</span></div>
            ${orderLevelDiscount > 0 ? `<div class="totals-row"><span>خصم على الطلب:</span><span>${orderLevelDiscount.toFixed(2)} ${symbol}</span></div>` : ''}
            <div class="totals-row grand-total"><span>المبلغ الإجمالي:</span><span>${grandTotal.toFixed(2)} ${symbol}</span></div>
          </div>
          ${transformedOrder.purchase_order_notes ? `<div class="status-section"><h3>ملاحظات الطلب</h3><p>${transformedOrder.purchase_order_notes}</p></div>` : ''}
          <div class="footer"><div class="signature-box"><div class="signature-label">توقيع المورد</div></div><div class="signature-box"><div class="signature-label">توقيع المستلم</div></div><div class="signature-box"><div class="signature-label">ختم الشركة</div></div></div>
          <div class="print-date">تم إنشاء هذا الأمر بتاريخ: ${currentDate.toLocaleDateString('ar-SA')} ${currentDate.toLocaleTimeString('ar-SA')}</div>
        </div>
      </body></html>`;
      
      const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(printContent, { title: 'تفاصيل أمر شراء', closeAfter: 700 });
      
      setGlobalMessage({ type: 'success', message: 'تم تحضير الطباعة بنجاح!' });
    } catch (error) {
      console.error('Print failed', error);
      setGlobalMessage({ 
        type: 'error', 
        message: `فشل في طباعة أمر الشراء: ${error.message}` 
      });
    }
  }, [suppliers, warehouses, setGlobalMessage, symbol]);

  // Initial data load
  const lastFetchKeyRef = React.useRef(null);
  useEffect(() => {
    const key = `${currentPage}|${itemsPerPage}|${selectedStatusFilter || ''}|${selectedSupplierFilter || ''}|${searchTerm || ''}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    loadAllPurchaseOrderData(false); // Fetch on enter and on pagination/filter change
  }, [loadAllPurchaseOrderData, currentPage, itemsPerPage, selectedStatusFilter, selectedSupplierFilter, searchTerm]);

  // Create a stable refresh handler
  const refreshHandler = useCallback(() => loadAllPurchaseOrderData(true), [loadAllPurchaseOrderData]);

  // UPDATED: This effect correctly registers the refresh handler.
  useEffect(() => {
    setChildRefreshHandler(refreshHandler);
  
    // Cleanup function to unregister the handler when the component unmounts
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, refreshHandler]);

  // CRUD operations
  const handleAdd = async (newData) => {
    setLoading(true);
    try {
      const message = await addPurchaseOrder(newData);
      setGlobalMessage({ type: 'success', message: message || 'تم إضافة أمر الشراء بنجاح!' });
      setCurrentView('list');
      await loadAllPurchaseOrderData(true); 
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في إضافة أمر الشراء.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedData) => {
    setLoading(true);
    try {
      const message = await updatePurchaseOrder(updatedData.purchase_orders_id, updatedData);
      setGlobalMessage({ type: 'success', message: message || 'تم تحديث أمر الشراء بنجاح!' });
      setCurrentView('list');
      await loadAllPurchaseOrderData(true); 
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في تحديث أمر الشراء.' });
    } finally {
      setLoading(false);
    }
  };

  // Memoized unique suppliers for filter dropdown
  const uniqueSuppliersForFilter = useMemo(() => {
    // Return options in the shape expected by SearchableSelect: { value, label }
    const options = [];
    options.push({ value: '', label: 'كل الموردين' });

    if (Array.isArray(suppliers)) {
      suppliers.forEach(supplier => {
        if (supplier && (supplier.supplier_id || supplier.id) && (supplier.supplier_name || supplier.name)) {
          const supplierId = supplier.supplier_id || supplier.id;
          const supplierName = supplier.supplier_name || supplier.name;
          // Normalize value to string to avoid strict equality mismatches
          options.push({ value: String(supplierId), label: supplierName });
        }
      });
    }

    return options;
  }, [suppliers]);

  // Client-side filtering
  const filteredOrders = useMemo(() => {
    let currentFiltered = Array.isArray(purchaseOrders) ? [...purchaseOrders] : [];
    // Apply supplier filter first (client-side). selectedSupplierFilter is a string.
    if (selectedSupplierFilter) {
      currentFiltered = currentFiltered.filter(order => {
        const orderSupplierId = order.purchase_orders_supplier_id ?? order.supplier_id ?? order.supplier?.supplier_id;
        return String(orderSupplierId) === String(selectedSupplierFilter);
      });
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(order =>
        (order.supplier_name && String(order.supplier_name).toLowerCase().includes(term)) ||
        (order.purchase_orders_status && String(order.purchase_orders_status).toLowerCase().includes(term)) ||
        (order.purchase_orders_notes && String(order.purchase_orders_notes).toLowerCase().includes(term)) ||
        // also match supplier id or order id
        (order.purchase_orders_id && String(order.purchase_orders_id).toLowerCase().includes(term)) ||
        (order.purchase_orders_supplier_id && String(order.purchase_orders_supplier_id).toLowerCase().includes(term))
      );
    }
    // Sorting (server already orders by date desc, but keep for stability)
    currentFiltered.sort((a,b) => {
      const da = new Date(a.purchase_orders_order_date || a.created_at || 0).getTime();
      const db = new Date(b.purchase_orders_order_date || b.created_at || 0).getTime();
      if (db !== da) return db - da;
      return (b.purchase_orders_id||0) - (a.purchase_orders_id||0);
    });
    return currentFiltered;
  }, [purchaseOrders, searchTerm, selectedSupplierFilter]);

  // Active chips to display in the FilterBar (moved to top-level so hooks are valid)
  const activeChips = useMemo(() => {
    const chips = [];

    // Human-friendly mapping for statuses (optional translations)
    const statusLabels = {
      'Draft': 'مسودة',
      'Ordered': 'تم الطلب',
      'Shipped': 'تم الشحن',
      'Partially Received': 'مستلم جزئياً',
      'Received': 'مستلم',
      'Canceled': 'ملغى'
    };

    if (selectedStatusFilter) {
      chips.push({
        key: 'status',
        label: 'الحالة',
        value: statusLabels[selectedStatusFilter] || selectedStatusFilter,
        tone: 'blue',
        onRemove: async () => { setSelectedStatusFilter(''); setCurrentPage(1); try { await loadAllPurchaseOrderData(true, { status: '', page: 1 }); } catch { /* ignore */ } }
      });
    }

    if (selectedSupplierFilter) {
      // Find supplier name from options
      const found = uniqueSuppliersForFilter.find(opt => String(opt.value) === String(selectedSupplierFilter));
      const supplierLabel = found ? found.label : String(selectedSupplierFilter);
      chips.push({
        key: 'supplier',
        label: 'المورد',
        value: supplierLabel,
        tone: 'indigo',
        onRemove: async () => { setSelectedSupplierFilter(''); setCurrentPage(1); try { await loadAllPurchaseOrderData(true, { supplier_id: '', page: 1 }); } catch { /* ignore */ } }
      });
    }

    if (searchTerm && searchTerm.trim() !== '') {
      chips.push({
        key: 'search',
        label: 'بحث',
        value: searchTerm,
        tone: 'green',
        onRemove: async () => { setSearchTerm(''); setPendingSearch(''); setCurrentPage(1); try { await loadAllPurchaseOrderData(true, { search: '', page: 1 }); } catch { /* ignore */ } }
      });
    }

    return chips;
  }, [selectedStatusFilter, selectedSupplierFilter, searchTerm, uniqueSuppliersForFilter, loadAllPurchaseOrderData]);


  // Renders the appropriate component based on the current view state
  const renderContent = () => {
    // MODIFIED: Check only if the data is an array, not necessarily if it has length > 0.
    // This allows the form to render even if supporting data lists are initially empty.
    const isSupportingDataLoaded = Array.isArray(suppliers) &&
                                   Array.isArray(products) &&
                                   Array.isArray(baseUnits) &&
                                   Array.isArray(packagingTypes) &&
                                   Array.isArray(warehouses);

    // Debug logging for supporting data

    if (loading && currentView === 'list') { // Only show full-page loader for the list view
      return <Loader className="mt-8" />;
    }

    if (error) {
      return <Alert message={error} type="error" className="mb-4" />;
    }

    switch (currentView) {
      case 'add': return (
        <AddPurchaseOrderForm
          onAdd={handleAdd}
          onCancel={() => setCurrentView('list')}
          suppliers={suppliers || []}
          products={products || []}
          baseUnits={baseUnits || []}
          packagingTypes={packagingTypes || []}
          warehouses={warehouses || []}
          dataLoaded={isSupportingDataLoaded}
        />
      );
      case 'edit': return (
        isSupportingDataLoaded && selectedOrder ? (
          <UpdatePurchaseOrderForm
            order={selectedOrder}
            onUpdate={handleUpdate}
            onCancel={() => setCurrentView('list')}
            suppliers={suppliers}
            products={products}
            baseUnits={baseUnits}
            packagingTypes={packagingTypes}
            warehouses={warehouses}
          />
        ) : (
          <p className="text-center text-gray-600">جاري تحميل البيانات...</p>
        )
      );
      case 'details': return (
        isSupportingDataLoaded && selectedOrder ? (
          <PurchaseOrderDetailsModal
            isOpen
            purchaseOrder={selectedOrder}
            onClose={() => setCurrentView('list')}
            suppliers={suppliers}
            products={products}
            warehouses={warehouses}
          />
        ) : (
          <p className="text-center text-gray-600">جاري تحميل البيانات...</p>
        )
      );
      case 'list':
      default: return (
        <>
          <CustomPageHeader
            title="أوامر الشراء"
            subtitle="قائمة أوامر الشراء وإدارتها"
            statValue={pagination?.total_items ?? purchaseOrders.length}
            statLabel="إجمالي الأوامر"
            actionButton={<button onClick={() => setCurrentView('add')} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md">إضافة أمر شراء</button>}
          />

          <FilterBar
            title="بحث وفلاتر أوامر الشراء"
            searchConfig={{
              placeholder: 'ابحث عن أمر شراء...',
              // show the committed search value in the FilterBar when not typing (keeps input in sync)
              value: pendingSearch,
              onChange: (v) => setPendingSearch(v),
              onClear: () => { setPendingSearch(''); setSearchTerm(''); setCurrentPage(1); },
              // Don't apply search while typing. Wait until the user clicks the "تطبيق" (Apply) button.
              searchWhileTyping: false,
              // When the user clicks Apply, commit the pending search to the actual searchTerm used for API calls
              onSubmit: async (v) => { 
                setSearchTerm(v); 
                setCurrentPage(1);
                try {
                  // ensure API receives the freshly applied search value immediately
                  await loadAllPurchaseOrderData(true, { search: v, page: 1 });
                } catch {
                  // swallow - loadAllPurchaseOrderData already handles messaging
                }
              },
              showApplyButton: true,
              applyLabel: 'تطبيق',
            }}
            selectFilters={[
              { key: 'status', label: 'الحالة', value: selectedStatusFilter, onChange: async (v) => { setSelectedStatusFilter(v); setCurrentPage(1); try { await loadAllPurchaseOrderData(true, { status: v, page: 1 }); } catch { /* ignore */ } }, options: [ { value: '', label: 'كل الحالات' }, { value: 'Draft', label: 'Draft' }, { value: 'Ordered', label: 'Ordered' }, { value: 'Shipped', label: 'Shipped' }, { value: 'Partially Received', label: 'Partially Received' }, { value: 'Received', label: 'Received' }, { value: 'Canceled', label: 'Canceled' } ] },
              { key: 'supplier', label: 'المورد', value: selectedSupplierFilter, onChange: async (v) => { setSelectedSupplierFilter(v); setCurrentPage(1); try { await loadAllPurchaseOrderData(true, { supplier_id: v, page: 1 }); } catch { /* ignore */ } }, options: uniqueSuppliersForFilter },
            ]}
            // Build active chips for currently applied filters so the FilterBar shows them
            activeChips={activeChips}
            onClearAll={async () => { 
              setSelectedStatusFilter(''); 
              setSelectedSupplierFilter(''); 
              setPendingSearch('');
              setSearchTerm('');
              setCurrentPage(1);
              try {
                await loadAllPurchaseOrderData(true, { status: '', supplier_id: '', search: '', page: 1 });
              } catch {
                // handled inside loader
              }
            }}
          />
          

            {/* Top pagination / header using shared component */}
            {!loading && (
              <PaginationHeaderFooter
                total={pagination?.total_items ?? filteredOrders.length}
                currentPage={pagination?.current_page ?? currentPage}
                totalPages={pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredOrders.length) / itemsPerPage))}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
                onFirst={() => setCurrentPage(1)}
                onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
                onNext={() => setCurrentPage(p => Math.min(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredOrders.length) / itemsPerPage)), p + 1))}
                onLast={() => setCurrentPage(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredOrders.length) / itemsPerPage)))}
                transparent={false}
                loading={loading}
                onNavigateStart={() => setLoading(true)}
              />
            )}

       { !loading && (
           <PurchaseOrderListView
             purchaseOrders={filteredOrders}
             loading={loading}
             error={error}
             onEdit={handleEdit}
             onViewDetails={handleViewDetails}
             onPrint={handlePrint}
             suppliers={suppliers}
             warehouses={warehouses}
             odooEnabled={odooEnabled}
            />
       )}

              {/* Bottom pagination */}
              {!loading && (
                <PaginationHeaderFooter
                  total={pagination?.total_items ?? filteredOrders.length}
                  currentPage={pagination?.current_page ?? currentPage}
                  totalPages={pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredOrders.length) / itemsPerPage))}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
                  onFirst={() => setCurrentPage(1)}
                  onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
                  onNext={() => setCurrentPage(p => Math.min(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredOrders.length) / itemsPerPage)), p + 1))}
                  onLast={() => setCurrentPage(pagination?.total_pages ?? Math.max(1, Math.ceil((pagination?.total_items ?? filteredOrders.length) / itemsPerPage)))}
                  loading={loading}
                  onNavigateStart={() => setLoading(true)}
                />
              )}

        </>
      );
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
    </div>
  );
}
