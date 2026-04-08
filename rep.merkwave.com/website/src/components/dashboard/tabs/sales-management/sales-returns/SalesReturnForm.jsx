import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import { getSalesOrdersByClient, getSalesOrderDetails } from '../../../../../apis/sales_orders';
import { getSalesReturnDetails } from '../../../../../apis/sales_returns';
import { formatCurrency } from '../../../../../utils/currency';
import { getCurrentLocalDateTime, localDateTimeToISOString, isoStringToLocalDateTime, formatLocalDate } from '../../../../../utils/dateUtils';

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export default function SalesReturnForm({
  onSubmit,
  onCancel,
  clients,
  isEditMode = false,
  returnItem = null
}) {
  // Status mapping between Arabic display and English database values
  const statusMapping = {
    'مسودة': 'Draft',
    'ملغى': 'Cancelled',
    'فى الانتظار': 'Pending',
    'مرفوض': 'Rejected',
    'معتمد': 'Approved',
    'تم المعالجة': 'Processed'
  };

  const reverseStatusMapping = Object.fromEntries(
    Object.entries(statusMapping).map(([arabic, english]) => [english, arabic])
  );

  const [formData, setFormData] = useState({
    returns_client_id: '',
    returns_date: getCurrentLocalDateTime(),
    returns_status: 'Processed',
    returns_reason: '',
    returns_notes: '',
    returns_sales_order_id: '',
    return_items: [],
    manual_discount: 0
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [clientOrders, setClientOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [manualDiscountEnabled, setManualDiscountEnabled] = useState(false);
  const [orderLevelDiscount, setOrderLevelDiscount] = useState(0);
  const [orderSummary, setOrderSummary] = useState({
    subtotalBeforeDiscount: 0,
    itemSummaries: {}
  });

  // Safe array processing for clients
  const safeClients = Array.isArray(clients) ? clients.filter(client =>
    client && client.clients_id && client.clients_company_name
  ) : [];

  const clientOptions = safeClients.map(client => ({
    value: client.clients_id,
    label: client.clients_company_name
  }));

  // Load return data for edit mode
  useEffect(() => {
    if (!isEditMode || !returnItem) {
      setInitialLoading(false);
      return;
    }

    const loadReturnData = async () => {
      setInitialLoading(true);
      try {
        const returnId = returnItem?.returns_id || returnItem?.sales_returns_id || returnItem?.id || returnItem?.returnsID;
        if (!returnId) {
          setInitialLoading(false);
          return;
        }

        const data = await getSalesReturnDetails(returnId);
        const clientId = data.returns_client_id || data.client_id || returnItem?.returns_client_id || returnItem?.client_id || '';
        const orderId = data.returns_sales_order_id || data.sales_order_id || returnItem?.returns_sales_order_id || '';
        const date = isoStringToLocalDateTime(data.returns_date || data.return_date || '');
        const status = data.returns_status || data.status || 'Processed';
        const reason = data.returns_reason || data.reason || '';
        const notes = data.returns_notes || data.notes || '';
        const manualDiscountValue = toNumber(data.manual_discount, 0);
        const items = Array.isArray(data.items) ? data.items : [];

        let itemSummaries = {};
        let subtotalBeforeDiscount = 0;
        let headerOrderDiscount = toNumber(data.sales_orders_discount_amount ?? data.sales_order_discount_amount ?? data.sales_orders_discount, 0);
        let headerSubtotal = toNumber(data.sales_order_subtotal, 0);

        if (orderId) {
          try {
            const orderDetails = await getSalesOrderDetails(orderId);
            const orderItems = Array.isArray(orderDetails?.items) ? orderDetails.items : [];
            subtotalBeforeDiscount = orderItems.reduce((sum, orderItem) => {
              const unitPrice = toNumber(orderItem.sales_order_items_unit_price ?? orderItem.unit_price, 0);
              const quantity = toNumber(orderItem.sales_order_items_quantity ?? orderItem.quantity, 0);
              return sum + (unitPrice * quantity);
            }, 0);

            itemSummaries = orderItems.reduce((acc, orderItem) => {
              const soItemId = orderItem.sales_order_items_id || orderItem.id;
              if (!soItemId) {
                return acc;
              }

              const orderedQty = toNumber(orderItem.sales_order_items_quantity ?? orderItem.quantity, 0);
              const totalReturnedQty = toNumber(orderItem.returned_quantity ?? orderItem.sales_order_items_returned_quantity ?? orderItem.total_returned, 0);

              acc[soItemId] = {
                orderedQty,
                totalReturnedQty,
                originalUnitPrice: toNumber(orderItem.sales_order_items_unit_price ?? orderItem.unit_price, 0),
                discountAmount: toNumber(orderItem.sales_order_items_discount_amount ?? orderItem.discount_amount, 0),
                taxAmount: toNumber(orderItem.sales_order_items_tax_amount ?? orderItem.tax_amount, 0),
                taxRate: toNumber(orderItem.sales_order_items_tax_rate ?? orderItem._tax_rate ?? orderItem.tax_rate, 0),
                hasTax: Boolean(orderItem.sales_order_items_has_tax ?? orderItem.has_tax) || toNumber(orderItem.sales_order_items_tax_rate ?? orderItem.tax_rate, 0) > 0
              };
              return acc;
            }, {});

            headerOrderDiscount = toNumber(orderDetails.sales_orders_discount_amount ?? orderDetails.sales_order_discount_amount, 0);
            headerSubtotal = toNumber(orderDetails.sales_orders_subtotal, 0);
          } catch (orderError) {
            console.error('Error loading order details for return:', orderError);
          }
        }

        setOrderLevelDiscount(headerOrderDiscount);
        setOrderSummary({
          subtotalBeforeDiscount: subtotalBeforeDiscount || headerSubtotal,
          itemSummaries
        });

        setFormData({
          returns_client_id: clientId,
          returns_date: date,
          returns_status: status,
          returns_reason: reason,
          returns_notes: notes,
          returns_sales_order_id: orderId,
          manual_discount: manualDiscountValue,
          return_items: items.map((item) => {
            const soItemId = item.return_items_sales_order_item_id || item.sales_order_items_id || item.id;
            const summary = itemSummaries[soItemId] || {};
            const currentQty = toNumber(item.return_items_quantity ?? item.quantity, 0);
            const orderedQty = summary.orderedQty ?? toNumber(item.ordered_quantity, 0);
            const totalReturnedQty = summary.totalReturnedQty ?? toNumber(item.returned_quantity, 0);
            const previouslyReturned = Math.max(0, totalReturnedQty - currentQty);
            const remainingQuantity = Math.max(0, orderedQty - totalReturnedQty);

            return {
              return_items_sales_order_item_id: soItemId,
              return_items_quantity: currentQty,
              return_items_unit_price: toNumber(item.return_items_unit_price ?? item.unit_price, 0),
              return_items_total_price: toNumber(item.return_items_total_price ?? item.total_price, 0),
              return_items_notes: item.return_items_notes || item.notes || '',
              product_name: item.product_name || item.variant_name || '',
              packaging_type_name: item.packaging_type_name || '',
              ordered_quantity: orderedQty,
              returned_quantity: previouslyReturned,
              remaining_quantity: remainingQuantity,
              _has_tax: summary.hasTax ?? (Boolean(item.sales_order_items_has_tax) || toNumber(item.sales_order_items_tax_rate ?? item._tax_rate, 0) > 0),
              _tax_rate: summary.taxRate ?? toNumber(item.sales_order_items_tax_rate ?? item._tax_rate, 0),
              _discount_amount: summary.discountAmount ?? toNumber(item.sales_order_items_discount_amount, 0),
              _original_unit_price: summary.originalUnitPrice ?? toNumber(item.sales_order_items_unit_price ?? item.unit_price, 0),
              _tax_amount: summary.taxAmount ?? toNumber(item.sales_order_items_tax_amount, 0)
            };
          })
        });

        setManualDiscountEnabled(manualDiscountValue > 0);
      } catch (error) {
        console.error('Error loading return data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadReturnData();
  }, [isEditMode, returnItem]);

  // Load client orders when client is selected (only in add mode)
  useEffect(() => {
    if (isEditMode) return; // Skip in edit mode

    const loadClientOrders = async () => {
      if (!formData.returns_client_id) {
        setClientOrders([]);
        return;
      }

      setLoadingOrders(true);
      try {
        // Limit to last 5 orders for this client
        const ordersRaw = await getSalesOrdersByClient(formData.returns_client_id, 5);
        const orders = Array.isArray(ordersRaw) ? ordersRaw : (ordersRaw?.data || []);

        // Filter by selected client ID (server may not filter by client_id)
        const byClient = orders.filter(o => {
          const cid = Number(formData.returns_client_id);
          return Number(o.clients_id) === cid || Number(o.sales_orders_client_id) === cid;
        });

        // Eligible statuses for returns - only invoiced orders can have returns
        const eligibleStatuses = ['Invoiced'];
        const eligibleOrders = byClient.filter(order => 
          eligibleStatuses.includes(order.sales_orders_status)
        );
        // Sort orders by date - newest first (descending order)
        const sortedOrders = eligibleOrders.sort((a, b) => {
          const dateA = new Date(a.sales_orders_order_date || a.order_date);
          const dateB = new Date(b.sales_orders_order_date || b.order_date);
          return dateB - dateA; // Descending order (newest first)
        });
        setClientOrders(sortedOrders);
      } catch (error) {
        console.error('Error loading client orders:', error);
        setClientOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    loadClientOrders();
  }, [formData.returns_client_id, isEditMode]);

  // Load order details when order is selected (only in add mode)
  useEffect(() => {
    if (isEditMode) return; // Skip in edit mode

    const loadOrderDetails = async () => {
      if (!formData.returns_sales_order_id) {
        setOrderSummary({
          subtotalBeforeDiscount: 0,
          itemSummaries: {}
        });
        return;
      }

      setLoadingOrderDetails(true);
      try {
        const orderDetails = await getSalesOrderDetails(formData.returns_sales_order_id);
        const items = Array.isArray(orderDetails.items) ? orderDetails.items : [];

        const subtotalBeforeDiscount = items.reduce((sum, orderItem) => {
          const unitPrice = Number(orderItem.sales_order_items_unit_price || 0);
          const quantity = Number(orderItem.sales_order_items_quantity || 0);
          return sum + (Number.isFinite(unitPrice) && Number.isFinite(quantity) ? unitPrice * quantity : 0);
        }, 0);

        const itemSummaries = items.reduce((acc, orderItem, index) => {
          const soItemId = orderItem.sales_order_items_id || orderItem.id || index;
          if (!soItemId) {
            return acc;
          }

          acc[soItemId] = {
            orderedQty: Number(orderItem.sales_order_items_quantity || 0) || 0,
            totalReturnedQty: Number(orderItem.returned_quantity ?? orderItem.sales_order_items_returned_quantity ?? orderItem.total_returned ?? 0) || 0,
            originalUnitPrice: Number(orderItem.sales_order_items_unit_price || 0) || 0,
            discountAmount: Number(orderItem.sales_order_items_discount_amount || 0) || 0,
            taxAmount: Number(orderItem.sales_order_items_tax_amount || 0) || 0,
            taxRate: Number(orderItem.sales_order_items_tax_rate || orderItem._tax_rate || 0) || 0,
            hasTax: Boolean(orderItem.sales_order_items_has_tax) || (Number(orderItem.sales_order_items_tax_rate || orderItem._tax_rate || 0) > 0)
          };

          return acc;
        }, {});

        setOrderSummary({
          subtotalBeforeDiscount,
          itemSummaries
        });

        // Store order-level discount
        setOrderLevelDiscount(Number(orderDetails.sales_orders_discount_amount || orderDetails.sales_order_discount_amount || 0) || 0);

        // Transform order items to return items format
        const returnItems = items.map((item, index) => {
          const summary = itemSummaries[item.sales_order_items_id || item.id || index] || {};
          const ordered_quantity = summary.orderedQty || 0;
          const returned_quantity = summary.totalReturnedQty || 0;
          const remaining_quantity = Math.max(0, ordered_quantity - returned_quantity);

          return {
            return_items_sales_order_item_id: item.sales_order_items_id || item.id || index,
            return_items_quantity: 0,
            return_items_unit_price: summary.originalUnitPrice || 0,
            return_items_total_price: 0,
            return_items_notes: '',
            product_name: item.variant_name || item.products_name || '',
            packaging_type_name: item.packaging_types_name || '',
            ordered_quantity,
            returned_quantity,
            remaining_quantity,
            _has_tax: summary.hasTax,
            _tax_rate: summary.taxRate || 0,
            _discount_amount: summary.discountAmount || 0,
            _original_unit_price: summary.originalUnitPrice || 0,
            _tax_amount: summary.taxAmount || 0,
            _original_subtotal: Number(item.sales_order_items_subtotal || 0) || 0,
            _total_with_tax_and_discount: Number(item.sales_order_items_total_price || 0) || 0
          };
        });

        setFormData(prev => ({ ...prev, return_items: returnItems }));
      } catch (error) {
        console.error('Error loading order details:', error);
      } finally {
        setLoadingOrderDetails(false);
      }
    };

    loadOrderDetails();
  }, [formData.returns_sales_order_id, isEditMode]);

  // Calculate totals
  const totals = useMemo(() => {
    const items = Array.isArray(formData.return_items) ? formData.return_items : [];

    const subtotal = items.reduce((sum, item) => {
      const unitPrice = Number(item.return_items_unit_price || 0);
      const quantity = Number(item.return_items_quantity || 0);
      if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) {
        return sum;
      }
      return sum + (unitPrice * quantity);
    }, 0);

    const itemDiscountTotal = items.reduce((sum, item) => {
      const orderedQty = Number(item.ordered_quantity || 0);
      const returnedQty = Number(item.return_items_quantity || 0);
      if (orderedQty <= 0 || returnedQty <= 0) {
        return sum;
      }
      const discountAmount = Number(item._discount_amount || 0);
      const discountPerUnit = discountAmount / orderedQty;
      return sum + (discountPerUnit * returnedQty);
    }, 0);

    const returnedGrossValue = items.reduce((sum, item) => {
      const originalUnitPrice = Number(item._original_unit_price ?? item.return_items_unit_price ?? 0);
      const quantity = Number(item.return_items_quantity || 0);
      if (!Number.isFinite(originalUnitPrice) || !Number.isFinite(quantity)) {
        return sum;
      }
      return sum + (originalUnitPrice * quantity);
    }, 0);

    const inferredOrderSubtotal = (() => {
      if (orderSummary.subtotalBeforeDiscount > 0) {
        return orderSummary.subtotalBeforeDiscount;
      }
      return items.reduce((sum, item) => {
        const orderedQty = Number(item.ordered_quantity || 0);
        const originalUnitPrice = Number(item._original_unit_price ?? item.return_items_unit_price ?? 0);
        if (!Number.isFinite(orderedQty) || !Number.isFinite(originalUnitPrice)) {
          return sum;
        }
        return sum + (orderedQty * originalUnitPrice);
      }, 0);
    })();

    const finalOrderDiscount = manualDiscountEnabled
      ? Number(formData.manual_discount || 0)
      : (inferredOrderSubtotal > 0 ? (orderLevelDiscount * (returnedGrossValue / inferredOrderSubtotal)) : 0);

    const taxTotal = items.reduce((sum, item) => {
      const orderedQty = Number(item.ordered_quantity || 0);
      const taxAmount = Number(item._tax_amount || 0);
      const quantity = Number(item.return_items_quantity || 0);
      if (orderedQty <= 0 || quantity <= 0) {
        return sum;
      }
      const taxPerUnit = taxAmount / orderedQty;
      return sum + (taxPerUnit * quantity);
    }, 0);

    const totalDiscount = itemDiscountTotal + finalOrderDiscount;
    const total = subtotal + taxTotal - totalDiscount;

    return {
      subtotal: subtotal.toFixed(2),
      itemDiscount: itemDiscountTotal.toFixed(2),
      orderDiscount: finalOrderDiscount.toFixed(2),
      isManualDiscount: manualDiscountEnabled,
      totalDiscount: totalDiscount.toFixed(2),
      tax: taxTotal.toFixed(2),
      total: total.toFixed(2)
    };
  }, [formData.return_items, orderLevelDiscount, manualDiscountEnabled, formData.manual_discount, orderSummary]);

  // Handle quantity change
  const handleQuantityChange = (index, newQuantity) => {
    const requested = Number(newQuantity) || 0;
    setFormData(prev => ({
      ...prev,
      return_items: prev.return_items.map((item, idx) => {
        if (idx === index) {
          const maxQty = Number.isFinite(Number(item.remaining_quantity))
            ? Number(item.remaining_quantity)
            : Math.max(0, Number(item.ordered_quantity || 0) - Number(item.returned_quantity || 0));
          const quantity = Math.max(0, Math.min(requested, maxQty));
          const unitPrice = Number(item.return_items_unit_price || 0);
          const orderedQty = Number(item.ordered_quantity || 0) || 1;
          const taxAmount = Number(item._tax_amount || 0) || 0;
          const taxPerUnit = orderedQty > 0 ? taxAmount / orderedQty : 0;
          const discountAmount = Number(item._discount_amount || 0) || 0;
          const discountPerUnit = orderedQty > 0 ? discountAmount / orderedQty : 0;
          const lineSubtotal = unitPrice * quantity;
          const taxForQuantity = taxPerUnit * quantity;
          const discountForQuantity = discountPerUnit * quantity;
          const totalWithAdjustments = lineSubtotal + taxForQuantity - discountForQuantity;
          return {
            ...item,
            return_items_quantity: quantity,
            return_items_total_price: Number(lineSubtotal.toFixed(2)),
            computed_total_with_tax: Number(totalWithAdjustments.toFixed(2))
          };
        }
        return item;
      })
    }));
  };

  // Handle unit price change
  const handleUnitPriceChange = (index, newUnitPrice) => {
    const unitPrice = Number(newUnitPrice) || 0;
    setFormData(prev => ({
      ...prev,
      return_items: prev.return_items.map((item, idx) => {
        if (idx === index) {
          const quantity = Number(item.return_items_quantity || 0);
          const orderedQty = Number(item.ordered_quantity || 0) || 1;
          const taxAmount = Number(item._tax_amount || 0) || 0;
          const taxPerUnit = orderedQty > 0 ? taxAmount / orderedQty : 0;
          const discountAmount = Number(item._discount_amount || 0) || 0;
          const discountPerUnit = orderedQty > 0 ? discountAmount / orderedQty : 0;
          const lineSubtotal = unitPrice * quantity;
          const taxForQuantity = taxPerUnit * quantity;
          const discountForQuantity = discountPerUnit * quantity;
          const totalWithAdjustments = lineSubtotal + taxForQuantity - discountForQuantity;
          return {
            ...item,
            return_items_unit_price: unitPrice,
            return_items_total_price: Number(lineSubtotal.toFixed(2)),
            computed_total_with_tax: Number(totalWithAdjustments.toFixed(2)),
            _original_unit_price: Number(item._original_unit_price ?? unitPrice ?? 0)
          };
        }
        return item;
      })
    }));
  };

  // Remove item from return
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      return_items: prev.return_items.filter((_, idx) => idx !== index)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Convert status from Arabic to English if necessary
    const arabicStatus = reverseStatusMapping[formData.returns_status] || formData.returns_status;
    const englishStatus = statusMapping[arabicStatus] || formData.returns_status;
    
    const payload = {
      client_id: formData.returns_client_id,
      order_id: formData.returns_sales_order_id || null,
      return_date: localDateTimeToISOString(formData.returns_date),
      status: englishStatus, // Ensure English status for database
      reason: formData.returns_reason,
      notes: formData.returns_notes,
      total_amount: totals.total,
      items: formData.return_items.filter(item => Number(item.return_items_quantity || 0) > 0).map(item => ({
        return_items_sales_order_item_id: item.return_items_sales_order_item_id,
        return_items_quantity: item.return_items_quantity,
        return_items_unit_price: item.return_items_unit_price,
        return_items_total_price: item.return_items_total_price,
        return_items_notes: item.return_items_notes || ''
      }))
    };

    if (manualDiscountEnabled) {
      payload.manual_discount = Number(formData.manual_discount || 0);
    }

    try {
      setLoading(true);
      await onSubmit(payload);
    } catch (error) {
      console.error('Error submitting sales return:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto" dir="rtl">
        <div className="text-center py-8 text-gray-500">جاري تحميل بيانات المرتجع...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'تعديل مرتجع بيع' : 'إضافة مرتجع بيع جديد'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center space-x-reverse space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>رجوع</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client and Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              العميل <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={clientOptions}
              value={formData.returns_client_id}
              onChange={(value) => {
                setFormData({ ...formData, returns_client_id: value, returns_sales_order_id: '' });
              }}
              placeholder="اختر العميل"
              className="mt-1"
              disabled={isEditMode} // Disable in edit mode
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تاريخ ووقت المرتجع <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={formData.returns_date}
              onChange={(e) => setFormData({ ...formData, returns_date: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status and Order */}
        <div className={`grid gap-4 ${isEditMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Only show status field when editing, not when adding */}
          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                حالة المرتجع
              </label>
              <select
                value={reverseStatusMapping[formData.returns_status] || formData.returns_status}
                onChange={(e) => {
                  const englishStatus = statusMapping[e.target.value] || e.target.value;
                  setFormData({ ...formData, returns_status: englishStatus });
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="مسودة">مسودة</option>
                <option value="ملغى">ملغى</option>
                <option value="فى الانتظار">فى الانتظار</option>
                <option value="معتمد">معتمد (Approved)</option>
                <option value="مرفوض">مرفوض</option>
                <option value="تم المعالجة">تم المعالجة</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditMode ? 'رقم الطلب المرتبط (للعرض فقط)' : 'رقم الطلب المرتبط (اختياري)'}
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={formData.returns_sales_order_id || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                placeholder="رقم الطلب"
                disabled
                readOnly
              />
            ) : (
              <>
                <select
                  value={formData.returns_sales_order_id}
                  onChange={(e) => setFormData({ ...formData, returns_sales_order_id: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingOrders || !formData.returns_client_id}
                >
                  <option value="">اختر طلب (اختياري)</option>
                  {clientOrders.map(order => {
                    const dateValue = order.sales_orders_order_date || order.sales_orders_date || order.sales_order_date || '';
                    return (
                      <option key={order.sales_orders_id} value={order.sales_orders_id}>
                        رقم {order.sales_orders_id} - {formatLocalDate(dateValue, 'en-GB')} - {formatCurrency(order.sales_orders_total_amount)}
                      </option>
                    );
                  })}
                </select>
                {loadingOrders && (
                  <p className="mt-1 text-sm text-blue-600">جاري تحميل الطلبات...</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Reason and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سبب الإرجاع</label>
            <textarea
              rows={3}
              value={formData.returns_reason}
              onChange={(e) => setFormData({ ...formData, returns_reason: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="سبب الإرجاع"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              rows={3}
              value={formData.returns_notes}
              onChange={(e) => setFormData({ ...formData, returns_notes: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="ملاحظات"
            />
          </div>
        </div>

        {/* Manual Discount Settings */}
        {Array.isArray(formData.return_items) && formData.return_items.length > 0 && (
          <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-purple-800">إعدادات الخصم الإجمالي</h4>
              <div className="flex items-center space-x-reverse space-x-2">
                <input
                  type="checkbox"
                  id="manualDiscountToggle"
                  checked={manualDiscountEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setManualDiscountEnabled(enabled);
                    if (!enabled) {
                      setFormData((prev) => ({
                        ...prev,
                        manual_discount: 0
                      }));
                    }
                  }}
                  className="w-4 h-4 text-purple-600"
                />
                <label htmlFor="manualDiscountToggle" className="text-sm text-purple-700">
                  تخصيص الخصم الإجمالي يدويًا
                </label>
              </div>
            </div>
            
            {!manualDiscountEnabled && orderLevelDiscount > 0 && (
              <div className="mb-3 p-3 bg-blue-100 rounded border border-blue-200">
                <div className="text-sm text-blue-700">
                  <span className="font-medium">الخصم الإجمالي للطلب الأصلي:</span> {formatCurrency(orderLevelDiscount)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  سيتم حساب الخصم تناسبياً حسب الكمية المرتجعة
                </div>
              </div>
            )}
            
            {manualDiscountEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-1">
                    قيمة الخصم الإجمالي المخصص
                  </label>
                  <NumberInput
                    value={String(formData.manual_discount ?? '')}
                    onChange={(v) => setFormData({ ...formData, manual_discount: parseFloat(v || '0') || 0 })}
                    className="block w-full"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-purple-600 mt-1">
                    سيحل محل الخصم التلقائي للطلب ({formatCurrency(orderLevelDiscount)})
                  </p>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-sm text-purple-700 bg-white p-3 rounded border">
                    <div className="mb-2"><strong>الخصم الحالي:</strong></div>
                    <div>الخصم المخصص: <span className="font-semibold">{formatCurrency(formData.manual_discount || 0)}</span></div>
                    <div className="text-xs text-purple-600 mt-1">
                      + خصم الأصناف: {formatCurrency(totals.itemDiscount)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        {Array.isArray(formData.return_items) && formData.return_items.length > 0 && (
          <>
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">#</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">المنتج</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">التعبئة</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">الكمية المطلوبة والمرتجعة والمتبقية</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">سعر الوحدة</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">الإجمالي</th>
                    {!isEditMode && (
                      <th className="px-3 py-2 text-center font-medium text-gray-600">الإجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.return_items.map((item, index) => {
                    const orderedQty = Number(item.ordered_quantity || 0) || 0;
                    const previouslyReturnedQty = Number(item.returned_quantity ?? 0) || 0;
                    const currentQty = Number(item.return_items_quantity || 0) || 0;
                    const originalUnitPrice = Number(item._original_unit_price ?? item.return_items_unit_price ?? 0) || 0;
                    const unitPrice = Number(item.return_items_unit_price || 0) || 0;
                    const orderedTaxAmount = Number(item._tax_amount || 0) || 0;
                    const taxPerUnit = orderedQty > 0 ? (orderedTaxAmount / orderedQty) : (item._has_tax ? (originalUnitPrice * Number(item._tax_rate || 0) / 100) : 0);
                    const originalDiscountPerUnit = orderedQty > 0 ? (Number(item._discount_amount || 0) / orderedQty) : 0;
                    const discountForCurrentQty = originalDiscountPerUnit * currentQty;
                    const calculatedRemaining = Math.max(0, orderedQty - previouslyReturnedQty - currentQty);
                    const remainingQty = Number.isFinite(Number(item.remaining_quantity))
                      ? Number(item.remaining_quantity)
                      : calculatedRemaining;
                    const computedLineTotal = Number.isFinite(Number(item.computed_total_with_tax))
                      ? Number(item.computed_total_with_tax)
                      : (unitPrice * currentQty) + (taxPerUnit * currentQty) - discountForCurrentQty;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-center">{index + 1}</td>
                        <td className="px-3 py-2 text-center">{item.product_name}</td>
                        <td className="px-3 py-2 text-center">{item.packaging_type_name}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>المطلوبة: <span className="font-medium text-gray-800">{orderedQty}</span></div>
                              <div>المرتجعة سابقاً: <span className="font-medium text-red-600">{previouslyReturnedQty}</span></div>
                              <div>المتبقية: <span className="font-medium text-green-600">{remainingQty}</span></div>
                            </div>
                            <NumberInput
                              value={String(item.return_items_quantity || 0)}
                              onChange={(v) => handleQuantityChange(index, v)}
                              className="w-full text-center"
                              placeholder="0"
                              min="0"
                              max={remainingQty}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="space-y-2 text-sm">
                            <div>
                              <div className="text-xs text-gray-600 mb-1">سعر الوحدة</div>
                              <NumberInput
                                value={String(unitPrice)}
                                onChange={(v) => handleUnitPriceChange(index, v)}
                                className="w-full text-center text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="text-gray-700 text-xs">
                              خصم للوحدة {formatCurrency(originalDiscountPerUnit)}
                            </div>
                            <div className="text-gray-700 text-xs">
                              الضريبة ({item._tax_rate || 0}%) {formatCurrency(taxPerUnit)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-medium">
                          {formatCurrency(computedLineTotal)}
                        </td>
                        {!isEditMode && (
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="حذف الصنف"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Order Summary */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-700">المجموع الفرعي:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totals.subtotal)}</span>
                </div>
                
                {Number(totals.itemDiscount) > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">خصم الأصناف:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totals.itemDiscount)}</span>
                  </div>
                )}
                {Number(totals.orderDiscount) > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">خصم الطلب الإجمالي:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totals.orderDiscount)}</span>
                  </div>
                )}
                {(Number(totals.itemDiscount) > 0 || Number(totals.orderDiscount) > 0) && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700 font-medium">إجمالي الخصم:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(Number(totals.itemDiscount) + Number(totals.orderDiscount))}</span>
                  </div>
                )}
                
                {Number(totals.tax) > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">إجمالي الضريبة:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totals.tax)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-3 border-t border-gray-300 bg-gray-50 -mx-4 px-4">
                  <span className="text-lg font-bold text-gray-900">إجمالي الطلب:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading order details */}
        {loadingOrderDetails && (
          <div className="text-center py-4 text-blue-600">
            جاري تحميل تفاصيل الطلب...
          </div>
        )}

        {/* Empty state for add mode */}
        {!isEditMode && (!formData.return_items || formData.return_items.length === 0) && !loadingOrderDetails && formData.returns_sales_order_id && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p>لم يتم العثور على أصناف لهذا الطلب</p>
            <p className="text-sm">قد يكون الطلب فارغاً أو تم حذف أصنافه</p>
          </div>
        )}

        {!isEditMode && !formData.returns_sales_order_id && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <PlusCircleIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p>اختر عميل ثم طلب لإضافة الأصناف</p>
            <p className="text-sm">أو يمكنك إضافة مرتجع بدون طلب محدد</p>
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex justify-end space-x-reverse space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || !formData.returns_client_id || !formData.returns_date}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التغييرات' : 'إضافة المرتجع')}
          </button>
        </div>
      </form>
    </div>
  );
}