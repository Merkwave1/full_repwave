import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { PlusCircleIcon, MinusCircleIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import Alert from '../../../../common/Alert/Alert';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import { getPurchaseOrdersBySupplier, getReturnableQuantities, getPurchaseOrderDetails } from '../../../../../apis/purchase_orders';
import useCurrency from '../../../../../hooks/useCurrency';
import { getCurrentLocalDateTime, formatLocalDateTime } from '../../../../../utils/dateUtils';

export default function AddPurchaseReturnForm({ onAdd, onCancel, suppliers }) {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  // Fallback data for testing
  const fallbackSuppliers = [
    { supplier_id: 1, supplier_name: 'مورد تجريبي 1' },
    { supplier_id: 2, supplier_name: 'مورد تجريبي 2' }
  ];

  // Use actual data if available, otherwise use fallback
  const displaySuppliers = Array.isArray(suppliers) && suppliers.length > 0 ? suppliers : fallbackSuppliers;

  const [formData, setFormData] = useState({
    purchase_return_supplier_id: '',
    purchase_return_purchase_order_id: '',
    purchase_return_date: getCurrentLocalDateTime(),
    purchase_return_reason: '',
    purchase_return_notes: '',
    return_items: [],
    // legacy single-field for manual discount (we'll use toggle to decide)
    order_discount: '',
  });

  const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [selectedOrderWarehouse, setSelectedOrderWarehouse] = useState(null);
  const [orderLevelDiscount, setOrderLevelDiscount] = useState(0);
  const [orderSubtotal, setOrderSubtotal] = useState(0);
  const [manualDiscountEnabled, setManualDiscountEnabled] = useState(false);

  // Prepare supplier options for SearchableSelect
  const supplierOptions = useMemo(() => {
    return displaySuppliers.map(supplier => ({
      value: String(supplier.supplier_id),
      label: supplier.supplier_name
    }));
  }, [displaySuppliers]);

  // Prepare purchase order options for SearchableSelect
  const purchaseOrderOptions = useMemo(() => {
    return availablePurchaseOrders.map(order => ({
      value: String(order.purchase_orders_id),
      label: `#${order.purchase_orders_id} - ${formatLocalDateTime(order.purchase_orders_order_date)} (${order.purchase_orders_status}) - ${formatMoney(order.purchase_orders_total_amount ?? 0)}`
    }));
  }, [availablePurchaseOrders, formatMoney]);

  // Fetch purchase orders when supplier is selected
  useEffect(() => {
    const fetchSupplierOrders = async () => {
      if (formData.purchase_return_supplier_id) {
        setLoadingOrders(true);
        try {
          // Get orders that can be returned - Include all statuses where items can be returned:
          // - Ordered: Items ordered but not shipped yet (can return unshipped items)
          // - Shipped: Items shipped but not received yet (can return unshipped items)
          // - Received: Items fully received (can return received items from warehouse)
          // - Partially Received: Items partially received (can return both received and non-received items)
          // Request the last 20 orders for the supplier (user requested)
          const orders = await getPurchaseOrdersBySupplier(
            formData.purchase_return_supplier_id,
            'Ordered,Shipped,Received,Partially Received',
            20
          );
          // Sort orders by date - newest first (descending order)
          const sortedOrders = orders.sort((a, b) => {
            const dateA = new Date(a.purchase_orders_order_date);
            const dateB = new Date(b.purchase_orders_order_date);
            return dateB - dateA; // Descending order (newest first)
          });
          setAvailablePurchaseOrders(sortedOrders);
        } catch (error) {
          console.error('Error fetching supplier orders:', error);
          setAvailablePurchaseOrders([]);
        } finally {
          setLoadingOrders(false);
        }
      } else {
        setAvailablePurchaseOrders([]);
        // Reset purchase order and items when supplier changes
        setFormData(prev => ({
          ...prev,
          purchase_return_purchase_order_id: '',
          return_items: []
        }));
      }
    };

    fetchSupplierOrders();
  }, [formData.purchase_return_supplier_id]);

  // Fetch order details when purchase order is selected
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (formData.purchase_return_purchase_order_id) {
        setLoadingOrderDetails(true);
        try {
          // Get returnable quantities (which accounts for previous returns)
          const returnableData = await getReturnableQuantities(formData.purchase_return_purchase_order_id);
          
          // Auto-populate items from the returnable quantities (which accounts for previous returns)
          if (returnableData.items && returnableData.items.length > 0) {
            console.log('Raw returnable data:', returnableData.items[0]); // Debug log
            const returnItems = returnableData.items.map(item => {
              const quantityOrdered = parseFloat(item.purchase_order_items_quantity_ordered) || 0;
              const quantityReceived = parseFloat(item.purchase_order_items_quantity_received) || 0;
              const totalReturned = parseFloat(item.total_returned) || 0;
              const availableToReturnNotReceived = parseFloat(item.available_to_return_not_received) || 0;
              const availableToReturnReceived = parseFloat(item.available_to_return_received) || 0;
              
              // Determine available return type - either NOT_RECEIVED or RECEIVED, but not mixed
              let availableReturnType = 'NONE';
              let maxReturnableQuantity = 0;
              
              if (availableToReturnReceived > 0) {
                // Priority to received items if available
                availableReturnType = 'RECEIVED';
                maxReturnableQuantity = availableToReturnReceived;
              } else if (availableToReturnNotReceived > 0) {
                // Only if no received items available
                availableReturnType = 'NOT_RECEIVED';
                maxReturnableQuantity = availableToReturnNotReceived;
              }
              
              const receiveStatus = item.receive_status || 'لم يتم الاستلام';
              
              return {
                variant_id: item.purchase_order_items_variant_id,
                products_id: '', // Will be populated by variant selection logic
                packaging_type_id: item.purchase_order_items_packaging_type_id,
                quantity_returned: '', // User must enter this
                unit_cost: item.purchase_order_items_unit_cost,
                products_unit_of_measure_id: null,
                return_reason: '',
                // Store original order item data for reference
                original_quantity: quantityOrdered,
                quantity_received: quantityReceived,
                total_returned: totalReturned,
                available_to_return_not_received: availableToReturnNotReceived,
                available_to_return_received: availableToReturnReceived,
                available_to_return: maxReturnableQuantity, // Single type available
                max_returnable_quantity: maxReturnableQuantity,
                return_type: availableReturnType, // RECEIVED, NOT_RECEIVED, or NONE
                receive_status: receiveStatus,
                original_item_id: item.purchase_order_items_id,
                // Store display names for UI
                product_name: item.product_name,
                product_variant_name: item.product_variant_name,
                packaging_type_name: item.packaging_type_name,
                // Store warehouse info
                warehouse_id: item.warehouse_id,
                warehouse_name: item.warehouse_name,
                inventory_quantity: parseFloat(item.inventory_quantity) || 0
              };
            });

            setFormData(prev => ({
              ...prev,
              return_items: returnItems
            }));
            // Also fetch purchase order details to read order-level discount and subtotal for prorating
            try {
              const orderDetails = await getPurchaseOrderDetails(formData.purchase_return_purchase_order_id);
              const lvlDiscount = parseFloat(orderDetails.purchase_orders_order_discount || orderDetails.purchase_order_order_discount || 0) || 0;
              setOrderLevelDiscount(lvlDiscount);

              // Try to get subtotal from order details if present, otherwise compute from items
              let subtotalFromOrder = parseFloat(orderDetails.purchase_orders_subtotal || orderDetails.purchase_order_subtotal || 0) || 0;
              if (!subtotalFromOrder && Array.isArray(orderDetails.items)) {
                subtotalFromOrder = orderDetails.items.reduce((s,it) => s + ((parseFloat(it.purchase_order_items_unit_cost)||0) * (parseFloat(it.purchase_order_items_quantity_ordered)||0)), 0);
              }
              setOrderSubtotal(subtotalFromOrder || 0);
            } catch {
              // non-fatal
              setOrderLevelDiscount(0);
              setOrderSubtotal(0);
            }
          }
        } catch (error) {
          console.error('Error fetching order details:', error);
        } finally {
          setLoadingOrderDetails(false);
        }
      } else {
        // Clear items when no purchase order is selected
        setFormData(prev => ({
          ...prev,
          return_items: []
        }));
      }
    };

    fetchOrderDetails();
  }, [formData.purchase_return_purchase_order_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If changing purchase order, update warehouse info
    if (name === 'purchase_return_purchase_order_id') {
      const selectedOrder = availablePurchaseOrders.find(order => order.purchase_orders_id == value);
      setSelectedOrderWarehouse(selectedOrder || null);
    }
    
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter out items with no quantity returned (empty rows)
    const itemsWithQuantity = formData.return_items.filter(item => {
      const qty = parseFloat(item.quantity_returned);
      return qty && qty > 0;
    });
    
    // Show confirmation dialog
    const itemCount = itemsWithQuantity.length;
    const totalAmount = formatMoney(returnTotals.finalTotal);
    const confirmMessage = `هل أنت متأكد من إضافة مرتجع الشراء؟\n\n` +
      `عدد الأصناف: ${itemCount}\n` +
      `المبلغ الإجمالي: ${totalAmount}\n\n` +
      `سيتم إضافة المرتجع وتحديث المخزون.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    // Filter out temporary frontend fields before submission
    const itemsToSubmit = itemsWithQuantity.map((it) => {
      const { 
        products_unit_of_measure_id: _omit1,
        available_batches: _omit2, 
        loading_batches: _omit3,
        selected_batch_production_date: _omit4,
        ...rest 
      } = it;
      return rest;
    });
    
    const computedDiscount = Number(returnTotals.discount || 0);
    const discountNote = computedDiscount ? `\n(خصم إرجاع: ${computedDiscount})` : '';
    onAdd({
      ...formData,
      purchase_return_order_discount: computedDiscount,
      purchase_return_notes: (formData.purchase_return_notes || '') + discountNote,
      return_items: itemsToSubmit,
    });
  };

  // Calculation helpers
  const calculateItemTotals = useCallback((item) => {
    const quantity = parseFloat(item.quantity_returned) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const subtotal = quantity * unitCost;
    return { subtotal, total: subtotal };
  }, []);

  const returnTotals = useMemo(() => {
    const items = formData.return_items
      .filter(item => item.quantity_returned && parseFloat(item.quantity_returned) > 0)
      .map(item => {
        const qty = parseFloat(item.quantity_returned) || 0;
        const unit = parseFloat(item.unit_cost) || 0;
        return { qty, unit, subtotal: qty * unit };
      });

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);

    // Determine order-level discount: manual override or prorated from original order
    const manualVal = parseFloat(formData.order_discount) || 0;
    let proratedOrderDiscount = 0;
    if (!manualDiscountEnabled && orderSubtotal > 0 && orderLevelDiscount > 0) {
      // prorate according to returned gross value vs original order subtotal
      proratedOrderDiscount = orderLevelDiscount * (subtotal / orderSubtotal);
    }

    const finalOrderDiscount = manualDiscountEnabled ? manualVal : proratedOrderDiscount;
    const finalOrderDiscountClamped = Math.max(0, Math.min(finalOrderDiscount, subtotal));

    const finalTotal = Math.max(subtotal - finalOrderDiscountClamped, 0);

    return { subtotal, discount: finalOrderDiscountClamped, finalTotal, isManual: manualDiscountEnabled };
  }, [formData.return_items, formData.order_discount, manualDiscountEnabled, orderLevelDiscount, orderSubtotal]);

  const isFormActionDisabled = !formData.purchase_return_supplier_id || 
                                !formData.purchase_return_purchase_order_id || 
                                formData.return_items.length === 0 ||
                                !formData.return_items.some(item => 
                                  item.quantity_returned && 
                                  parseFloat(item.quantity_returned) > 0 &&
                                  parseFloat(item.quantity_returned) <= parseFloat(item.available_to_return || 0)
                                );

  

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة مرتجع شراء جديد</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المورد <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={supplierOptions}
              value={formData.purchase_return_supplier_id}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  purchase_return_supplier_id: value,
                  purchase_return_purchase_order_id: '',
                  return_items: []
                }));
              }}
              placeholder="ابحث عن المورد..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أمر الشراء <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={purchaseOrderOptions}
              value={formData.purchase_return_purchase_order_id}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  purchase_return_purchase_order_id: value
                }));
              }}
              placeholder={loadingOrders ? 'جاري التحميل...' : (formData.purchase_return_supplier_id ? 'ابحث عن أمر الشراء...' : 'اختر المورد أولاً')}
              className="w-full"
              disabled={!formData.purchase_return_supplier_id || loadingOrders}
            />
            {loadingOrderDetails && (
              <p className="text-xs text-blue-600 mt-1">جاري تحميل تفاصيل الأمر...</p>
            )}
            {selectedOrderWarehouse && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>المخزن المحدد:</strong> {selectedOrderWarehouse.warehouse_name || 'غير محدد'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden: return date should be sent automatically (current local datetime) */}
        {/* We keep purchase_return_date in state but do not show the input */}

        {/* Note: Return-level fields (reason, notes, discount) are shown in the totals block below */}

        {/* Items Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">عناصر المرتجع</h4>
            {!formData.purchase_return_purchase_order_id ? (
              <p className="text-sm text-gray-500">اختر أمر شراء لإظهار العناصر</p>
            ) : formData.return_items.length > 0 && (
              <div className="text-sm text-gray-600">
                المجموع: {formData.return_items.length} عنصر | 
                <span className="text-green-600 mx-1">
                  لديه كميات متاحة: {formData.return_items.filter(item => parseFloat(item.available_to_return || 0) > 0).length}
                </span> | 
                <span className="text-orange-600 mx-1">
                  أصناف لم يتم استلامها: {formData.return_items.filter(item => item.return_type === 'NOT_RECEIVED').length}
                </span> | 
                <span className="text-blue-600 mx-1">
                  أصناف في المخزون: {formData.return_items.filter(item => item.return_type === 'RECEIVED').length}
                </span> |
                <span className="text-red-600">
                  مُرتجع بالكامل: {formData.return_items.filter(item => item.return_type === 'NONE').length}
                </span>
              </div>
            )}
          </div>

          {!formData.purchase_return_purchase_order_id ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">يجب اختيار أمر الشراء أولاً لإظهار العناصر المتاحة للإرجاع</p>
            </div>
          ) : formData.return_items.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">
                {loadingOrderDetails ? 'جاري تحميل عناصر أمر الشراء...' : 'لا توجد عناصر في أمر الشراء المحدد'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.return_items.map((item, index) => {
                return (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 rounded-lg border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-700">عنصر #{index + 1}</h5>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-gray-500">
                          مطلوب: {item.original_quantity || '0'}
                        </div>
                        <div className="text-gray-500">
                          مستلم: {item.quantity_received || '0'}
                        </div>
                        <div className="text-red-500">
                          مُرتجع سابقاً: {item.total_returned || '0'}
                        </div>
                        {/* Display single return type available */}
                        {item.return_type === 'NOT_RECEIVED' && (
                          <div className="text-orange-600 font-medium">
                            متاح للإرجاع: {item.available_to_return} (لم يتم استلامها)
                          </div>
                        )}
                        {item.return_type === 'RECEIVED' && (
                          <div className="text-blue-600 font-medium">
                            متاح للإرجاع: {item.available_to_return} (في المخزون)
                          </div>
                        )}
                        {item.return_type === 'NONE' && (
                          <div className="text-red-500 font-medium">
                            لا يمكن الإرجاع (مُرتجع بالكامل)
                          </div>
                        )}
                        {/* Warehouse and inventory info */}
                        <div className="text-gray-600 font-medium">
                          المخزن: {item.warehouse_name || 'غير محدد'}
                        </div>
                        {item.return_type === 'RECEIVED' && (
                          <div className="text-indigo-600 font-medium">
                            الكمية في المخزون: {item.inventory_quantity || '0'}
                          </div>
                        )}
                        {/* Status badge */}
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.receive_status === 'تم الاستلام بالكامل'
                            ? 'bg-green-100 text-green-800' 
                            : item.receive_status === 'تم الاستلام جزئياً'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.receive_status}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Product Variant - Read Only */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          المنتج
                        </label>
                        <div className="w-full px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded">
                          {item.product_variant_name || item.product_name || 'منتج غير معروف'}
                        </div>
                      </div>

                      {/* Packaging Type - Read Only */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          نوع التعبئة
                        </label>
                        <div className="w-full px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded">
                          {item.packaging_type_name || 'غير محدد'}
                        </div>
                      </div>

                      {/* Quantity to Return - Editable */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          الكمية المرتجعة <span className="text-red-500">*</span>
                        </label>
                        <NumberInput
                          value={item.quantity_returned || ''}
                          onChange={(value) => {
                            const newItems = [...formData.return_items];
                            newItems[index].quantity_returned = value;
                            setFormData(prev => ({ ...prev, return_items: newItems }));
                          }}
                          placeholder="0"
                          min="0"
                          max={item.available_to_return}
                          step="0.01"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="text-xs mt-1">
                          {item.available_to_return > 0 ? (
                            <span className="text-green-600">
                              {item.return_type === 'RECEIVED' ? (
                                <>متاح للإرجاع: {item.available_to_return} (من المخزون)</>
                              ) : item.return_type === 'NOT_RECEIVED' ? (
                                <>متاح للإرجاع: {item.available_to_return} (أصناف لم يتم استلامها)</>
                              ) : (
                                <>متاح للإرجاع: {item.available_to_return}</>
                              )}
                              {item.total_returned > 0 && (
                                <span className="text-red-500 ml-2">
                                  (تم إرجاع {item.total_returned} مسبقاً)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-red-600">
                              لا توجد كمية متاحة للإرجاع
                              {item.total_returned > 0 && (
                                <span className="ml-2">
                                  (تم إرجاع جميع الكميات: {item.total_returned})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Total */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          المجموع ({symbol})
                        </label>
                        <div className="w-full px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded">
                          {formatMoney(calculateItemTotals(item).total)}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          سعر الوحدة: {formatMoney(item.unit_cost)}
                        </div>
                      </div>
                    </div>

                    {/* Per-item return reason removed per UX request */}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals Summary */}
        {formData.return_items.length > 0 && (
          <div className="border-t pt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 text-center">إجمالي العناصر</h4>
              <div className="space-y-4">
                {/* First row: reason, notes (single-line), discount (ع.ت) in the same row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">سبب الإرجاع</label>
                    <select
                      name="purchase_return_reason"
                      value={formData.purchase_return_reason}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">اختر السبب</option>
                      <option value="damaged">منتج تالف</option>
                      <option value="wrong_item">عنصر خاطئ</option>
                      <option value="poor_quality">جودة ضعيفة</option>
                      <option value="expired">منتهي الصلاحية</option>
                      <option value="overstocked">فائض مخزون</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">ملاحظات الإرجاع</label>
                    <input
                      type="text"
                      name="purchase_return_notes"
                      value={formData.purchase_return_notes}
                      onChange={handleChange}
                      placeholder="ملاحظات مختصرة..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={manualDiscountEnabled} 
                          onChange={(e) => setManualDiscountEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">تخصيص يدوي</span>
                      </label>
                      <label className="block text-sm font-medium text-gray-700">خصم على الإرجاع (ع.ت)</label>
                      {!manualDiscountEnabled && orderLevelDiscount > 0 && (
                        <span className="text-xs text-blue-600">
                          (تلقائي: {formatMoney(returnTotals.discount)})
                        </span>
                      )}
                    </div>
                    <NumberInput
                      value={formData.order_discount || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, order_discount: value }))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={!manualDiscountEnabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {!manualDiscountEnabled && (
                      <p className="text-xs text-gray-500 mt-1">
                        سيتم حساب الخصم تلقائياً بنسبة الكمية المرتجعة من إجمالي الطلب ({formatMoney(orderLevelDiscount)})
                      </p>
                    )}
                  </div>
                </div>

                {/* Second row: subtotal and final total after discount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div>
                    <span className="block text-sm text-gray-600">المجموع الفرعي</span>
                    <span className="text-lg font-semibold text-gray-900">{formatMoney(returnTotals.subtotal)}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-600">الإجمالي النهائي بعد الخصم</span>
                    <span className="text-xl font-bold text-green-600">{formatMoney(returnTotals.finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 rtl:space-x-reverse pt-6 border-t">
          {/* Show validation message if form is disabled */}
          {isFormActionDisabled && formData.return_items.length > 0 && (
            <div className="flex-1">
              <Alert
                type="warning"
                message="يجب إدخال كمية إرجاع صحيحة (ضمن الكمية المتاحة للإرجاع) لعنصر واحد على الأقل"
              />
            </div>
          )}
          
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isFormActionDisabled}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إضافة المرتجع
          </button>
        </div>
      </form>
    </div>
  );
}
