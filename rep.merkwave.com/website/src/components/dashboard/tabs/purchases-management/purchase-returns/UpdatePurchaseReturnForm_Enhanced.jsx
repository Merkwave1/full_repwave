// Enhanced UpdatePurchaseReturnForm with proper partial return support
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import { getPurchaseReturnDetails } from '../../../../../apis/purchase_returns';
import { getReturnableQuantities } from '../../../../../apis/purchase_orders';
import useCurrency from '../../../../../hooks/useCurrency';

export default function UpdatePurchaseReturnFormEnhanced({
  purchaseReturn,
  suppliers,
  products,
  baseUnits,
  packagingTypes,
  purchaseOrders,
  onSubmit,
  onCancel,
  loading
}) {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_order_id: '',
    date: '',
    reason: '',
    notes: '',
    items: []
  });

  const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState([]);
  const [availableOrderItems, setAvailableOrderItems] = useState([]);
  const [returnableQuantities, setReturnableQuantities] = useState({});
  const [errors, setErrors] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  // Load purchase return details
  useEffect(() => {
    const loadPurchaseReturnDetails = async () => {
      setDataLoading(true);
      try {
        const details = await getPurchaseReturnDetails(purchaseReturn.purchase_returns_id);
        
        setFormData({
          supplier_id: details.purchase_return.purchase_returns_supplier_id?.toString() || '',
          purchase_order_id: details.purchase_return.purchase_returns_purchase_order_id?.toString() || '',
          date: details.purchase_return.purchase_returns_date?.split(' ')[0] || '',
          reason: details.purchase_return.purchase_returns_reason || '',
          notes: details.purchase_return.purchase_returns_notes || '',
          items: details.items?.map((item, index) => ({
            id: item.purchase_return_items_id || Date.now() + index,
            purchase_order_item_id: item.purchase_return_items_purchase_order_item_id?.toString() || '',
            quantity: item.purchase_return_items_quantity?.toString() || '',
            notes: item.purchase_return_items_notes || '',
            // Store additional data for partial return display
            unit_cost: item.purchase_return_items_unit_cost || 0,
            total_cost: item.purchase_return_items_total_cost || 0,
            // These will be populated when we load returnable quantities
            available_to_return_received: 0,
            available_to_return_not_received: 0,
            receive_status: '',
            product_name: '',
            product_variant_name: '',
            packaging_type_name: ''
          })) || []
        });

        // Load returnable quantities if we have a purchase order
        if (details.purchase_return.purchase_returns_purchase_order_id) {
          try {
            const returnableData = await getReturnableQuantities(details.purchase_return.purchase_returns_purchase_order_id);
            if (returnableData.items) {
              // Create a mapping of returnable quantities by purchase order item id
              const returnableMap = {};
              returnableData.items.forEach(item => {
                returnableMap[item.purchase_order_items_id] = {
                  available_to_return_received: parseFloat(item.available_to_return_received) || 0,
                  available_to_return_not_received: parseFloat(item.available_to_return_not_received) || 0,
                  receive_status: item.receive_status || 'لم يتم الاستلام',
                  product_name: item.product_name || '',
                  product_variant_name: item.product_variant_name || '',
                  packaging_type_name: item.packaging_type_name || '',
                  quantity_ordered: parseFloat(item.purchase_order_items_quantity_ordered) || 0,
                  quantity_received: parseFloat(item.purchase_order_items_quantity_received) || 0,
                  total_returned: parseFloat(item.total_returned) || 0
                };
              });
              setReturnableQuantities(returnableMap);

              // Update existing form items with returnable quantity data
              setFormData(prev => ({
                ...prev,
                items: prev.items.map(item => {
                  const returnableInfo = returnableMap[item.purchase_order_item_id];
                  return {
                    ...item,
                    ...returnableInfo,
                    // Calculate total available to return (for current return, we need to add back the current quantity)
                    total_available_to_return: returnableInfo ? 
                      (returnableInfo.available_to_return_received + returnableInfo.available_to_return_not_received + parseFloat(item.quantity)) : 0
                  };
                })
              }));
            }
          } catch (error) {
            console.error('Error loading returnable quantities:', error);
          }
        }
      } catch (error) {
        console.error('Error loading purchase return details:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (purchaseReturn?.purchase_returns_id) {
      loadPurchaseReturnDetails();
    }
  }, [purchaseReturn]);

  // Filter purchase orders based on selected supplier
  useEffect(() => {
    if (formData.supplier_id) {
      const filteredOrders = purchaseOrders.filter(
        order => order.purchase_orders_supplier_id?.toString() === formData.supplier_id &&
                 ['Ordered', 'Shipped', 'Received', 'Partially Received'].includes(order.purchase_orders_status)
      );
      setAvailablePurchaseOrders(filteredOrders);
    } else {
      setAvailablePurchaseOrders([]);
    }
  }, [formData.supplier_id, purchaseOrders]);

  // Get purchase order items when order is selected
  useEffect(() => {
    if (formData.purchase_order_id) {
      const selectedOrder = purchaseOrders.find(
        order => order.purchase_orders_id?.toString() === formData.purchase_order_id
      );
      if (selectedOrder && selectedOrder.items) {
        setAvailableOrderItems(selectedOrder.items);
      } else {
        setAvailableOrderItems([]);
      }

      // Also fetch returnable quantities for better display
      const fetchReturnableQuantities = async () => {
        try {
          const returnableData = await getReturnableQuantities(formData.purchase_order_id);
          if (returnableData.items) {
            // Create a mapping of returnable quantities by purchase order item id
            const returnableMap = {};
            returnableData.items.forEach(item => {
              returnableMap[item.purchase_order_items_id] = {
                available_to_return_received: parseFloat(item.available_to_return_received) || 0,
                available_to_return_not_received: parseFloat(item.available_to_return_not_received) || 0,
                receive_status: item.receive_status || 'لم يتم الاستلام',
                product_name: item.product_name || '',
                product_variant_name: item.product_variant_name || '',
                packaging_type_name: item.packaging_type_name || '',
                quantity_ordered: parseFloat(item.purchase_order_items_quantity_ordered) || 0,
                quantity_received: parseFloat(item.purchase_order_items_quantity_received) || 0,
                total_returned: parseFloat(item.total_returned) || 0
              };
            });
            setReturnableQuantities(returnableMap);
          }
        } catch (error) {
          console.error('Error loading returnable quantities:', error);
        }
      };

      fetchReturnableQuantities();
    } else {
      setAvailableOrderItems([]);
      setReturnableQuantities({});
    }
  }, [formData.purchase_order_id, purchaseOrders]);

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
    if (name === 'supplier_id' && value !== formData.supplier_id) {
      setFormData(prev => ({
        ...prev,
        purchase_order_id: '',
        items: []
      }));
    }

    // Reset items when purchase order changes
    if (name === 'purchase_order_id' && value !== formData.purchase_order_id) {
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
      notes: '',
      available_to_return_received: 0,
      available_to_return_not_received: 0,
      total_available_to_return: 0,
      receive_status: '',
      product_name: '',
      product_variant_name: '',
      packaging_type_name: ''
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

  const handleItemChange = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        
        const updatedItem = { ...item, [field]: value };
        
        // If changing the purchase order item, update the returnable quantities
        if (field === 'purchase_order_item_id' && value) {
          const returnableInfo = returnableQuantities[value];
          if (returnableInfo) {
            Object.assign(updatedItem, {
              ...returnableInfo,
              total_available_to_return: returnableInfo.available_to_return_received + returnableInfo.available_to_return_not_received
            });
          }
        }
        
        return updatedItem;
      })
    }));
  };

  const getOrderItemInfo = useCallback((orderItemId) => {
    const orderItem = availableOrderItems.find(item => 
      item.purchase_order_items_id?.toString() === orderItemId
    );
    if (!orderItem) return null;

    const product = products.find(p => p.product_variant_id === orderItem.purchase_order_items_variant_id);
    const baseUnit = baseUnits.find(u => u.base_unit_id === product?.product_variant_base_unit_id);
    const packagingType = packagingTypes.find(pt => pt.packaging_type_id === orderItem.purchase_order_items_packaging_type_id);

    // Get returnable quantity information
    const returnableInfo = returnableQuantities[orderItemId] || {};

    return {
      productName: product?.product_name || returnableInfo.product_name || 'منتج غير معروف',
      variantName: product?.product_variant_name || returnableInfo.product_variant_name || '',
      baseUnit: baseUnit?.base_unit_name || '',
      packagingType: packagingType?.packaging_type_name || returnableInfo.packaging_type_name || '',
      receivedQuantity: orderItem.purchase_order_items_quantity_received,
      orderedQuantity: orderItem.purchase_order_items_quantity_ordered,
      unitCost: orderItem.purchase_order_items_unit_cost,
      // Add partial return info
      availableToReturnReceived: returnableInfo.available_to_return_received || 0,
      availableToReturnNotReceived: returnableInfo.available_to_return_not_received || 0,
      receiveStatus: returnableInfo.receive_status || 'لم يتم الاستلام',
      totalAvailableToReturn: (returnableInfo.available_to_return_received || 0) + (returnableInfo.available_to_return_not_received || 0)
    };
  }, [availableOrderItems, products, baseUnits, packagingTypes, returnableQuantities]);

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

    // Validate items with proper partial return logic
    formData.items.forEach((item, index) => {
      if (!item.purchase_order_item_id) {
        newErrors[`item_${index}_purchase_order_item_id`] = 'العنصر مطلوب';
      }
      
      const quantity = parseFloat(item.quantity);
      
      if (!item.quantity || quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من صفر';
      } else if (item.total_available_to_return && quantity > item.total_available_to_return) {
        newErrors[`item_${index}_quantity`] = `الكمية تتجاوز المتاح للإرجاع (${item.total_available_to_return})`;
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

  const totalAmount = useMemo(() => {
    return formData.items.reduce((sum, item) => {
      const orderItemInfo = getOrderItemInfo(item.purchase_order_item_id);
      if (orderItemInfo && item.quantity) {
        return sum + (parseFloat(item.quantity) * parseFloat(orderItemInfo.unitCost));
      }
      return sum;
    }, 0);
  }, [formData.items, getOrderItemInfo]);

  if (dataLoading || loading) {
    return <Loader className="mt-8" />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">
              تعديل مرتجع الشراء #{purchaseReturn.purchase_returns_id}
            </h3>
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
                أمر الشراء (اختياري)
              </label>
              <select
                name="purchase_order_id"
                value={formData.purchase_order_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="rtl"
                disabled={!formData.supplier_id}
              >
                <option value="">اختر أمر الشراء</option>
                {availablePurchaseOrders.map(order => (
                  <option key={order.purchase_orders_id} value={order.purchase_orders_id}>
                    أمر #{order.purchase_orders_id} - {new Date(order.purchase_orders_date).toLocaleDateString('en-GB')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ المرتجع <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
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
                disabled={!formData.supplier_id}
              >
                <PlusIcon className="h-4 w-4" />
                إضافة عنصر
              </button>
            </div>

            {errors.items && (
              <p className="mb-4 text-sm text-red-600">{errors.items}</p>
            )}

            <div className="space-y-4">
              {formData.items.map((item, index) => {
                const orderItemInfo = getOrderItemInfo(item.purchase_order_item_id);
                
                return (
                  <div key={item.id} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h5 className="font-medium text-gray-800">عنصر {index + 1}</h5>
                        {(item.available_to_return_received > 0 || item.available_to_return_not_received > 0) && (
                          <div className="flex items-center gap-4 text-xs mt-1">
                            <div className="text-gray-500">
                              مطلوب: {item.quantity_ordered || orderItemInfo?.orderedQuantity || '0'}
                            </div>
                            <div className="text-gray-500">
                              مستلم: {item.quantity_received || orderItemInfo?.receivedQuantity || '0'}
                            </div>
                            <div className="text-red-500">
                              مُرتجع سابقاً: {item.total_returned || '0'}
                            </div>
                            {/* Show available quantities for partial returns */}
                            {item.available_to_return_not_received > 0 && (
                              <div className="text-orange-600 font-medium">
                                متاح للإرجاع (لم يتم استلامها): {item.available_to_return_not_received}
                              </div>
                            )}
                            {item.available_to_return_received > 0 && (
                              <div className="text-blue-600 font-medium">
                                متاح للإرجاع (في المخزون): {item.available_to_return_received}
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
                        )}
                      </div>
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
                        <select
                          value={item.purchase_order_item_id}
                          onChange={(e) => handleItemChange(item.id, 'purchase_order_item_id', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`item_${index}_purchase_order_item_id`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          dir="rtl"
                        >
                          <option value="">اختر العنصر</option>
                          {availableOrderItems.map(orderItem => {
                            const itemInfo = getOrderItemInfo(orderItem.purchase_order_items_id.toString());
                            return (
                              <option key={orderItem.purchase_order_items_id} value={orderItem.purchase_order_items_id}>
                                {itemInfo?.productName} {itemInfo?.variantName} - 
                                كمية مستلمة: {itemInfo?.receivedQuantity} {itemInfo?.baseUnit}
                              </option>
                            );
                          })}
                        </select>
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
                          onChange={(val) => handleItemChange(item.id, 'quantity', val)}
                          placeholder="0.00"
                          min="0"
                          max={item.total_available_to_return || undefined}
                          step="0.01"
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                        )}
                        {item.total_available_to_return > 0 && (
                          <div className="text-xs mt-1">
                            <span className="text-green-600">
                              إجمالي متاح للإرجاع: {item.total_available_to_return}
                              {item.available_to_return_not_received > 0 && item.available_to_return_received > 0 && (
                                <span className="text-gray-500 ml-2">
                                  (لم يتم استلامها: {item.available_to_return_not_received} + في المخزون: {item.available_to_return_received})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {orderItemInfo && (
                      <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">المنتج:</span>
                            <p>{orderItemInfo.productName}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">التكلفة:</span>
                            <p>{parseFloat(orderItemInfo.unitCost).toFixed(2)} {symbol}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">نوع التعبئة:</span>
                            <p>{orderItemInfo.packagingType}</p>
                          </div>
                          {item.quantity && (
                            <div>
                              <span className="font-medium text-gray-700">إجمالي المبلغ:</span>
                              <p className="font-bold text-blue-600">
                                {(parseFloat(item.quantity) * parseFloat(orderItemInfo.unitCost)).toFixed(2)} {symbol}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ملاحظات العنصر
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
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

          {/* Total Amount */}
          {formData.items.length > 0 && totalAmount > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">إجمالي مبلغ المرتجع:</span>
                <span className="text-xl font-bold text-green-600">{totalAmount.toFixed(2)} {symbol}</span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 space-x-reverse pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
