// src/components/dashboard/tabs/shared/delivery/DeliverProductsTab.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';
import { 
  XMarkIcon, 
  CalendarDaysIcon, 
  EyeIcon, 
  TruckIcon, 
  PrinterIcon,
  InboxArrowDownIcon 
} from '@heroicons/react/24/outline';

import { getAppWarehouses, getAppClients, getAppDeliverableSalesOrders } from '../../../../../apis/auth';
import { addSalesDelivery } from '../../../../../apis/sales_deliveries';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
// ConfirmationDialog replaced with inline modal below to show item details similar to ReceiveProductsTab
import { format } from 'date-fns';

const formatNumber = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  const n = Number(val);
  if (Number.isNaN(n)) return val;
  const hasDecimal = Math.abs(n - Math.trunc(n)) > 0;
  return hasDecimal ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toLocaleString('en-US');
};

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'قيد الانتظار' },
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'مؤكد' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'مُسلم' },
  completed: { color: 'bg-green-100 text-green-800', label: 'مكتمل' },
  partially_delivered: { color: 'bg-orange-100 text-orange-800', label: 'تم التسليم جزئيًا' },
  draft: { color: 'bg-gray-100 text-gray-800', label: 'مسودة' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'ملغي' }
};

const StatusBadge = ({ status }) => {
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
  const config = STATUS_CONFIG[normalizedStatus] || {
    color: 'bg-gray-100 text-gray-800',
    label: status || 'غير محدد'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Pagination Component
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

const OrderItemRow = ({
  item,
  onQuantityChange,
  onDeliverToggle,
  onBatchChange,
  isDelivering,
  deliveryQuantity,
  selectedBatch,
  availableBatches = []
}) => {
  const deliveredQuantity = parseFloat(item.delivered_quantity || item.sales_order_items_quantity_delivered || 0);
  const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
  const totalQuantity = parseFloat(item.sales_order_items_quantity || 0);
  const remainingQuantity = totalQuantity - deliveredQuantity - returnedQuantity;
  const displaySku = item.variant_sku || item.products_sku || (item.sales_order_items_variant_id ? `ID: ${item.sales_order_items_variant_id}` : 'غير محدد');

  return (
    <tr className="[&>td]:border [&>td]:p-1 hover:bg-gray-50 text-xs text-gray-700">
      <td className="text-center align-middle w-8">
        <input
          type="checkbox"
          checked={isDelivering}
          onChange={onDeliverToggle}
          disabled={remainingQuantity <= 0}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      {/* Product column: constrained to avoid expanding other columns */}
      <td className="w-40 min-w-0 max-w-[180px] truncate text-right text-gray-900">
        {item.variant_name || item.products_name}
      </td>
      <td className="text-center text-gray-500 w-16">{displaySku}</td>
      <td className="text-center text-gray-500 w-16">{item.packaging_types_name || 'غير محدد'}</td>
      <td className="text-center font-semibold text-gray-900 w-16">{formatNumber(totalQuantity)}</td>
      <td className="text-center text-gray-500 w-16">{formatNumber(deliveredQuantity)}</td>
      <td className="text-center text-gray-500 w-16">{formatNumber(returnedQuantity)}</td>
      <td className="text-center font-semibold text-green-600 w-16">{formatNumber(remainingQuantity)}</td>
      <td className="text-center w-16">
        <NumberInput
          min="0"
          max={remainingQuantity}
          value={deliveryQuantity ?? ''}
          onChange={(val) => onQuantityChange(Math.min(Math.max(0, parseFloat(val) || 0), remainingQuantity))}
          disabled={!isDelivering || remainingQuantity <= 0}
          className="w-16 text-center border px-1 py-0.5 rounded"
        />
      </td>
      <td className="text-center w-56">
        <select
          value={selectedBatch || ''}
          onChange={(e) => onBatchChange(e.target.value)}
          disabled={!isDelivering || availableBatches.length === 0}
          className="w-56 text-xs px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="">اختر دفعة</option>
          {availableBatches.map(batch => (
            <option key={batch.inventory_id} value={batch.inventory_production_date}>
              {batch.inventory_production_date || 'غير محدد'} (متاح: {formatNumber(batch.inventory_quantity)})
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
};
export default function DeliverProductsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const location = useLocation();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [clients, setClients] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Selected items for delivery
  const [selectedItems, setSelectedItems] = useState({});
  const [deliveryDetails, setDeliveryDetails] = useState({});
  const [availableBatches, setAvailableBatches] = useState({}); // Store batches per item
  const [selectedBatches, setSelectedBatches] = useState({}); // Store selected batch per item
  const [activeOrderId, setActiveOrderId] = useState(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    orderId: null
  });

  // ...existing code...

  // Load initial data
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      let cachedClients = [];
      try {
        const rawClients = JSON.parse(localStorage.getItem('appClients') || '[]');
        cachedClients = Array.isArray(rawClients) ? rawClients : (rawClients?.data || []);
      } catch (cacheErr) {
        console.warn('Failed to parse clients from localStorage:', cacheErr);
        cachedClients = [];
      }

      
      const [ordersResponse, warehousesResponse, clientsResponse] = await Promise.all([
        getAppDeliverableSalesOrders(forceRefresh), // Force refresh when needed
        getAppWarehouses(),
        getAppClients()
      ]);

      if (ordersResponse?.data) {
        // Sort by order date (new to old) using correct field sales_orders_order_date
        const sortedOrders = [...ordersResponse.data].sort((a, b) => {
          const da = new Date(a.sales_orders_order_date || a.created_at || 0).getTime();
          const db = new Date(b.sales_orders_order_date || b.created_at || 0).getTime();
          if (db !== da) return db - da;
          return (b.sales_orders_id || 0) - (a.sales_orders_id || 0);
        });
        setOrders(sortedOrders);
      } else if (Array.isArray(ordersResponse)) {
        // Sort by order date (new to old)
        const sortedOrders = [...ordersResponse].sort((a, b) => {
          const da = new Date(a.sales_orders_order_date || a.created_at || 0).getTime();
          const db = new Date(b.sales_orders_order_date || b.created_at || 0).getTime();
          if (db !== da) return db - da;
          return (b.sales_orders_id || 0) - (a.sales_orders_id || 0);
        });
        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }

      if (warehousesResponse?.data) {
        setWarehouses(warehousesResponse.data);
      } else {
        setWarehouses([]);
      }

      if (Array.isArray(clientsResponse?.data) && clientsResponse.data.length > 0) {
        setClients(clientsResponse.data);
      } else if (Array.isArray(clientsResponse) && clientsResponse.length > 0) {
        setClients(clientsResponse);
      } else if (Array.isArray(cachedClients) && cachedClients.length > 0) {
        setClients(cachedClients);
      } else {
        setClients([]);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('حدث خطأ في تحميل البيانات');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch data every time user navigates to deliver-products page
  useEffect(() => {
    if (location.pathname.includes('/deliver-products')) {
      loadData(true); // Force refresh
    }
  }, [location.pathname, loadData]);

  useEffect(() => {
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => loadData);
    }
  }, [setChildRefreshHandler, loadData]);

  // Filter orders (API already filters for deliverable orders)
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          order.sales_orders_id.toString().includes(search) ||
          order.clients_company_name?.toLowerCase().includes(search) ||
          order.clients_contact_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Apply client filter
      if (selectedClient) {
        const orderClientId = order.clients_id || order.sales_orders_client_id;
        if (orderClientId !== parseInt(selectedClient)) {
          return false;
        }
      }

      // Apply warehouse filter
      if (selectedWarehouse) {
        if (order.sales_orders_warehouse_id !== parseInt(selectedWarehouse)) {
          return false;
        }
      }

      // Apply date filters
      if (dateFrom) {
        const orderDate = new Date(order.sales_orders_order_date);
        const fromDate = new Date(dateFrom);
        if (orderDate < fromDate) return false;
      }

      if (dateTo) {
        const orderDate = new Date(order.sales_orders_order_date);
        const toDate = new Date(dateTo);
        if (orderDate > toDate) return false;
      }

      return true;
    });
    return filtered;
  }, [orders, searchTerm, selectedClient, selectedWarehouse, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Load available batches for an item
  const loadAvailableBatches = async (variantId, packagingTypeId, warehouseId) => {
    try {
      
      // Import getAllInventory here to avoid circular imports
      const { getAllInventory } = await import('../../../../../apis/inventory');
      const inventoryResponse = await getAllInventory(warehouseId);
      
      // Extract the data array from the API response
      const inventoryData = inventoryResponse?.data || [];
      
      if (!Array.isArray(inventoryData)) {
        return [];
      }
      
      const batches = inventoryData
        .filter(inv => 
          inv.variant_id == variantId && 
          inv.packaging_type_id == packagingTypeId && 
          parseFloat(inv.inventory_quantity || 0) > 0
        )
        .map(inv => ({
          inventory_id: inv.inventory_id,
          inventory_production_date: inv.inventory_production_date,
          inventory_quantity: parseFloat(inv.inventory_quantity || 0),
          warehouse_id: inv.warehouse_id
        }))
        .sort((a, b) => new Date(b.inventory_production_date || 0) - new Date(a.inventory_production_date || 0));
      
      return batches;
    } catch (error) {
      console.error('Error loading batches:', error);
      return [];
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedClient('');
    setSelectedWarehouse('');
    setCurrentPage(1);
  };

  // FilterBar configuration
  const selectFilters = useMemo(() => [
    {
      key: 'client',
      label: 'العميل',
      value: selectedClient,
      onChange: setSelectedClient,
      placeholder: 'اختر العميل...',
      options: [
        { value: '', label: 'جميع العملاء' },
        ...clients.map(client => ({
          value: client.clients_id.toString(),
          label: client.clients_company_name || client.clients_contact_name
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
  ], [selectedClient, clients, selectedWarehouse, warehouses]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedClient) {
      const client = clients.find(c => c.clients_id.toString() === selectedClient);
      chips.push({
        key: 'client',
        label: `العميل: ${client?.clients_company_name || client?.clients_contact_name || 'غير محدد'}`
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
  }, [selectedClient, clients, selectedWarehouse, warehouses, dateFrom, dateTo]);

  const handleClearAll = () => {
    clearFilters();
  };

  const keepEntriesForOrder = (obj, orderId, { includeOrderLevel = false } = {}) => {
    const orderKey = String(orderId);
    const prefix = `${orderKey}-`;
    return Object.fromEntries(
      Object.entries(obj).filter(([key]) => key.startsWith(prefix) || (includeOrderLevel && key === orderKey))
    );
  };

  // Handle item selection for delivery (mutually exclusive across orders)
  const handleItemToggle = async (orderId, itemId, item) => {
    const key = `${orderId}-${itemId}`;
    const isCurrentlySelected = !!selectedItems[key];
    const switchingOrder = activeOrderId !== null && activeOrderId !== orderId;

    if (!isCurrentlySelected) {
      const baseSelected = switchingOrder ? {} : keepEntriesForOrder(selectedItems, orderId);
      baseSelected[key] = true;
      setSelectedItems(baseSelected);

      const baseDetails = switchingOrder ? {} : keepEntriesForOrder(deliveryDetails, orderId, { includeOrderLevel: true });
      if (item) {
        const deliveredQuantity = parseFloat(item.delivered_quantity || item.sales_order_items_quantity_delivered || 0);
        const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
        const totalQuantity = parseFloat(item.sales_order_items_quantity || 0);
        const remainingQuantity = totalQuantity - deliveredQuantity - returnedQuantity;
        baseDetails[key] = { quantity: remainingQuantity > 0 ? remainingQuantity : 0 };
      }
      setDeliveryDetails(baseDetails);

      const baseAvailableBatches = switchingOrder ? {} : keepEntriesForOrder(availableBatches, orderId);
      const baseSelectedBatches = switchingOrder ? {} : keepEntriesForOrder(selectedBatches, orderId);
      setAvailableBatches(baseAvailableBatches);
      setSelectedBatches(baseSelectedBatches);

      setActiveOrderId(orderId);

      if (item && item.sales_order_items_variant_id && item.sales_order_items_packaging_type_id) {
        const order = orders.find(o => o.sales_orders_id == orderId);
        if (order?.sales_orders_warehouse_id) {
          const batches = await loadAvailableBatches(
            item.sales_order_items_variant_id,
            item.sales_order_items_packaging_type_id,
            order.sales_orders_warehouse_id
          );

          setAvailableBatches(prev => ({
            ...keepEntriesForOrder(prev, orderId),
            [key]: batches
          }));

          if (batches && batches.length > 0) {
            const deliveredQuantity = parseFloat(item.delivered_quantity || item.sales_order_items_quantity_delivered || 0);
            const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
            const totalQuantity = parseFloat(item.sales_order_items_quantity || 0);
            const remainingQuantity = totalQuantity - deliveredQuantity - returnedQuantity;
            const firstSufficientBatch = batches.find(batch => parseFloat(batch.inventory_quantity || 0) >= remainingQuantity);
            const batchToSelect = firstSufficientBatch || batches[0];
            setSelectedBatches(prev => ({
              ...keepEntriesForOrder(prev, orderId),
              [key]: batchToSelect?.inventory_production_date || ''
            }));
          }
        }
      }
    } else {
      const updatedSelected = { ...selectedItems };
      delete updatedSelected[key];
      const remainingForOrder = Object.keys(updatedSelected).some(k => k.startsWith(`${orderId}-`));
      setSelectedItems(updatedSelected);

      const updatedDetails = { ...deliveryDetails };
      delete updatedDetails[key];
      if (!remainingForOrder) {
        delete updatedDetails[String(orderId)];
      }
      setDeliveryDetails(updatedDetails);

      const updatedBatches = { ...availableBatches };
      delete updatedBatches[key];
      setAvailableBatches(updatedBatches);

      const updatedSelectedBatches = { ...selectedBatches };
      delete updatedSelectedBatches[key];
      setSelectedBatches(updatedSelectedBatches);

      if (!remainingForOrder) {
        setActiveOrderId(null);
      }
    }
  };

  const handleQuantityChange = (orderId, itemId, quantity) => {
    const key = `${orderId}-${itemId}`;
    setDeliveryDetails(prev => ({
      ...prev,
      [key]: { ...prev[key], quantity }
    }));
  };

  const handleBatchChange = (orderId, itemId, batchDate) => {
    const key = `${orderId}-${itemId}`;
    setSelectedBatches(prev => ({
      ...prev,
      [key]: batchDate
    }));
  };

  const handleDeliveryDetailChange = (orderId, field, value) => {
    setDeliveryDetails(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value }
    }));
  };

  // Toggle selection of all items in an order
  const handleToggleOrderSelection = async (order, shouldSelect) => {
    const deliverableItems = order.items?.filter(item => {
      const deliveredQuantity = parseFloat(item.delivered_quantity || item.sales_order_items_quantity_delivered || 0);
      const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
      const totalQuantity = parseFloat(item.sales_order_items_quantity || 0);
      const remaining = totalQuantity - deliveredQuantity - returnedQuantity;
      return remaining > 0;
    }) || [];

    if (deliverableItems.length === 0) return;

    // If selecting, clear selections for other orders first (mutually exclusive)
    if (shouldSelect) {
      const newSelected = {};
      deliverableItems.forEach(item => {
        const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
        newSelected[key] = true;
      });
      setSelectedItems(newSelected);
      setActiveOrderId(order.sales_orders_id);
    } else {
      const updated = { ...selectedItems };
      deliverableItems.forEach(item => {
        const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
        delete updated[key];
      });
      setSelectedItems(updated);
      setActiveOrderId(null);
    }

    // Update delivery details with quantities
    if (shouldSelect) {
      const newDetails = {};
      deliverableItems.forEach(item => {
        const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
        const deliveredQuantity = parseFloat(item.delivered_quantity || item.sales_order_items_quantity_delivered || 0);
        const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
        const totalQuantity = parseFloat(item.sales_order_items_quantity || 0);
        const remainingQuantity = totalQuantity - deliveredQuantity - returnedQuantity;
        if (remainingQuantity > 0) newDetails[key] = { quantity: remainingQuantity };
      });
      // Keep order-level details if present
      const orderNotes = deliveryDetails[order.sales_orders_id] ? { [order.sales_orders_id]: deliveryDetails[order.sales_orders_id] } : {};
      setDeliveryDetails({ ...orderNotes, ...newDetails });
    } else {
      setDeliveryDetails(prev => {
        const updated = { ...prev };
        deliverableItems.forEach(item => {
          const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
          delete updated[key];
        });
  delete updated[String(order.sales_orders_id)];
        return updated;
      });
    }

    // Load batches and clear batch selections
    if (shouldSelect) {
      const newBatches = {};
      const newSelectedBatches = {};
      
      for (const item of deliverableItems) {
        const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
        if (item.sales_order_items_variant_id && item.sales_order_items_packaging_type_id && order.sales_orders_warehouse_id) {
          const batches = await loadAvailableBatches(
            item.sales_order_items_variant_id,
            item.sales_order_items_packaging_type_id,
            order.sales_orders_warehouse_id
          );
          newBatches[key] = batches;
          
          // Automatically select the first batch with sufficient quantity
          if (batches && batches.length > 0) {
            const deliveredQuantity = parseFloat(item.delivered_quantity || item.sales_order_items_quantity_delivered || 0);
            const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
            const totalQuantity = parseFloat(item.sales_order_items_quantity || 0);
            const remainingQuantity = totalQuantity - deliveredQuantity - returnedQuantity;
            
            const firstSufficientBatch = batches.find(batch => 
              parseFloat(batch.inventory_quantity || 0) >= remainingQuantity
            );
            
            // If found a batch with sufficient quantity, use it; otherwise use the first batch
            const batchToSelect = firstSufficientBatch || batches[0];
            newSelectedBatches[key] = batchToSelect.inventory_production_date;
          }
        }
      }
      
      // Replace available batches and selected batches with only this order's entries
      setAvailableBatches(newBatches);
      setSelectedBatches(newSelectedBatches);
    } else {
      // Clear batches when deselecting
      setAvailableBatches(prev => {
        const updated = { ...prev };
        deliverableItems.forEach(item => {
          const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
          delete updated[key];
        });
        return updated;
      });
      
      setSelectedBatches(prev => {
        const updated = { ...prev };
        deliverableItems.forEach(item => {
          const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
          delete updated[key];
        });
        return updated;
      });
    }
  };

  // Print delivery receipt function
  const handlePrintDeliveryReceipt = (order) => {
    if (activeOrderId !== order.sales_orders_id) {
      setGlobalMessage({ type: 'error', message: 'يرجى اختيار عناصر من هذا الطلب أولاً' });
      return;
    }

    const selectedOrderItems = order.items?.filter(item => {
      const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
      return selectedItems[key];
    }) || [];

    if (selectedOrderItems.length === 0) {
      setGlobalMessage({ type: 'error', message: 'يرجى اختيار عنصر واحد على الأقل للطباعة' });
      return;
    }

    const deliveryData = deliveryDetails[order.sales_orders_id] || {};
    const currentDate = new Date();
    
    // Prepare items for print
    const itemsForPrint = selectedOrderItems.map(item => {
      const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
      const details = deliveryDetails[key] || {};
      
      return {
        name: item.variant_name || item.products_name || 'غير محدد',
        sku: item.variant_sku || item.products_sku || `ID: ${item.sales_order_items_variant_id}` || 'غير محدد',
        packaging: item.packaging_types_name || 'غير محدد',
        quantity: details.quantity || 0,
        notes: details.notes || ''
      };
    });

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>.</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #fff;
            direction: rtl;
            text-align: right;
          }
          
          .receipt-container {
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
          
          .receipt-info {
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
            padding: 12px 8px;
            text-align: right;
            font-size: 13px;
          }
          
          .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
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
            .receipt-container { border: none; box-shadow: none; margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>إيصال تسليم بضائع</h1>
          </div>
          
          <div class="receipt-info">
            <div class="info-section">
              <h3>معلومات الطلب</h3>
              <div class="info-row">
                <span class="info-label">رقم الطلب:</span>
                <span>#${order.sales_orders_id}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ الطلب:</span>
                <span>${new Date(order.sales_orders_order_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ التسليم:</span>
                <span>${deliveryData.date ? new Date(deliveryData.date).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}</span>
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
                <span>${order.warehouse_name || 'غير محدد'}</span>
              </div>

            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>م</th>
                <th>اسم المنتج</th>
                <th>كود المنتج</th>
                <th>نوع التعبئة</th>
                <th>الكمية المُسلمة</th>
                
              </tr>
            </thead>
            <tbody>
              ${itemsForPrint.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.sku}</td>
                  <td>${item.packaging}</td>
                  <td>${item.quantity}</td>
               
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${deliveryData.notes ? `
            <div class="info-section">
              <h3>ملاحظات التسليم</h3>
              <p>${deliveryData.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <div class="signature-box">
              <div class="signature-label">توقيع المُستلم</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">توقيع المُسلم</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">ختم الشركة</div>
            </div>
          </div>
          
          <div class="print-date">
            تم إنشاء هذا الإيصال بتاريخ: ${currentDate.toLocaleDateString('en-GB')} ${currentDate.toLocaleTimeString('en-US')}
          </div>
        </div>
      </body>
      </html>
    `;

    const doPrint = async () => {
  const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(printContent, { title: 'إيصال تسليم', closeAfter: 700 });
    };
    doPrint();
  };

  // Open confirmation dialog
  const handleDeliveryClick = (orderId) => {
    const order = orders.find(o => o.sales_orders_id === orderId);
    if (!order) {
      setGlobalMessage({ type: 'error', message: 'الطلب غير موجود' });
      return;
    }

    if (activeOrderId !== orderId) {
      setGlobalMessage({ type: 'error', message: 'يرجى تحديد عناصر من هذا الطلب أولًا' });
      return;
    }

    const selectedOrderItems = order.items?.filter(item => {
      const key = `${orderId}-${item.sales_order_items_id}`;
      return selectedItems[key];
    }) || [];

    if (selectedOrderItems.length === 0) {
      setGlobalMessage({ type: 'error', message: 'يرجى اختيار عنصر واحد على الأقل للتسليم' });
      return;
    }

    // Check if all selected items have a batch selected
    const itemsWithoutBatch = selectedOrderItems.filter(item => {
      const key = `${orderId}-${item.sales_order_items_id}`;
      const batchDate = selectedBatches[key];
      return !batchDate || batchDate === '';
    });

    if (itemsWithoutBatch.length > 0) {
      const itemNames = itemsWithoutBatch.map(item => 
        item.variant_name || item.products_name
      ).join('، ');
      
      setGlobalMessage({ 
        type: 'error', 
        message: `يجب اختيار الدفعة لجميع المنتجات المحددة قبل التسليم. المنتجات التي لم يتم اختيار دفعة لها: ${itemNames}` 
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      orderId: orderId
    });
  };

  // confirmation handlers removed; inline modal handles confirm/cancel actions

  // Submit delivery
  const handleSubmitDelivery = async (orderId) => {
    try {
      setIsSubmitting(true);

      const order = orders.find(o => o.sales_orders_id === orderId);
      if (!order) {
        setGlobalMessage({ type: 'error', message: 'الطلب غير موجود' });
        return;
      }

      if (activeOrderId !== orderId) {
        setGlobalMessage({ type: 'error', message: 'يرجى تحديد عناصر من هذا الطلب أولًا' });
        return;
      }

      const selectedOrderItems = order.items?.filter(item => {
        const key = `${orderId}-${item.sales_order_items_id}`;
        return selectedItems[key];
      }) || [];

      if (selectedOrderItems.length === 0) {
        setGlobalMessage({ type: 'error', message: 'يرجى اختيار عنصر واحد على الأقل للتسليم' });
        return;
      }

      const deliveryData = deliveryDetails[orderId] || {};
      
      const deliveryItems = selectedOrderItems.map(item => {
        const key = `${orderId}-${item.sales_order_items_id}`;
        const details = deliveryDetails[key] || {};
        const batchDate = selectedBatches[key];
        
        
        return {
          sales_order_items_id: item.sales_order_items_id,
          quantity: details.quantity || 0,
          notes: details.notes || '',
          batch_date: batchDate || null
        };
      });

      const requestData = {
        sales_order_id: orderId,
        warehouse_id: order.sales_orders_warehouse_id,
        delivery_notes: deliveryData.notes || '',
        delivery_address: deliveryData.address || '',
        items: deliveryItems
      };


      await addSalesDelivery(requestData);
      
      // Clear localStorage cache for sales orders to force fresh data
      localStorage.removeItem('appSalesOrders');
      
      setGlobalMessage({ type: 'success', message: 'تم إنشاء التسليم بنجاح' });
      
      // Clear selections for this order
      const clearedSelectedItems = { ...selectedItems };
      const clearedDetails = { ...deliveryDetails };
      
      order.items?.forEach(item => {
        const key = `${orderId}-${item.sales_order_items_id}`;
        delete clearedSelectedItems[key];
        delete clearedDetails[key];
      });
      delete clearedDetails[orderId];
      
      setSelectedItems(clearedSelectedItems);
      setDeliveryDetails(clearedDetails);
      
      // Force reload data with fresh API call
      await loadData(true); // Force refresh
      
      
    } catch (err) {
      console.error('Error creating delivery:', err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في إنشاء التسليم' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <Alert type="error" message={error} />;

  return (
    <div className="p-4" dir="rtl">
      {/* Header */}
      <CustomPageHeader
        title="تسليم المنتجات للعملاء"
        subtitle="قائمة أوامر البيع الجاهزة للتسليم"
        icon={<TruckIcon className="h-8 w-8 text-white" />}
        statValue={filteredOrders.length}
        statLabel="عدد الأوامر"
      />

      {/* Filters */}
      <FilterBar
        searchConfig={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "رقم الطلب، اسم العميل..."
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

      {/* Orders List */}
      <div className="space-y-4">
        {paginatedOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <InboxArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد طلبات للتسليم</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filteredOrders.length === 0 
                ? 'لا توجد طلبات تطابق معايير البحث المحددة'
                : 'لا توجد طلبات في هذه الصفحة'
              }
            </p>
          </div>
        ) : (
          paginatedOrders.map(order => {
            const orderItems = order.items || [];
            const deliverableItems = orderItems.filter(item => {
              const deliveredQuantity = parseFloat(item.delivered_quantity || item.sales_order_items_quantity_delivered || 0);
              const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
              const totalQuantity = parseFloat(item.sales_order_items_quantity || 0);
              const remaining = totalQuantity - deliveredQuantity - returnedQuantity;
              return remaining > 0;
            });

            if (deliverableItems.length === 0) return null;

            const isActiveOrder = activeOrderId === order.sales_orders_id;
            const hasSelectedItems = isActiveOrder && deliverableItems.some(item => {
              const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
              return selectedItems[key];
            });
            const selectedCount = isActiveOrder
              ? deliverableItems.reduce((count, item) => {
                  const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
                  return selectedItems[key] ? count + 1 : count;
                }, 0)
              : 0;

            const deliveryData = isActiveOrder ? (deliveryDetails[order.sales_orders_id] || {}) : {};

            return (
              <div key={order.sales_orders_id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 md:p-4 space-y-3">
                <div className="flex flex-wrap gap-4 text-xs text-gray-700">
                  <span className="font-semibold text-gray-900">طلب #{order.sales_orders_id}</span>
                  <span>التاريخ: {order.sales_orders_order_date ? format(new Date(order.sales_orders_order_date), 'dd/MM/yyyy HH:mm') : '-'}</span>
                  <span>العميل: {order.clients_company_name || order.clients_contact_name || 'غير محدد'}</span>
                  <span>المخزن: {order.warehouse_name || 'غير محدد'}</span>
                  {deliverableItems.length > 0 && (
                    <div className="ms-auto flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleOrderSelection(order, true)}
                        className="border border-gray-300 bg-white px-3 py-1 rounded hover:bg-gray-100"
                      >تحديد الأمر بالكامل</button>
                      {selectedCount > 0 && (
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
                      <tr className="[&>th]:border [&>th]:p-2 text-gray-600">
                        <th className="w-8">تحديد</th>
                        <th className="text-right w-40 min-w-0 max-w-[220px] truncate">المنتج</th>
                        <th className="text-center w-8">كود المنتج</th>
                        <th className="text-center w-20">نوع التعبئة</th>
                        <th className="text-center w-8">مطلوبة</th>
                        <th className="text-center w-8">مُسلمة</th>
                        <th className="text-center w-8">مرتجعة</th>
                        <th className="text-center w-8">متبقي</th>
                        <th className="text-center w-8">تسليم</th>
                        <th className="text-center w-56">الدفعة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliverableItems.map(item => {
                        const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
                        const isSelected = isActiveOrder && selectedItems[key];
                        const details = isActiveOrder ? (deliveryDetails[key] || {}) : {};

                        return (
                          <OrderItemRow
                            key={item.sales_order_items_id}
                            item={item}
                            onQuantityChange={(quantity) => handleQuantityChange(order.sales_orders_id, item.sales_order_items_id, quantity)}
                            onDeliverToggle={() => handleItemToggle(order.sales_orders_id, item.sales_order_items_id, item)}
                            onBatchChange={(batchDate) => handleBatchChange(order.sales_orders_id, item.sales_order_items_id, batchDate)}
                            isDelivering={isSelected}
                            deliveryQuantity={details.quantity ?? ''}
                            selectedBatch={isActiveOrder ? (selectedBatches[key] || '') : ''}
                            availableBatches={isActiveOrder ? (availableBatches[key] || []) : []}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {hasSelectedItems && (
                  <div className="border rounded p-3 bg-gray-50 space-y-2">
                    <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block mb-1 text-gray-600">ملاحظات التسليم</label>
                        <input
                          type="text"
                          value={deliveryData.notes || ''}
                          onChange={(e) => handleDeliveryDetailChange(order.sales_orders_id, 'notes', e.target.value)}
                          placeholder="ملاحظات..."
                          className="w-full border px-2 py-1 rounded"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        onClick={() => handlePrintDeliveryReceipt(order)}
                        className="border px-3 py-1 rounded bg-white hover:bg-gray-100 inline-flex items-center gap-2"
                      >
                        <PrinterIcon className="h-4 w-4" />
                        طباعة إيصال التسليم
                      </button>
                      <button
                        onClick={() => handleDeliveryClick(order.sales_orders_id)}
                        disabled={isSubmitting}
                        className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        <TruckIcon className="h-4 w-4" />
                        {isSubmitting ? 'جاري التسليم...' : 'تسليم المنتجات المحددة'}
                      </button>
                      <div className="ml-auto text-gray-600 self-center">
                        منتجات محددة: {selectedCount}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Confirmation modal (detailed) - mirrors ReceiveProductsTab confirmation dialog */}
      {confirmDialog.isOpen && confirmDialog.orderId && (() => {
        const order = orders.find(o => o.sales_orders_id === confirmDialog.orderId);
        if (!order) return null;
        const selectedOrderItems = order.items?.filter(item => {
          const key = `${order.sales_orders_id}-${item.sales_order_items_id}`;
          return selectedItems[key];
        }) || [];

        return (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 p-4">
              <h3 className="text-lg font-semibold mb-3">تأكيد التسليم</h3>
              <p className="text-sm text-gray-600 mb-3">(تاريخ الدفعة الموضح لكل صنف)</p>
              <div className="max-h-64 overflow-y-auto border rounded mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">#</th>
                      <th className="p-2 text-right">الصنف</th>
                      <th className="p-2 text-center">التعبئة</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-center">تاريخ الدفعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderItems.map((it, idx) => {
                      const key = `${order.sales_orders_id}-${it.sales_order_items_id}`;
                      const qty = parseFloat(deliveryDetails[key]?.quantity || 0);
                      const batch = selectedBatches[key] || it.batch_date || it.inventory_production_date || '';
                      const batchDisplay = batch ? new Date(batch).toLocaleDateString('ar-EG') : '-';
                      const packaging = it.packaging_types_name || it.base_units_name || 'غير محدد';
                      const name = it.variant_name ? `${it.products_name} - ${it.variant_name}` : it.products_name || it.variant_name || 'غير محدد';
                      return (
                        <tr key={it.sales_order_items_id} className="border-t">
                          <td className="p-2 text-right">{idx + 1}</td>
                          <td className="p-2 text-right">{name}</td>
                          <td className="p-2 text-center">{packaging}</td>
                          <td className="p-2 text-center">{qty}</td>
                          <td className="p-2 text-center">{batchDisplay}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setConfirmDialog({ isOpen: false, orderId: null }); }} className="px-4 py-1 border rounded">لا</button>
                <button onClick={async () => { setConfirmDialog({ isOpen: false, orderId: null }); await handleSubmitDelivery(order.sales_orders_id); }} className="px-4 py-1 bg-blue-600 text-white rounded">نعم</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
