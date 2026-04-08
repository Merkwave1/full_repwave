// Purchase Invoices Tab - filtered view of purchase orders (Ordered / Partially Received / Received only)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import PurchaseOrderListView from '../purchase-orders/PurchaseOrderListView';
import PurchaseOrderDetailsModal from '../purchase-orders/PurchaseOrderDetailsModal';
import UpdatePurchaseOrderForm from '../purchase-orders/UpdatePurchaseOrderForm';
import { getAppSuppliers, getAppWarehouses } from '../../../../../apis/auth';
import useCurrency from '../../../../../hooks/useCurrency';
import { getPurchaseOrdersPaginated, getPurchaseOrderDetails } from '../../../../../apis/purchase_orders';
import { isOdooIntegrationEnabled } from '../../../../../utils/odooIntegration';

const INCLUDED_STATUSES = new Set(['Ordered','Shipped','Partially Received','Received']);

export default function PurchaseInvoicesTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { symbol } = useCurrency();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState(null); // { current_page, limit, total_items, total_pages }
  
  // View state
  const [currentView, setCurrentView] = useState('list'); // 'list', 'details', 'edit'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [odooEnabled, setOdooEnabled] = useState(false);

  // Check if Odoo integration is enabled
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

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
        })) || []
      };
      
      // Get supplier and warehouse names
      const supplier = suppliers?.find(s => s.supplier_id == transformedOrder.purchase_order_supplier_id);
      const warehouse = warehouses?.find(w => w.warehouse_id == transformedOrder.purchase_order_warehouse_id);
      
      const supplierName = supplier ? supplier.supplier_name : 'غير محدد';
      const warehouseName = warehouse ? warehouse.warehouse_name : 'غير محدد';
      const formattedDate = new Date(transformedOrder.purchase_order_date).toLocaleDateString('ar-SA');
      
      // Calculate totals
      let subtotal = 0, totalDiscount = 0, totalTax = 0;
      
      const itemsForPrint = transformedOrder.items.map((item, index) => {
        const quantity = parseFloat(item.purchase_order_items_quantity || 0);
        const unitPrice = parseFloat(item.purchase_order_items_unit_price || 0);
        const discountAmount = parseFloat(item.purchase_order_items_discount_amount || 0);
        const taxRate = parseFloat(item.purchase_order_items_tax_rate || 0);
        const hasTax = item.purchase_order_items_has_tax === 1 || item.purchase_order_items_has_tax === '1';
        
        const itemSubtotal = quantity * unitPrice;
        const afterDiscount = itemSubtotal - discountAmount;
        const taxAmount = hasTax ? (afterDiscount * taxRate / 100) : 0;
        const total = afterDiscount + taxAmount;
        
        subtotal += itemSubtotal;
        totalDiscount += discountAmount;
        totalTax += taxAmount;
        
        return {
          serial: index + 1,
          name: item.display_name,
          packaging: item.packaging_type_name || 'غير محدد',
          quantity,
          unit_price: unitPrice,
          discount: discountAmount,
          tax_rate: taxRate,
          has_tax: hasTax,
          subtotal: itemSubtotal,
          tax_amount: taxAmount,
          total
        };
      });
      
      const grandTotal = subtotal - totalDiscount + totalTax;
      const currentDate = new Date();
      
      const printContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة شراء رقم #${transformedOrder.purchase_order_id}</title><style>
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
          <div class="header"><h1>فاتورة شراء رقم #${transformedOrder.purchase_order_id}</h1></div>
          <div class="order-info">
            <div class="info-section">
              <h3>معلومات الفاتورة</h3>
              <div class="info-row"><span class="info-label">رقم الفاتورة:</span><span>#${transformedOrder.purchase_order_id}</span></div>
              <div class="info-row"><span class="info-label">تاريخ الفاتورة:</span><span>${formattedDate}</span></div>
              <div class="info-row"><span class="info-label">حالة الفاتورة:</span><span>${transformedOrder.purchase_order_status}</span></div>
              <div class="info-row"><span class="info-label">المستودع:</span><span>${warehouseName}</span></div>
            </div>
            <div class="info-section">
              <h3>معلومات المورد</h3>
              <div class="info-row"><span class="info-label">اسم المورد:</span><span>${supplierName}</span></div>
              <div class="info-row"><span class="info-label">إجمالي الفاتورة:</span><span>${grandTotal.toFixed(2)} ${symbol}</span></div>
            </div>
          </div>
          ${itemsForPrint.length ? `<table class="items-table"><thead><tr><th>م</th><th>اسم المنتج</th><th>نوع التعبئة</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع الفرعي</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead><tbody>${itemsForPrint.map(i=>`<tr><td>${i.serial}</td><td>${i.name}</td><td>${i.packaging}</td><td>${i.quantity}</td><td>${i.unit_price.toFixed(2)} ${symbol}</td><td>${i.subtotal.toFixed(2)} ${symbol}</td><td>${i.discount.toFixed(2)} ${symbol}</td><td>${i.has_tax ? `${i.tax_rate}% (${i.tax_amount.toFixed(2)} ${symbol})` : 'بدون ضريبة'}</td><td>${i.total.toFixed(2)} ${symbol}</td></tr>`).join('')}</tbody></table>`: ''}
          <div class="totals-section">
            <h3 style="margin-bottom:15px;">ملخص المبالغ</h3>
            <div class="totals-row"><span>المجموع الفرعي:</span><span>${subtotal.toFixed(2)} ${symbol}</span></div>
            <div class="totals-row"><span>إجمالي الخصم:</span><span>${totalDiscount.toFixed(2)} ${symbol}</span></div>
            <div class="totals-row"><span>إجمالي الضريبة:</span><span>${totalTax.toFixed(2)} ${symbol}</span></div>
            <div class="totals-row grand-total"><span>المبلغ الإجمالي:</span><span>${grandTotal.toFixed(2)} ${symbol}</span></div>
          </div>
          ${transformedOrder.purchase_order_notes ? `<div class="status-section"><h3>ملاحظات الفاتورة</h3><p>${transformedOrder.purchase_order_notes}</p></div>` : ''}
          <div class="footer"><div class="signature-box"><div class="signature-label">توقيع المورد</div></div><div class="signature-box"><div class="signature-label">توقيع المستلم</div></div><div class="signature-box"><div class="signature-label">ختم الشركة</div></div></div>
          <div class="print-date">تم إنشاء هذه الفاتورة بتاريخ: ${currentDate.toLocaleDateString('ar-SA')} ${currentDate.toLocaleTimeString('ar-SA')}</div>
        </div>
      </body></html>`;
      
      const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(printContent, { title: 'تفاصيل فاتورة شراء', closeAfter: 700 });
      
      setGlobalMessage({ type: 'success', message: 'تم تحضير الطباعة بنجاح!' });
    } catch (error) {
      console.error('خطأ في الطباعة:', error);
      setGlobalMessage({ 
        type: 'error', 
        message: `فشل في طباعة الفاتورة: ${error.message}` 
      });
    }
  }, [suppliers, warehouses, setGlobalMessage, symbol]);

  const loadData = useCallback(async (forceApiRefresh=false) => {
    if (forceApiRefresh) setLoading(true);
    setError(null);
    try {
      const statusCSV = selectedStatusFilter ? selectedStatusFilter : Array.from(INCLUDED_STATUSES).join(',');
      const [ordersResp, suppliersData, warehousesData] = await Promise.all([
        getPurchaseOrdersPaginated({
          page: currentPage,
          limit: itemsPerPage,
          status: statusCSV,
          supplier_id: selectedSupplierFilter || undefined,
        }),
        getAppSuppliers(forceApiRefresh),
        getAppWarehouses(forceApiRefresh)
      ]);

      const extractedOrders = Array.isArray(ordersResp)
        ? ordersResp
        : (ordersResp?.data || ordersResp?.purchase_orders || []);
      const incomingPagination = ordersResp?.pagination || null;
      setPurchaseOrders(extractedOrders);
      setPagination(incomingPagination);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : warehousesData?.data || []);
      if (forceApiRefresh) setGlobalMessage({ type:'success', message:'تم تحديث فواتير الشراء.' });
    } catch (e) {
      const msg = e.message || 'فشل في تحميل فواتير الشراء';
      setError(msg);
      setGlobalMessage({ type:'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage, currentPage, itemsPerPage, selectedStatusFilter, selectedSupplierFilter]);

  // StrictMode guard against duplicate fetches
  const lastFetchKeyRef = useRef(null);
  useEffect(()=>{
    const key = `${currentPage}|${itemsPerPage}|${selectedStatusFilter||''}|${selectedSupplierFilter||''}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    loadData(false);
  }, [loadData, currentPage, itemsPerPage, selectedStatusFilter, selectedSupplierFilter]);

  useEffect(()=>{ const rh=()=>loadData(true); setChildRefreshHandler(rh); return ()=>setChildRefreshHandler(null); }, [setChildRefreshHandler, loadData]);

  const uniqueSuppliersForFilter = useMemo(()=>{
    const m=new Map();
    suppliers.forEach(s=>{ if(s && (s.supplier_id||s.id)) m.set(s.supplier_id||s.id, s.supplier_name||s.name); });
    return [['','كل الموردين'], ...Array.from(m.entries())];
  },[suppliers]);

  // Active chips to display in the FilterBar so users see currently applied filters
  const activeChips = useMemo(() => {
    const chips = [];

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
        onRemove: async () => { setSelectedStatusFilter(''); setCurrentPage(1); try { await loadData(true); } catch { /* ignore */ } }
      });
    }

    if (selectedSupplierFilter) {
      const found = uniqueSuppliersForFilter.find(opt => String(opt[0] ?? opt.value) === String(selectedSupplierFilter));
      const supplierLabel = found ? (Array.isArray(found) ? found[1] : found.label) : String(selectedSupplierFilter);
      chips.push({
        key: 'supplier',
        label: 'المورد',
        value: supplierLabel,
        tone: 'indigo',
        onRemove: async () => { setSelectedSupplierFilter(''); setCurrentPage(1); try { await loadData(true); } catch { /* ignore */ } }
      });
    }

    if (searchTerm && searchTerm.trim() !== '') {
      chips.push({
        key: 'search',
        label: 'بحث',
        value: searchTerm,
        tone: 'green',
        onRemove: async () => { setSearchTerm(''); setCurrentPage(1); try { await loadData(true); } catch { /* ignore */ } }
      });
    }

    return chips;
  }, [selectedStatusFilter, selectedSupplierFilter, searchTerm, uniqueSuppliersForFilter, loadData]);

  const filteredOrders = useMemo(()=>{
    let cur = Array.isArray(purchaseOrders)?[...purchaseOrders]:[];
    const term = searchTerm.trim().toLowerCase();
    if(term){
      cur = cur.filter(o =>
        o.supplier_name?.toLowerCase().includes(term) ||
        o.purchase_orders_status?.toLowerCase().includes(term) ||
        o.purchase_orders_notes?.toLowerCase().includes(term)
      );
    }
    if(selectedStatusFilter){ cur = cur.filter(o=>o.purchase_orders_status===selectedStatusFilter); }
    if(selectedSupplierFilter){ cur = cur.filter(o=>String(o.purchase_orders_supplier_id)===selectedSupplierFilter); }
    cur.sort((a,b)=>{ const da=new Date(a.purchase_orders_order_date||a.created_at||0).getTime(); const db=new Date(b.purchase_orders_order_date||b.created_at||0).getTime(); if(db!==da) return db-da; return (b.purchase_orders_id||0)-(a.purchase_orders_id||0); });
    return cur;
  },[purchaseOrders, searchTerm, selectedStatusFilter, selectedSupplierFilter]);

  return (
    <div className="p-4" dir="rtl">
      <CustomPageHeader
        title="فواتير الشراء"
        subtitle="قائمة فواتير الشراء وإدارتها"
        statValue={pagination?.total_items ?? filteredOrders.length}
        statLabel="إجمالي الفواتير"
        actionButton={null}
      />

      <FilterBar
        title="بحث وفلاتر فواتير الشراء"
        searchConfig={{
          placeholder: 'ابحث عن فاتورة...',
          value: searchTerm,
          onChange: (v) => setSearchTerm(v),
          onClear: () => { setSearchTerm(''); setCurrentPage(1); },
          searchWhileTyping: false,
          onSubmit: async (v) => { setSearchTerm(v); setCurrentPage(1); try { await loadData(true); } catch { /* ignore */ } },
          showApplyButton: true,
          applyLabel: 'تطبيق'
        }}
        selectFilters={[
          { key: 'status', label: 'الحالة', value: selectedStatusFilter, onChange: async (v) => { setSelectedStatusFilter(v); setCurrentPage(1); try { await loadData(true); } catch { /* ignore */ } }, options: [ { value: '', label: 'كل الحالات' }, { value: 'Ordered', label: 'Ordered' }, { value: 'Partially Received', label: 'Partially Received' }, { value: 'Received', label: 'Received' } ] },
          { key: 'supplier', label: 'المورد', value: selectedSupplierFilter, onChange: async (v) => { setSelectedSupplierFilter(v); setCurrentPage(1); try { await loadData(true); } catch { /* ignore */ } }, options: uniqueSuppliersForFilter.map(([id,name])=>({ value: String(id), label: name })) },
        ]}
    activeChips={activeChips}
  onClearAll={async () => { setSelectedStatusFilter(''); setSelectedSupplierFilter(''); setSearchTerm(''); setCurrentPage(1); try { await loadData(true); } catch { /* ignore */ } }}
      />

      {loading && currentView === 'list' && <Loader className="mt-8" />}
      {error && <Alert message={error} type="error" className="mb-4" />}

      {(!loading || currentView !== 'list') && !error && (
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

      {(!loading || currentView !== 'list') && !error && (
        <PurchaseOrderListView
          purchaseOrders={filteredOrders}
          loading={loading}
          error={error}
          onEdit={order => {
            setSelectedOrder(order);
            setCurrentView('edit');
          }}
          onViewDetails={handleViewDetails}
          onPrint={handlePrint}
          suppliers={suppliers}
          warehouses={warehouses}
          odooEnabled={odooEnabled}
        />
      )}

      {/* Details Modal */}
      {currentView === 'details' && selectedOrder && (
        <PurchaseOrderDetailsModal
          isOpen
          purchaseOrder={selectedOrder}
          onClose={() => {
            setCurrentView('list');
            setSelectedOrder(null);
          }}
          onEdit={() => setCurrentView('edit')}
          suppliers={suppliers}
          warehouses={warehouses}
        />
      )}

      {/* Edit Form Modal */}
      {currentView === 'edit' && selectedOrder && (
        <UpdatePurchaseOrderForm
          order={selectedOrder}
          onClose={() => {
            setCurrentView('list');
            setSelectedOrder(null);
          }}
          onUpdate={(updatedOrder) => {
            // Update the order in the list
            setPurchaseOrders(prev => 
              prev.map(o => 
                o.purchase_orders_id === updatedOrder.purchase_orders_id 
                  ? updatedOrder 
                  : o
              )
            );
            setCurrentView('list');
            setSelectedOrder(null);
            setGlobalMessage({ type: 'success', message: 'تم تحديث الفاتورة بنجاح' });
          }}
          suppliers={suppliers}
          warehouses={warehouses}
        />
      )}

      {(!loading || currentView !== 'list') && !error && (()=>{ const tp = itemsPerPage>0 ? Math.max(1, Math.ceil((pagination?.total_items||0)/itemsPerPage)) : 1; return (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm md:text-base text-gray-700">
            إجمالي الفواتير: <span className="font-semibold text-blue-600">{pagination?.total_items ?? filteredOrders.length}</span>
            {(pagination?.total_items ?? filteredOrders.length) > 0 && (
              <>
                <span className="mx-2">•</span>
                صفحة <span className="font-semibold">{currentPage}</span> من <span className="font-semibold">{tp}</span>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 whitespace-nowrap">عدد العناصر:</label>
              <select
                value={itemsPerPage}
                onChange={e => { setCurrentPage(1); setItemsPerPage(Number(e.target.value)); }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[10,20,50,100].map(n => (<option key={n} value={n}>{n}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
                <button type="button" title="الأولى" onClick={()=>setCurrentPage(1)} disabled={currentPage===1} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronDoubleRightIcon className="h-5 w-5" />
                </button>
                <button type="button" title="السابق" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage<=1} className="px-2 py-1.5 text-sm border-r border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50">{currentPage}<span className="mx-1 text-gray-400">/</span>{tp}</span>
                <button type="button" title="التالي" onClick={()=>setCurrentPage(p=>Math.min(tp,p+1))} disabled={currentPage>=tp} className="px-2 py-1.5 text-sm border-l border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button type="button" title="الأخيرة" onClick={()=>setCurrentPage(tp)} disabled={currentPage===tp} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronDoubleLeftIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ); })()}
    </div>
  );
}
