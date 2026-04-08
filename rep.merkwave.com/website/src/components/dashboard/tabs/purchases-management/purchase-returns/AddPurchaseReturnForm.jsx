// src/components/dashboard/tabs/purchases-management/purchase-returns/AddPurchaseReturnForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import { getPurchaseOrdersBySupplier, getPurchaseOrderDetails, getPurchaseOrderItemReturnInfo } from '../../../../../apis/purchase_orders';
import useCurrency from '../../../../../hooks/useCurrency';
import { getCurrentLocalDateTime, formatLocalDateTime } from '../../../../../utils/dateUtils';

export default function AddPurchaseReturnForm({
  suppliers,
  onSubmit,
  onCancel,
  loading
}) {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_order_id: '',
    date: getCurrentLocalDateTime(),
    reason: '',
    notes: '',
    order_discount: '',
    discount_notes: '',
    items: []
  });

  const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [itemReturnInfo, setItemReturnInfo] = useState({}); // Store return info for each item
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch purchase orders when supplier is selected
  useEffect(() => {
    const fetchSupplierOrders = async () => {
      if (formData.supplier_id) {
        setLoadingOrders(true);
        try {
          // Include orders with status 'Ordered', 'Shipped', 'Received' or 'Partially Received' for returns
          const orders = await getPurchaseOrdersBySupplier(
            formData.supplier_id, 
            'Ordered,Shipped,Received,Partially Received'
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
      }
    };

    fetchSupplierOrders();
  }, [formData.supplier_id]);

  // Fetch order details when purchase order is selected
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (formData.purchase_order_id) {
        setLoadingOrderDetails(true);
        try {
          const orderDetails = await getPurchaseOrderDetails(formData.purchase_order_id);
          setSelectedOrderDetails(orderDetails);
        } catch (error) {
          console.error('Error fetching order details:', error);
          setSelectedOrderDetails(null);
        } finally {
          setLoadingOrderDetails(false);
        }
      } else {
        setSelectedOrderDetails(null);
      }
    };

    fetchOrderDetails();
  }, [formData.purchase_order_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear related errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }

    // Reset purchase order when supplier changes
    if (name === 'supplier_id') {
      setFormData(prev => ({
        ...prev,
        purchase_order_id: '',
        items: []
      }));
    }

    // Reset items when purchase order changes
    if (name === 'purchase_order_id') {
      setFormData(prev => ({
        ...prev,
        items: []
      }));
    }
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      purchase_order_item_id: '',
      quantity: '',
      unit_price: '',
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleItemChange = async (itemIndex, field, value) => {
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, index) =>
        index === itemIndex ? { ...item, [field]: value } : item
      )
    }));

    // If changing the purchase order item, fetch return info and populate pricing
    if (field === 'purchase_order_item_id' && value) {
      try {
        const returnInfo = await getPurchaseOrderItemReturnInfo(value);
        setItemReturnInfo(prev => ({
          ...prev,
          [value]: returnInfo
        }));

        // Populate unit price from the purchase order
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, index) =>
            index === itemIndex ? { 
              ...item, 
              unit_price: returnInfo.unit_cost?.toString() || ''
            } : item
          )
        }));
      } catch (error) {
        console.error('Error fetching item return info:', error);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'المورد مطلوب';
    }

    if (!formData.date) {
      newErrors.date = 'تاريخ المرتجع مطلوب';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'يجب إضافة عنصر واحد على الأقل';
    }

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.purchase_order_item_id) {
        newErrors[`item_${index}_purchase_order_item_id`] = 'العنصر مطلوب';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`item_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من صفر';
      }
      if (!item.unit_price || parseFloat(item.unit_price) <= 0) {
        newErrors[`item_${index}_unit_price`] = 'سعر الوحدة يجب أن يكون أكبر من صفر';
      }
      
      if (item.quantity && parseFloat(item.quantity) > 0) {
        // Check if quantity exceeds available quantity for return
        const returnInfo = itemReturnInfo[item.purchase_order_item_id];
        if (returnInfo && returnInfo.available_for_return !== undefined) {
          if (parseFloat(item.quantity) > returnInfo.available_for_return) {
            newErrors[`item_${index}_quantity`] = `الكمية تتجاوز الكمية المتاحة للإرجاع (${returnInfo.available_for_return})`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Calculate total for confirmation
    const totalAmount = formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);

    // Show confirmation dialog
    const itemCount = formData.items.length;
    const confirmMessage = `هل أنت متأكد من إضافة مرتجع الشراء؟\n\n` +
      `عدد الأصناف: ${itemCount}\n` +
      `المبلغ التقريبي: ${formatMoney(totalAmount)}\n\n` +
      `سيتم إضافة المرتجع وتحديث المخزون.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    // Prepare submission data
    const submissionData = {
      supplier_id: parseInt(formData.supplier_id),
      purchase_order_id: formData.purchase_order_id ? parseInt(formData.purchase_order_id) : null,
      date: formData.date,
      reason: formData.reason || null,
      notes: formData.notes || null,
      items: formData.items.map(item => ({
        purchase_order_item_id: parseInt(item.purchase_order_item_id),
        quantity: parseFloat(item.quantity),
        notes: item.notes || null
      }))
    };

    await onSubmit(submissionData);
  };

  // Prepare options for SearchableSelect
  const getItemOptions = () => {
    if (!selectedOrderDetails?.items) return [];
    
    return selectedOrderDetails.items.map(orderItem => {
      const returnInfo = itemReturnInfo[orderItem.purchase_order_items_id];
      
      // Show only variant name if available, otherwise show product name
      const displayLabel = orderItem.product_variant_name || orderItem.product_name || 'منتج غير معروف';
      
      // Determine the correct unit to display
      const baseUnit = orderItem.base_unit_name || '';
      const packagingType = orderItem.packaging_type_name || '';
      const displayUnit = packagingType && packagingType !== baseUnit ? packagingType : baseUnit;
      
      return {
        value: orderItem.purchase_order_items_id,
        label: displayLabel,
        // Additional data for tooltip or extended display
        extendedInfo: {
          productName: orderItem.product_name,
          variantName: orderItem.product_variant_name,
          orderedQuantity: orderItem.purchase_order_items_quantity_ordered,
          receivedQuantity: orderItem.purchase_order_items_quantity_received,
          returnedQuantity: returnInfo?.quantity_returned || 0,
          baseUnit: displayUnit, // Use the correct display unit
          unitCost: orderItem.purchase_order_items_unit_cost
        }
      };
    });
  };

  // Custom render function for dropdown options
  const renderItemOption = (option) => {
    const { extendedInfo } = option;
    if (!extendedInfo) return option.label;

    return (
      <div className="space-y-1">
        <div className="font-medium text-gray-900">
          {option.label}
        </div>
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>
            كمية مطلوبة: {extendedInfo.orderedQuantity} {extendedInfo.baseUnit} | 
            كمية مستلمة: {extendedInfo.receivedQuantity} {extendedInfo.baseUnit}
          </div>
          <div>
            كمية مرتجعة: {extendedInfo.returnedQuantity} {extendedInfo.baseUnit} | 
            سعر الوحدة: {extendedInfo.unitCost} {symbol}
          </div>
        </div>
      </div>
    );
  };

  const totalAmount = useMemo(() => {
    const itemsTotal = formData.items.reduce((sum, item) => {
      if (item.quantity && item.unit_price) {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }
      return sum;
    }, 0);
    
    const orderDiscount = parseFloat(formData.order_discount) || 0;
    return Math.max(0, itemsTotal - orderDiscount);
  }, [formData.items, formData.order_discount]);

  if (loading) {
    return <Loader className="mt-8" />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">إضافة مرتجع شراء جديد</h3>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المورد <span className="text-red-500">*</span>
              </label>
              <select
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.supplier_id ? 'border-red-300' : 'border-gray-300'
                }`}
                dir="rtl"
              >
                <option value="">اختر المورد</option>
                {suppliers.map(supplier => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.supplier_name}
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="mt-1 text-sm text-red-600">{errors.supplier_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                أمر الشراء
              </label>
              <select
                name="purchase_order_id"
                value={formData.purchase_order_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="rtl"
                disabled={!formData.supplier_id || loadingOrders}
              >
                <option value="">
                  {loadingOrders ? 'جاري تحميل الأوامر...' : 'اختر أمر الشراء'}
                </option>
                {availablePurchaseOrders.map(order => (
                  <option key={order.purchase_orders_id} value={order.purchase_orders_id}>
                    أمر #{order.purchase_orders_id} - {formatLocalDateTime(order.purchase_orders_order_date)} - {formatMoney(order.purchase_orders_total_amount ?? 0)}
                  </option>
                ))}
              </select>
              {formData.supplier_id && !loadingOrders && availablePurchaseOrders.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">لا توجد أوامر شراء مكتملة لهذا المورد</p>
              )}
              {formData.purchase_order_id && selectedOrderDetails && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  <strong>تاريخ الأمر:</strong> {formatLocalDateTime(selectedOrderDetails.purchase_orders_order_date)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ المرتجع <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سبب المرتجع
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="اكتب سبب المرتجع..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="ملاحظات إضافية..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="rtl"
            />
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-800">عناصر المرتجع</h4>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm flex items-center gap-2"
                disabled={!formData.purchase_order_id || loadingOrderDetails}
              >
                <PlusIcon className="h-4 w-4" />
                إضافة عنصر
              </button>
            </div>

            {!formData.purchase_order_id && (
              <p className="mb-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                يرجى اختيار أمر شراء أولاً لإضافة عناصر المرتجع
              </p>
            )}

            {loadingOrderDetails && (
              <div className="mb-4 text-center">
                <Loader className="inline-block" />
                <p className="text-sm text-gray-500 mt-2">جاري تحميل تفاصيل الأمر...</p>
              </div>
            )}

            {/* Removed stray preview block that referenced 'item' outside its scope */}
            {errors.items && (
              <p className="mb-4 text-sm text-red-600">{errors.items}</p>
            )}

            <div className="space-y-4">
              {formData.items.map((item, index) => {
                return (
                  <div key={item.id} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-4">
                      <h5 className="font-medium text-gray-800">عنصر {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:bg-red-100 p-1 rounded-full"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          العنصر <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={getItemOptions()}
                          value={item.purchase_order_item_id || ''}
                          onChange={(value) => handleItemChange(index, 'purchase_order_item_id', value)}
                          placeholder="اختر العنصر"
                          renderOption={renderItemOption}
                          className={`${
                            errors[`item_${index}_purchase_order_item_id`] ? 'border-red-300' : ''
                          }`}
                        />
                        {errors[`item_${index}_purchase_order_item_id`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_purchase_order_item_id`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الكمية المُرتجعة <span className="text-red-500">*</span>
                        </label>
                        <NumberInput
                          value={item.quantity}
                          onChange={(val) => handleItemChange(index, 'quantity', val)}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          سعر الوحدة <span className="text-red-500">*</span>
                        </label>
                        <NumberInput
                          value={item.unit_price || ''}
                          onChange={(val) => handleItemChange(index, 'unit_price', val)}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`item_${index}_unit_price`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        <div className="text-xs text-gray-500 mt-1">{symbol}</div>
                        {errors[`item_${index}_unit_price`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_unit_price`]}</p>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Quantity Details Section */}
                    {item.purchase_order_item_id && selectedOrderDetails?.items && (
                      (() => {
                        // Find the order item directly here for debugging
                        const orderItem = selectedOrderDetails.items.find(oi => 
                          oi.purchase_order_items_id?.toString() === item.purchase_order_item_id?.toString()
                        );
                        
                        if (!orderItem) {
                          return (
                            <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-sm text-yellow-600">لم يتم العثور على تفاصيل العنصر</p>
                            </div>
                          );
                        }

                        const returnInfo = itemReturnInfo[item.purchase_order_item_id];
                        const orderedQuantity = parseFloat(orderItem.purchase_order_items_quantity_ordered) || 0;
                        const receivedQuantity = parseFloat(orderItem.purchase_order_items_quantity_received) || 0;
                        const returnedQuantity = parseFloat(returnInfo?.quantity_returned) || 0;
                        const unitCost = parseFloat(orderItem.purchase_order_items_unit_cost) || 0;
                        const baseUnit = orderItem.base_unit_name || '';
                        const packagingType = orderItem.packaging_type_name || '';
                        
                        // Determine the correct unit to display
                        // If packaging type exists and is not just the base unit, use packaging type
                        const displayUnit = packagingType && packagingType !== baseUnit ? packagingType : baseUnit;

                        return (
                          <div className="mt-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gray-200 px-4 py-2 border-b border-gray-300">
                              <h6 className="text-sm font-semibold text-gray-800 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                                تفاصيل الكمية والأسعار
                              </h6>
                            </div>
                            <div className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* المطلوب */}
                                <div className="text-center bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <div className="text-xs text-blue-600 font-medium mb-1">المطلوب</div>
                                  <div className="text-lg font-bold text-blue-700">
                                    {orderItem.purchase_order_items_quantity_ordered}
                                  </div>
                                  <div className="text-xs text-blue-500">{displayUnit}</div>
                                </div>

                                {/* المستلم */}
                                <div className="text-center bg-green-50 rounded-lg p-3 border border-green-200">
                                  <div className="text-xs text-green-600 font-medium mb-1">المستلم</div>
                                  <div className="text-lg font-bold text-green-700">
                                    {receivedQuantity}
                                  </div>
                                  <div className="text-xs text-green-500">{displayUnit}</div>
                                </div>

                                {/* المرتجع سابقاً */}
                                <div className="text-center bg-red-50 rounded-lg p-3 border border-red-200">
                                  <div className="text-xs text-red-600 font-medium mb-1">المرتجع سابقاً</div>
                                  <div className="text-lg font-bold text-red-700">
                                    {returnedQuantity}
                                  </div>
                                  <div className="text-xs text-red-500">{displayUnit}</div>
                                </div>

                                {/* سعر الوحدة */}
                                <div className="text-center bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                  <div className="text-xs text-yellow-600 font-medium mb-1">سعر الوحدة</div>
                                  <div className="text-lg font-bold text-yellow-700">
                                    {unitCost.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-yellow-500">{symbol} / {displayUnit}</div>
                                </div>
                              </div>

                              {/* المتاح للإرجاع */}
                              {(() => {
                                // For orders with 'Ordered' or 'Shipped' status, available for return = ordered quantity - returned quantity
                                // For orders with 'Received' or 'Partially Received' status, available for return = received quantity - returned quantity
                                const availableForReturn = receivedQuantity > 0 
                                  ? receivedQuantity - returnedQuantity
                                  : orderedQuantity - returnedQuantity;
                                return (
                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="flex items-center justify-center">
                                      <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
                                        <span className="text-sm font-medium text-purple-600">المتاح للإرجاع: </span>
                                        <span className="text-lg font-bold text-purple-700">
                                          {availableForReturn} {displayUnit}
                                        </span>
                                        {receivedQuantity === 0 && (
                                          <div className="text-xs text-purple-500 mt-1">
                                            (عناصر لم يتم استلامها بعد)
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })()
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ملاحظات العنصر
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        placeholder="ملاحظات خاصة بهذا العنصر..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        dir="rtl"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Level Discount Section */}
          {formData.items.length > 0 && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">خصم على الطلب</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مبلغ الخصم
                  </label>
                  <NumberInput
                    value={formData.order_discount || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, order_discount: val }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">{symbol}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات الخصم
                  </label>
                  <input
                    type="text"
                    value={formData.discount_notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_notes: e.target.value }))}
                    placeholder="سبب الخصم..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Total Calculation Section */}
          {formData.items.length > 0 && totalAmount > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200 shadow-sm">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-2">
                  حساب إجمالي المرتجع
                </h3>
              </div>
              <div className="space-y-3">
                {/* Items Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-md font-medium text-gray-600">مجموع العناصر:</span>
                  <span className="text-lg font-semibold text-gray-800">
                    {(() => {
                      const itemsTotal = formData.items.reduce((sum, item) => {
                        if (item.quantity && item.unit_price) {
                          return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
                        }
                        return sum;
                      }, 0);
                      return itemsTotal.toFixed(2);
                    })()} {symbol}
                  </span>
                </div>
                
                {/* Order Discount line removed per latest UI request */}
                
                {/* Divider */}
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">إجمالي مبلغ المرتجع:</span>
                    <span className="text-2xl font-bold text-green-600 bg-white px-4 py-2 rounded-lg border-2 border-green-200">
                      {totalAmount.toFixed(2)} {symbol}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2 text-right">
                * المبلغ محسوب بناءً على كمية وسعر العناصر المُرتجعة مطروحاً منه خصم الطلب
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 space-x-reverse pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ مرتجع الشراء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
