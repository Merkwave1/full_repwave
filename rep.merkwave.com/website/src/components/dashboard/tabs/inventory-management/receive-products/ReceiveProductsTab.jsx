// src/components/dashboard/tabs/inventory-management/receive-products/ReceiveProductsTab.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getAppPendingPurchaseOrdersForReceive } from '../../../../../apis/auth';
import { addGoodsReceipt } from '../../../../../apis/goods_receipts'; // UPDATED: Import the new API function
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
// NOTE: Removed heroicons for simpler design
import { format } from 'date-fns';
import { InboxArrowDownIcon } from '@heroicons/react/24/outline';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';

// Pagination Component (kept minimal styles)
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };
  
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">السابق</button>
      
      {getPageNumbers().map(page => (
        <button key={page} onClick={() => onPageChange(page)} className={`px-3 py-1 text-sm rounded-md ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
      ))}
      
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">التالي</button>
    </div>
  );
};

// Removed StatusBadge for simplicity

export default function ReceiveProductsTab() {
  const { setGlobalMessage } = useOutletContext();

  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    const n = Number(val);
    if (Number.isNaN(n)) return val;
    const hasDecimal = Math.abs(n - Math.trunc(n)) > 0;
    return hasDecimal ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toLocaleString('en-US');
  };
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [quantitiesToReceive, setQuantitiesToReceive] = useState({});
  const [receiptDetails, setReceiptDetails] = useState({});
  const [productionDates, setProductionDates] = useState({});
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // Only fetch pending orders from API, load other data from localStorage
      const ordersData = await getAppPendingPurchaseOrdersForReceive(forceRefresh);

      // Load suppliers, products, and warehouses from localStorage only
      let warehousesData = [];
      let productsData = [];
      let suppliersData = [];

      try {
        const warehousesRaw = JSON.parse(localStorage.getItem('appWarehouses') || '[]');
        warehousesData = Array.isArray(warehousesRaw) ? warehousesRaw : warehousesRaw?.data || [];
      } catch (e) {
        console.warn('Failed to load warehouses from localStorage:', e);
        warehousesData = [];
      }

      try {
        const productsRaw = JSON.parse(localStorage.getItem('appProducts') || '[]');
        productsData = Array.isArray(productsRaw) ? productsRaw : productsRaw?.data || [];
      } catch (e) {
        console.warn('Failed to load products from localStorage:', e);
        productsData = [];
      }

      try {
        const suppliersRaw = JSON.parse(localStorage.getItem('appSuppliers') || '[]');
        suppliersData = Array.isArray(suppliersRaw) ? suppliersRaw : suppliersRaw?.data || [];
      } catch (e) {
        console.warn('Failed to load suppliers from localStorage:', e);
        suppliersData = [];
      }

      setWarehouses(warehousesData || []);
      setProducts(productsData || []);
      setSuppliers(suppliersData || []);

      // The caching layer returns the data directly as an array, not nested
      const allOrders = Array.isArray(ordersData) ? ordersData : 
                       Array.isArray(ordersData?.data?.purchase_orders) ? ordersData.data.purchase_orders : [];


      // Sort by order date (new to old); tie-break by ID (newer ID first)
      const sortedOrders = [...allOrders].sort((a, b) => {
        const da = new Date(a.purchase_orders_order_date || a.created_at || 0).getTime();
        const db = new Date(b.purchase_orders_order_date || b.created_at || 0).getTime();
        if (db !== da) return db - da; // newer date first
        return (b.purchase_orders_id || 0) - (a.purchase_orders_id || 0); // newer ID first
      });

      // Since API already filters, we can directly use the data
      const pendingOrdersData = sortedOrders.map(order => ({
        ...order,
        items: (order.items || []).map(item => ({
          ...item,
          quantity_pending: parseFloat(item.quantity_pending || 0),
          quantity_returned: parseFloat(item.purchase_order_items_quantity_returned || 0)
        }))
      }));

      setPendingOrders(pendingOrdersData);

    } catch (e) {
      setError(e.message || 'Failed to load data.');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات اللازمة.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    // Always force refresh on mount to ensure latest pending orders (requirement: force refresh each entry)
    loadData(true);
    
    // Don't register refresh handler to avoid triggering notifications fetch
    // if (setChildRefreshHandler) {
    //     setChildRefreshHandler(() => () => loadData(true));
    // }
    // return () => {
    //     if(setChildRefreshHandler) {
    //         setChildRefreshHandler(null);
    //     }
    // }
  }, [loadData]);

  // Helper functions
  const formatDateTime = (date) => {
    if (!date) return '';
    return format(new Date(date), 'dd/MM/yyyy HH:mm');
  };

  const getWarehouseNameById = useCallback((warehouseId) => {
    if (!Array.isArray(warehouses)) return 'مخزن غير معروف';
    const warehouse = warehouses.find(w => w.warehouse_id === warehouseId);
    return warehouse ? warehouse.warehouse_name : 'مخزن غير معروف';
  }, [warehouses]);

  const getSupplierNameById = useCallback((supplierId) => {
    if (!Array.isArray(suppliers)) return 'مورد غير معروف';
    const supplier = suppliers.find(s => s.supplier_id === supplierId);
    return supplier ? supplier.supplier_name : 'مورد غير معروف';
  }, [suppliers]);

  const getProductNameById = useCallback((variantId) => {
    if (!Array.isArray(products)) return 'منتج غير معروف';
    for (const product of products) {
      const variant = product.variants?.find(v => String(v.variant_id) === String(variantId));
      if (variant) {
        return variant.variant_name ? `${product.products_name} - ${variant.variant_name}` : product.products_name;
      }
    }
    return 'منتج غير معروف';
  }, [products]);

  // Filter and pagination logic
  const filteredAndSortedOrders = useMemo(() => {
    let ordersArray = Array.isArray(pendingOrders) ? [...pendingOrders] : [];

    // Normalize (SearchableSelect may return primitive or { value, label })
    const supplierFilter = selectedSupplier && typeof selectedSupplier === 'object' ? selectedSupplier.value : selectedSupplier;
    const warehouseFilter = selectedWarehouse && typeof selectedWarehouse === 'object' ? selectedWarehouse.value : selectedWarehouse;

    // Text search (id or supplier name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      ordersArray = ordersArray.filter(order => {
        const idMatch = order.purchase_orders_id.toString().includes(term);
        const supplierName = getSupplierNameById(order.purchase_orders_supplier_id) || '';
        const supplierMatch = supplierName.toLowerCase().includes(term);
        return idMatch || supplierMatch;
      });
    }

    if (warehouseFilter) {
      ordersArray = ordersArray.filter(order => String(order.purchase_orders_warehouse_id) === String(warehouseFilter));
    }

    if (supplierFilter) {
      ordersArray = ordersArray.filter(order => String(order.purchase_orders_supplier_id) === String(supplierFilter));
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      ordersArray = ordersArray.filter(order => new Date(order.purchase_orders_order_date) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      // Add end of day to include the entire dateTo day
      to.setHours(23,59,59,999);
      ordersArray = ordersArray.filter(order => new Date(order.purchase_orders_order_date) <= to);
    }

    // Sort newest first (date desc, then ID desc)
    ordersArray.sort((a, b) => {
      const da = new Date(a.purchase_orders_order_date || a.created_at || 0).getTime();
      const db = new Date(b.purchase_orders_order_date || b.created_at || 0).getTime();
      if (db !== da) return db - da;
      return (b.purchase_orders_id || 0) - (a.purchase_orders_id || 0);
    });
    return ordersArray;
  }, [pendingOrders, searchTerm, selectedWarehouse, selectedSupplier, dateFrom, dateTo, getSupplierNameById]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedOrders, currentPage, itemsPerPage]);

  // Clear filters function
  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedSupplier('');
    setSelectedWarehouse('');
    setCurrentPage(1);
  };

  // FilterBar configuration
  const selectFilters = useMemo(() => [
    {
      key: 'supplier',
      label: 'المورد',
      value: selectedSupplier,
      onChange: setSelectedSupplier,
      placeholder: 'اختر المورد...',
      options: [
        { value: '', label: 'جميع الموردين' },
        ...suppliers.map(supplier => ({
          value: supplier.supplier_id.toString(),
          label: supplier.supplier_name
        }))
      ]
    },
    {
      key: 'warehouse',
      label: 'المخزن',
      value: selectedWarehouse,
      onChange: setSelectedWarehouse,
      placeholder: 'اختر المخزن...',
      options: [
        { value: '', label: 'جميع المخازن' },
        ...warehouses.map(warehouse => ({
          value: warehouse.warehouse_id.toString(),
          label: warehouse.warehouse_name
        }))
      ]
    }
  ], [selectedSupplier, suppliers, selectedWarehouse, warehouses]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedSupplier) {
      const supplier = suppliers.find(s => s.supplier_id.toString() === selectedSupplier);
      chips.push({
        key: 'supplier',
        label: `المورد: ${supplier?.supplier_name || 'غير محدد'}`
      });
    }
    if (selectedWarehouse) {
      const warehouse = warehouses.find(w => w.warehouse_id.toString() === selectedWarehouse);
      chips.push({
        key: 'warehouse',
        label: `المخزن: ${warehouse?.warehouse_name || 'غير محدد'}`
      });
    }
    if (dateFrom || dateTo) {
      const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '');
      const label = dateFrom && dateTo ? `${fmt(dateFrom)} - ${fmt(dateTo)}` : (dateFrom ? `من ${fmt(dateFrom)}` : `إلى ${fmt(dateTo)}`);
      chips.push({
        key: 'dateRange',
        label: `التاريخ: ${label}`
      });
    }
    return chips;
  }, [selectedSupplier, suppliers, selectedWarehouse, warehouses, dateFrom, dateTo]);

  const handleClearAll = () => {
    clearFilters();
  };

  const makeItemKey = (orderId, itemId) => `${orderId}-${itemId}`;

  const keepEntriesForOrder = (obj, orderId) => {
    if (!obj) return {};
    const prefix = `${String(orderId)}-`;
    return Object.fromEntries(
      Object.entries(obj).filter(([key]) => key.startsWith(prefix))
    );
  };

  const keepOrderDetails = (details, orderId) => {
    const orderKey = String(orderId);
    if (!details || !details[orderKey]) {
      return {};
    }
    return { [orderKey]: details[orderKey] };
  };

  const hasSelectionsForOrder = (quantitiesMap, orderId) => {
    const prefix = `${String(orderId)}-`;
    return Object.entries(quantitiesMap || {}).some(
      ([key, value]) => key.startsWith(prefix) && parseFloat(value || 0) > 0
    );
  };

  const getQuantityForItem = useCallback((orderId, itemId) => {
    const key = makeItemKey(orderId, itemId);
    return parseFloat(quantitiesToReceive[key] || 0);
  }, [quantitiesToReceive]);

  const getProductionDateForItem = useCallback((orderId, itemId) => {
    const key = makeItemKey(orderId, itemId);
    return productionDates[key] || '';
  }, [productionDates]);

  const getProductUnitById = useCallback((variantId) => {
    if (!Array.isArray(products)) return 'قطعة';
    for (const product of products) {
      const variant = product.variants?.find(v => String(v.variant_id) === String(variantId));
      if (variant && product) {
        // Return the product's unit or 'قطعة' as default
        return product.products_unit || 'قطعة';
      }
    }
    return 'قطعة';
  }, [products]);

  const printReceiptDocument = useCallback((order) => {
    if (activeOrderId !== null && activeOrderId !== order.purchase_orders_id) {
      setGlobalMessage({ type: 'warning', message: 'يرجى إكمال أو إلغاء تحديد الأمر الحالي قبل طباعة أمر مختلف.' });
      return;
    }

    const supplier = Array.isArray(suppliers) ? suppliers.find(s => s.supplier_id === order.purchase_orders_supplier_id) : null;
    const warehouse = Array.isArray(warehouses) ? warehouses.find(w => w.warehouse_id === order.purchase_orders_warehouse_id) : null;

    const itemsToReceive = order.items.filter(item => getQuantityForItem(order.purchase_orders_id, item.purchase_order_items_id) > 0);

    if (itemsToReceive.length === 0) {
      setGlobalMessage({ type: 'error', message: 'يرجى اختيار كميات للاستلام قبل الطباعة' });
      return;
    }

    const getVariantDetails = (variantId) => {
      if (!Array.isArray(products)) {
        return { sku: variantId, packaging: getProductUnitById(variantId) };
      }
      for (const product of products) {
        const variant = product.variants?.find(v => String(v.variant_id) === String(variantId));
        if (variant) {
          return {
            sku: variant.variant_sku || variant.sku || variant.code || variant.variant_code || variantId,
            packaging: variant.packaging_type_name || variant.packaging || variant.packaging_type || getProductUnitById(variantId)
          };
        }
      }
      return { sku: variantId, packaging: getProductUnitById(variantId) };
    };
  const itemsForPrint = itemsToReceive.map((item, index) => {
      // Show only the variant name if available, otherwise fallback to product name
      const name = item.variant_name || item.products_name || getProductNameById(item.purchase_order_items_variant_id);
      const variantDetails = getVariantDetails(item.purchase_order_items_variant_id);
      const quantity = getQuantityForItem(order.purchase_orders_id, item.purchase_order_items_id);
      const packaging = item.packaging_types_name || item.base_units_name || variantDetails.packaging;
      const productionDate = getProductionDateForItem(order.purchase_orders_id, item.purchase_order_items_id);
      return {
        index: index + 1,
        name,
        sku: variantDetails.sku,
        packaging,
        quantity,
        production_date: productionDate
      };
    });

  const currentDate = new Date();
  const receiptDate = currentDate;

    const printHtml = `<!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>إيصال استلام بضائع - أمر شراء #${order.purchase_orders_id}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; margin: 0; padding: 25px; background: #fff; color: #000; }
        .receipt-container { max-width: 900px; margin: 0 auto; border: 2px solid #000; padding: 25px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 0; }
        .receipt-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-section { border: 1px solid #000; padding: 15px; }
        .info-section h3 { margin: 0 0 10px 0; font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .info-label { font-weight: bold; min-width: 110px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #000; }
        th, td { border: 1px solid #000; padding: 10px 8px; text-align: right; font-size: 13px; }
        th { background: #f0f0f0; font-weight: bold; }
        tbody tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; text-align: center; }
        .signature-box { border: 1px solid #000; padding: 15px; height: 80px; }
        .signature-label { font-weight: bold; margin-bottom: 10px; }
        .notes { border: 1px solid #000; padding: 15px; margin-bottom: 30px; }
        .notes h3 { margin: 0 0 8px 0; font-size: 15px; }
        .print-date { text-align: center; margin-top: 25px; font-size: 12px; color: #555; }
        @media print { body { margin:0; padding:10px; background:#fff; } .receipt-container { border:none; padding:0; } }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>إيصال استلام بضائع</h1>
        </div>
        <div class="receipt-info">
          <div class="info-section">
            <h3>معلومات أمر الشراء</h3>
            <div class="info-row"><span class="info-label">رقم الأمر:</span><span>#${order.purchase_orders_id}</span></div>
            <div class="info-row"><span class="info-label">تاريخ الأمر:</span><span>${new Date(order.purchase_orders_order_date).toLocaleDateString('ar-EG')}</span></div>
            <div class="info-row"><span class="info-label">تاريخ الاستلام:</span><span>${new Date(receiptDate).toLocaleDateString('ar-EG')}</span></div>
          </div>
          <div class="info-section">
            <h3>معلومات المورد / المخزن</h3>
            <div class="info-row"><span class="info-label">المورد:</span><span>${supplier?.supplier_name || 'غير محدد'}</span></div>
            <div class="info-row"><span class="info-label">الهاتف:</span><span>${supplier?.supplier_phone || 'غير محدد'}</span></div>
            <div class="info-row"><span class="info-label">المخزن:</span><span>${warehouse?.warehouse_name || 'غير محدد'}</span></div>
          </div>
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th>م</th>
              <th>المنتج</th>
              <th>كود المنتج</th>
              <th>نوع التعبئة</th>
              <th>الكمية المستلمة</th>
              <th>تاريخ الانتاج</th>
            </tr>
          </thead>
          <tbody>
            ${itemsForPrint.map(item => `
              <tr>
                <td>${item.index}</td>
                <td>${item.name}</td>
                <td>${item.sku}</td>
                <td>${item.packaging}</td>
                <td>${formatNumber(item.quantity)}</td>
                <td>${item.production_date ? new Date(item.production_date).toLocaleDateString('ar-EG') : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${receiptDetails[order.purchase_orders_id]?.notes ? `
          <div class="notes">
            <h3>ملاحظات الاستلام</h3>
            <p>${receiptDetails[order.purchase_orders_id]?.notes}</p>
          </div>` : ''}
        <div class="footer">
          <div class="signature-box"><div class="signature-label">توقيع أمين المخزن</div></div>
          <div class="signature-box"><div class="signature-label">توقيع المورد</div></div>
          <div class="signature-box"><div class="signature-label">ختم الشركة</div></div>
        </div>
        <div class="print-date">تم إنشاء هذا الإيصال بتاريخ: ${currentDate.toLocaleDateString('ar-EG')} ${currentDate.toLocaleTimeString('ar-EG')}</div>
      </div>
  </body>
  </html>`;

  const doPrint = async () => {
      try {
  const { printHtml: printHtmlUtil } = await import('../../../../../utils/printUtils.js');
    const ok = await printHtmlUtil(printHtml, { title: 'إيصال استلام بضائع', closeAfter: 700 });
        if (!ok) {
          setGlobalMessage({ type: 'error', message: 'فشل في طباعة الإيصال. يرجى السماح بالنوافذ المنبثقة.' });
        }
      } catch (e) {
        console.error('print error', e);
        setGlobalMessage({ type: 'error', message: 'فشل في طباعة الإيصال.' });
      }
    };
    doPrint();
  }, [activeOrderId, suppliers, warehouses, products, receiptDetails, getQuantityForItem, getProductionDateForItem, getProductNameById, getProductUnitById, setGlobalMessage]);

  const handleItemToggle = (order, item, shouldSelect) => {
    const orderId = order.purchase_orders_id;
    const itemId = item.purchase_order_items_id;
    const itemKey = makeItemKey(orderId, itemId);
    const remaining = parseFloat(item.quantity_pending || 0);
    const defaultProductionDate = new Date().toISOString().split('T')[0];

    let nextQuantities = {};
    setQuantitiesToReceive(prev => {
      const base = keepEntriesForOrder(prev, orderId);
      if (shouldSelect && remaining > 0) {
        base[itemKey] = base[itemKey] ?? remaining.toString();
      } else {
        delete base[itemKey];
      }
      nextQuantities = base;
      return base;
    });

    setProductionDates(prev => {
      const base = keepEntriesForOrder(prev, orderId);
      if (shouldSelect && remaining > 0) {
        if (!base[itemKey]) {
          base[itemKey] = prev[itemKey] || defaultProductionDate;
        }
      } else {
        delete base[itemKey];
      }
      return base;
    });

    const stillHas = hasSelectionsForOrder(nextQuantities, orderId);

    setReceiptDetails(prev => {
      const base = keepOrderDetails(prev, orderId);
      const orderKey = String(orderId);
      if (stillHas) {
        base[orderKey] = prev[orderKey] || base[orderKey] || {};
      } else {
        delete base[orderKey];
      }
      return base;
    });

    setActiveOrderId(stillHas ? orderId : null);
  };

  const handleQuantityChange = (order, item, rawValue) => {
    const orderId = order.purchase_orders_id;
    const itemId = item.purchase_order_items_id;

    if (activeOrderId !== null && activeOrderId !== orderId) {
      setGlobalMessage({ type: 'warning', message: 'يرجى إكمال أو إلغاء تحديد الأمر الحالي قبل تعديل أمر مختلف.' });
      return;
    }

    const itemKey = makeItemKey(orderId, itemId);
    const numericValue = parseFloat(rawValue || 0);
    let nextQuantities = {};

    setQuantitiesToReceive(prev => {
      const base = keepEntriesForOrder(prev, orderId);
      if (!Number.isNaN(numericValue) && numericValue > 0) {
        base[itemKey] = rawValue;
      } else {
        delete base[itemKey];
      }
      nextQuantities = base;
      return base;
    });

    if (!Number.isNaN(numericValue) && numericValue > 0) {
      setProductionDates(prev => {
        const base = keepEntriesForOrder(prev, orderId);
        if (!base[itemKey]) {
          base[itemKey] = prev[itemKey] || new Date().toISOString().split('T')[0];
        }
        return base;
      });
      setReceiptDetails(prev => keepOrderDetails(prev, orderId));
      setActiveOrderId(orderId);
    } else {
      setProductionDates(prev => {
        const base = keepEntriesForOrder(prev, orderId);
        delete base[itemKey];
        return base;
      });
      const stillHas = hasSelectionsForOrder(nextQuantities, orderId);
      if (!stillHas) {
        setReceiptDetails(prev => {
          const base = keepOrderDetails(prev, orderId);
          delete base[String(orderId)];
          return base;
        });
        setActiveOrderId(null);
      }
    }
  };

  const handleProductionDateChange = (order, item, value) => {
    const orderId = order.purchase_orders_id;
    const itemId = item.purchase_order_items_id;

    if (activeOrderId !== null && activeOrderId !== orderId) {
      setGlobalMessage({ type: 'warning', message: 'يرجى إكمال أو إلغاء تحديد الأمر الحالي قبل تعديل أمر مختلف.' });
      return;
    }

    const itemKey = makeItemKey(orderId, itemId);
    setProductionDates(prev => {
      const base = keepEntriesForOrder(prev, orderId);
      if (value) {
        base[itemKey] = value;
      } else {
        delete base[itemKey];
      }
      return base;
    });
  };

  const handleToggleOrderSelection = (order, shouldSelect) => {
    const orderId = order.purchase_orders_id;
    const defaultProductionDate = new Date().toISOString().split('T')[0];

    let nextQuantities = {};
    setQuantitiesToReceive(prev => {
      const base = keepEntriesForOrder(prev, orderId);
      if (shouldSelect) {
        order.items.forEach(item => {
          const remaining = parseFloat(item.quantity_pending || 0);
          const key = makeItemKey(orderId, item.purchase_order_items_id);
          if (remaining > 0) {
            base[key] = remaining.toString();
          } else {
            delete base[key];
          }
        });
      } else {
        order.items.forEach(item => {
          delete base[makeItemKey(orderId, item.purchase_order_items_id)];
        });
      }
      nextQuantities = base;
      return base;
    });

    setProductionDates(prev => {
      const base = keepEntriesForOrder(prev, orderId);
      if (shouldSelect) {
        order.items.forEach(item => {
          const key = makeItemKey(orderId, item.purchase_order_items_id);
          const remaining = parseFloat(item.quantity_pending || 0);
          if (remaining > 0) {
            if (!base[key]) {
              base[key] = prev[key] || defaultProductionDate;
            }
          } else {
            delete base[key];
          }
        });
      } else {
        order.items.forEach(item => {
          delete base[makeItemKey(orderId, item.purchase_order_items_id)];
        });
      }
      return base;
    });

    const stillHas = hasSelectionsForOrder(nextQuantities, orderId);

    setReceiptDetails(prev => {
      const base = keepOrderDetails(prev, orderId);
      const orderKey = String(orderId);
      if (stillHas) {
        base[orderKey] = prev[orderKey] || base[orderKey] || {};
      } else {
        delete base[orderKey];
      }
      return base;
    });

    setActiveOrderId(stillHas ? orderId : null);
  };

  const handleReceiptDetailChange = (orderId, field, value) => {
    if (activeOrderId !== null && activeOrderId !== orderId) {
      setGlobalMessage({ type: 'warning', message: 'يرجى إكمال أو إلغاء تحديد الأمر الحالي قبل تعديل أمر مختلف.' });
      return;
    }

    const orderKey = String(orderId);
    setReceiptDetails(prev => {
      const base = keepOrderDetails(prev, orderId);
      base[orderKey] = {
        ...(base[orderKey] || {}),
        [field]: value,
      };
      return base;
    });
  };

  const handleSubmitReceiving = async (orderId) => {
    setIsSubmitting(true);
    setGlobalMessage({ type: 'info', message: 'جاري تسجيل الاستلام...' });

    const order = pendingOrders.find(order => order.purchase_orders_id === orderId);
    if (!order) {
        setGlobalMessage({ type: 'error', message: 'لم يتم العثور على الطلب.' });
        setIsSubmitting(false);
        return;
    }

    if (activeOrderId !== null && activeOrderId !== orderId) {
      setGlobalMessage({ type: 'warning', message: 'يرجى إكمال أو إلغاء تحديد الأمر الحالي قبل استلام أمر مختلف.' });
      setIsSubmitting(false);
      return;
    }

    const itemsToSubmit = order.items
      .map(item => ({
        po_item_id: item.purchase_order_items_id,
        quantity: getQuantityForItem(orderId, item.purchase_order_items_id),
        production_date: getProductionDateForItem(orderId, item.purchase_order_items_id) || new Date().toISOString().split('T')[0]
      }))
      .filter(item => item.quantity > 0);

    if (itemsToSubmit.length === 0) {
      setGlobalMessage({ type: 'warning', message: 'الرجاء إدخال الكميات المراد استلامها.' });
      setIsSubmitting(false);
      return;
    }
    
  const details = receiptDetails[orderId] || {};
  // Server will set the receipt datetime to current server time; do not send receipt_date so backend can use NOW().
  const notes = details.notes || '';

  const receiptData = {
    warehouse_id: order.purchase_orders_warehouse_id,
    items: itemsToSubmit,
    notes,
  };

    try {
      // UPDATED: Use the new addGoodsReceipt function
      const message = await addGoodsReceipt(receiptData);
      setGlobalMessage({ type: 'success', message });
      
      setQuantitiesToReceive(prev => {
        const updated = { ...prev };
        order.items.forEach(item => {
          delete updated[makeItemKey(orderId, item.purchase_order_items_id)];
        });
        return updated;
      });

      setProductionDates(prev => {
        const updated = { ...prev };
        order.items.forEach(item => {
          delete updated[makeItemKey(orderId, item.purchase_order_items_id)];
        });
        return updated;
      });

      setReceiptDetails(prev => {
        const updated = { ...prev };
        delete updated[String(orderId)];
        return updated;
      });

      setActiveOrderId(null);
      
      await loadData(true);
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في تسجيل الاستلام.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <div className="p-4" dir="rtl">
      {/* Header */}
      <CustomPageHeader
        title="استلام المنتجات"
        subtitle="قائمة أوامر الشراء الجاهزة للاستلام — حدّد الكميات ثم اضغط 'استلام' لتحديث المخزون وطباعة الإيصال"
        icon={<InboxArrowDownIcon className="h-8 w-8 text-white" />}
        statValue={filteredAndSortedOrders.length}
        statLabel="عدد الأوامر"
      />

      {/* Filters */}
      <FilterBar
        searchConfig={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "رقم الطلب، اسم المورد..."
        }}
        selectFilters={selectFilters}
        activeChips={activeChips}
        onClearAll={handleClearAll}
        dateRangeConfig={{
          from: dateFrom,
          to: dateTo,
          onChange: (from, to) => {
            setDateFrom(from);
            setDateTo(to);
          },
          onClear: () => {
            setDateFrom('');
            setDateTo('');
          }
        }}
        className="mt-4 mb-6"
      />

      <div className="space-y-4">
        {/* Empty State */}
        {filteredAndSortedOrders.length === 0 && !loading && (
          <div className="border border-gray-200 rounded-xl shadow-sm p-6 text-center bg-white text-sm text-gray-600">
            لا توجد بيانات مطابقة.
          </div>
        )}

        {/* Orders List */}
        {paginatedOrders.map(order => {
          const orderId = order.purchase_orders_id;
          const hasSelectedItems = order.items.some(item => getQuantityForItem(orderId, item.purchase_order_items_id) > 0);
          const selectableItems = order.items.filter(item => parseFloat(item.quantity_pending || 0) > 0);
          const anySelectableSelected = selectableItems.some(item => getQuantityForItem(orderId, item.purchase_order_items_id) > 0);
          return (
            <div key={orderId} className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 md:p-4 space-y-3">
              <div className="flex flex-wrap gap-4 text-xs text-gray-700">
                <span className="font-semibold">أمر #{orderId}</span>
                <span>التاريخ: {formatDateTime(order.purchase_orders_order_date)}</span>
                <span>المورد: {getSupplierNameById(order.purchase_orders_supplier_id)}</span>
                <span>المخزن: {getWarehouseNameById(order.purchase_orders_warehouse_id)}</span>
                {selectableItems.length > 0 && (
                  <div className="ms-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleOrderSelection(order, true)}
                      className="border border-gray-300 bg-white px-3 py-1 rounded hover:bg-gray-100"
                    >تحديد الأمر بالكامل</button>
                    {anySelectableSelected && (
                      <button
                        type="button"
                        onClick={() => handleToggleOrderSelection(order, false)}
                        className="border border-gray-300 bg-white px-3 py-1 rounded hover:bg-gray-100"
                      >إلغاء التحديد</button>
                    )}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 text-xs">
                  <thead className="bg-gray-50">
                      <tr className="[&>th]:border [&>th]:p-2">
                      <th>تحديد</th>
                      <th>المنتج</th>
                      <th>التعبئة</th>
                      <th>مطلوبة</th>
                      <th>مستلمة</th>
                      <th>مرتجعة</th>
                      <th>متبقي</th>
                      <th>استلام</th>
                      <th>تاريخ الانتاج</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map(item => {
                      const receivedQuantity = parseFloat(item.purchase_order_items_quantity_received || 0);
                      const totalQuantity = parseFloat(item.purchase_order_items_quantity_ordered || 0);
                      const remainingQuantity = parseFloat(item.quantity_pending || 0);
                      const itemKey = makeItemKey(orderId, item.purchase_order_items_id);
                      const rawQuantity = quantitiesToReceive[itemKey] ?? '';
                      const isReceiving = parseFloat(rawQuantity || 0) > 0;
                      return (
                        <tr key={item.purchase_order_items_id} className="[&>td]:border [&>td]:p-1 hover:bg-gray-50">
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={isReceiving}
                              onChange={(e) => handleItemToggle(order, item, e.target.checked)}
                              disabled={remainingQuantity <= 0}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="whitespace-nowrap max-w-[190px] truncate">
                            {item.variant_name ? `${item.products_name} - ${item.variant_name}` : item.products_name || getProductNameById(item.purchase_order_items_variant_id)}
                          </td>
                          <td className="text-center">{item.packaging_types_name || item.base_units_name || getProductUnitById(item.purchase_order_items_variant_id)}</td>
                          <td className="text-center font-semibold">{formatNumber(totalQuantity)}</td>
                          <td className="text-center">{formatNumber(receivedQuantity)}</td>
                          <td className="text-center">{formatNumber(parseFloat(item.purchase_order_items_quantity_returned || 0))}</td>
                          <td className="text-center font-semibold">{formatNumber(remainingQuantity)}</td>
                          <td className="text-center">
                            <NumberInput
                              value={rawQuantity}
                              onChange={(val) => handleQuantityChange(order, item, val)}
                              disabled={!isReceiving || remainingQuantity <= 0}
                              className="w-14 text-center border px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="date"
                              value={getProductionDateForItem(orderId, item.purchase_order_items_id)}
                              onChange={(e) => handleProductionDateChange(order, item, e.target.value)}
                              className="border px-2 py-1 rounded"
                              disabled={!isReceiving}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasSelectedItems && (
                <div className="border rounded p-3 bg-gray-50 space-y-2">
                  <div className="flex flex-wrap gap-3 text-xs">
                    {/* Removed manual receipt date input: server uses current datetime by default. */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block mb-1">ملاحظات</label>
                      <textarea
                        rows={2}
                        value={receiptDetails[orderId]?.notes || ''}
                        onChange={(e) => handleReceiptDetailChange(orderId, 'notes', e.target.value)}
                        className="w-full border px-2 py-1 rounded resize-none"
                        placeholder="ملاحظات عامة"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => printReceiptDocument(order)}
                      className="border px-3 py-1 rounded bg-white hover:bg-gray-100"
                    >طباعة</button>
                    <button
                      onClick={() => { setConfirmOrder(order); setShowConfirmModal(true); }}
                      disabled={isSubmitting}
                      className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                    >{isSubmitting ? 'جاري...' : 'استلام'}</button>
                    <div className="ml-auto text-gray-600 self-center">
                      منتجات محددة: {order.items.filter(item => getQuantityForItem(orderId, item.purchase_order_items_id) > 0).length}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAndSortedOrders.length}
          />
        </div>
      )}

      {/* Confirmation modal for receiving */}
      {showConfirmModal && confirmOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 p-4">
            <h3 className="text-lg font-semibold mb-3">هل أنت متأكد أنك تريد استلام المنتجات التالية؟</h3>
            <p className="text-sm text-gray-600 mb-3">(تاريخ الإنتاج الموضح لكل صنف)</p>
            <div className="max-h-64 overflow-y-auto border rounded mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="p-2 text-right">#</th><th className="p-2 text-right">الصنف</th><th className="p-2 text-center">التعبئة</th><th className="p-2 text-center">الكمية</th><th className="p-2 text-center">تاريخ الانتاج</th></tr></thead>
                <tbody>
                  {confirmOrder.items.filter(it => getQuantityForItem(confirmOrder.purchase_orders_id, it.purchase_order_items_id) > 0).map((it, idx) => {
                    const qty = getQuantityForItem(confirmOrder.purchase_orders_id, it.purchase_order_items_id);
                    const prod = getProductionDateForItem(confirmOrder.purchase_orders_id, it.purchase_order_items_id) || it.production_date || it.goods_receipt_items_production_date || '';
                    const prodDisplay = prod ? new Date(prod).toLocaleDateString('ar-EG') : '-';
                    const packaging = it.packaging_types_name || it.base_units_name || getProductUnitById(it.purchase_order_items_variant_id);
                    const name = it.variant_name ? `${it.products_name} - ${it.variant_name}` : it.products_name || getProductNameById(it.purchase_order_items_variant_id);
                    return (
                      <tr key={it.purchase_order_items_id} className="border-t">
                        <td className="p-2 text-right">{idx + 1}</td>
                        <td className="p-2 text-right">{name}</td>
                        <td className="p-2 text-center">{packaging}</td>
                        <td className="p-2 text-center">{formatNumber(qty)}</td>
                        <td className="p-2 text-center">{prodDisplay}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowConfirmModal(false); setConfirmOrder(null); }} className="px-4 py-1 border rounded">لا</button>
              <button onClick={async () => {
                  setShowConfirmModal(false);
                  const id = confirmOrder.purchase_orders_id;
                  setConfirmOrder(null);
                  await handleSubmitReceiving(id);
                }} className="px-4 py-1 bg-blue-600 text-white rounded">نعم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
