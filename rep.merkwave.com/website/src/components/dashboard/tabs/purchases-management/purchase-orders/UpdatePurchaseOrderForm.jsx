// src/components/dashboard/tabs/purchases-management/purchase-orders/UpdatePurchaseOrderForm.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import { format } from 'date-fns'; // For date formatting
import useCurrency from '../../../../../hooks/useCurrency';

function UpdatePurchaseOrderForm({ order, onUpdate, onCancel, suppliers, products, packagingTypes, warehouses }) {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState(() => {
    return {
      purchase_orders_supplier_id: order.purchase_orders_supplier_id || '',
  // store as datetime-local format so input shows date+time
  purchase_orders_order_date: order.purchase_orders_order_date ? format(new Date(order.purchase_orders_order_date), "yyyy-MM-dd'T'HH:mm") : '',
      // expected delivery date hidden in Update form per new UX
      purchase_orders_status: order.purchase_orders_status || 'Draft',
      purchase_orders_notes: order.purchase_orders_notes || '',
      // Initialize warehouse ID as empty string. It will be set by useEffect once warehouses are loaded.
      purchase_orders_warehouse_id: '', 
      // order-level discount (matches AddPurchaseOrderForm's `order_discount` field)
      order_discount: order.purchase_orders_order_discount || order.purchase_orders_order_discount || '',
      purchase_order_items: [], // Initialize as empty, will be populated in useEffect
    };
  });

  const lastItemRef = useRef(null);

  // Helper to find product_id and products_unit_of_measure_id based on variant_id
  const getProductDetailsByVariantId = useCallback((variantId, allProducts) => {
    if (!Array.isArray(allProducts)) return { productId: '', productBaseUnitId: null };
    const product = allProducts.find(p =>
      Array.isArray(p.variants) && p.variants.some(v => v.variant_id === variantId)
    );
    return {
      productId: product ? product.products_id : '',
      productBaseUnitId: product ? product.products_unit_of_measure_id : null,
    };
  }, []); // No dependencies needed as it receives allProducts as an argument

  // Populate formData.purchase_order_items and selectedProductVariantsMap
  // once 'products' prop is available and stable.
  useEffect(() => {
    if (Array.isArray(products) && products.length > 0 && order.items && order.items.length > 0) {
      // Map incoming items to the simpler item shape used by AddPurchaseOrderForm
      const updatedItems = order.items.map(item => {
        const { productId, productBaseUnitId } = getProductDetailsByVariantId(item.purchase_order_items_variant_id, products);
        return {
          products_id: productId ? String(productId) : '',
          // SearchableSelect option values are strings, ensure variant_id is a string so the select shows the current value
          variant_id: item.purchase_order_items_variant_id != null ? String(item.purchase_order_items_variant_id) : '',
          quantity_ordered: item.purchase_order_items_quantity_ordered != null ? String(item.purchase_order_items_quantity_ordered) : '',
          unit_cost: item.purchase_order_items_unit_cost != null ? String(item.purchase_order_items_unit_cost) : '',
          packaging_type_id: item.purchase_order_items_packaging_type_id != null ? String(item.purchase_order_items_packaging_type_id) : '',
          products_unit_of_measure_id: productBaseUnitId,
        };
      });

      setFormData(prevData => ({
        ...prevData,
        purchase_order_items: updatedItems,
      }));
    } else if (order.items && order.items.length === 0) {
      // If order has no items, ensure formData.purchase_order_items is empty
      setFormData(prevData => ({
        ...prevData,
        purchase_order_items: [],
      }));
    }
  }, [order.items, products, getProductDetailsByVariantId]); // Depend on order.items and products

  // NEW: useEffect to set warehouse ID once warehouses prop is available
  useEffect(() => {
    // Only attempt to set if warehouses are loaded and order has a warehouse ID
    if (Array.isArray(warehouses) && warehouses.length > 0 && order.purchase_orders_warehouse_id) {
      // Ensure the warehouse ID from the order is a string to match select option values
      setFormData(prevData => ({
        ...prevData,
        purchase_orders_warehouse_id: String(order.purchase_orders_warehouse_id),
      }));
    }
  }, [warehouses, order.purchase_orders_warehouse_id]); // Depend on warehouses and the order's warehouse ID




  // Helper to filter packaging types by base unit ID
  const getCompatiblePackagingTypes = useCallback((baseUnitId) => {
    if (!baseUnitId || !Array.isArray(packagingTypes)) return [];
    return packagingTypes.filter(pt => pt.packaging_types_compatible_base_unit_id === baseUnitId);
  }, [packagingTypes]);

  // Helper: preferred packaging types for a product, fallback to compatible
  const getPreferredPackagingTypes = useCallback((productId, baseUnitId) => {
    const compatible = getCompatiblePackagingTypes(baseUnitId);
    if (!productId) return compatible;
    const product = Array.isArray(products) ? products.find(p => p.products_id?.toString() === productId?.toString()) : null;
    const preferredIds = Array.isArray(product?.preferred_packaging) ? product.preferred_packaging.map(p => p.packaging_types_id) : [];
    if (preferredIds.length === 0) return compatible;
    return compatible.filter(pt => preferredIds.includes(pt.packaging_types_id));
  }, [products, getCompatiblePackagingTypes]);

  // Calculation helper: simple subtotal per item (quantity * unit cost) — matches Add form (no per-item discount/tax)
  const calculateItemTotals = useCallback((item) => {
    const quantity = parseFloat(item.quantity_ordered) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const subtotal = quantity * unitCost;
    return { subtotal, total: subtotal };
  }, []);

  // Order totals: sum of items, then apply order-level discount
  const orderTotals = useMemo(() => {
    const base = formData.purchase_order_items.reduce((acc, item) => {
      const { subtotal, total } = calculateItemTotals(item);
      acc.subtotal += subtotal;
      acc.total += total;
      return acc;
    }, { subtotal: 0, total: 0 });
    const discountVal = parseFloat(formData.order_discount) || 0;
    const finalTotal = Math.max(base.total - discountVal, 0);
    return { ...base, discount: discountVal, finalTotal };
  }, [formData.purchase_order_items, formData.order_discount, calculateItemTotals]);

  // Memoize a flattened list of all variants for SearchableSelect
  const allVariantsOptions = useMemo(() => {
    const variantsList = [];
    if (Array.isArray(products)) {
      products.forEach(product => {
        if (Array.isArray(product.variants)) {
          product.variants.forEach(variant => {
            variantsList.push({
              value: variant.variant_id.toString(),
              // show only the variant/option name; fallback to 'خيار #id' if variant name missing
              label: variant.variant_name ? `${variant.variant_name}` : `خيار #${variant.variant_id}`,
              products_id: product.products_id,
              products_unit_of_measure_id: product.products_unit_of_measure_id,
              preferred_packaging_ids: Array.isArray(product.preferred_packaging)
                ? product.preferred_packaging.map(p => p.packaging_types_id)
                : [],
            });
          });
        } else {
          variantsList.push({
            value: product.products_id.toString(),
            label: product.products_name,
            products_id: product.products_id,
            products_unit_of_measure_id: product.products_unit_of_measure_id,
            preferred_packaging_ids: Array.isArray(product.preferred_packaging)
              ? product.preferred_packaging.map(p => p.packaging_types_id)
              : [],
          });
        }
      });
    }
    return variantsList;
  }, [products]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // New handlers for compact grid design
  const handleItemVariantSelect = (index, variantId) => {
    const newItems = [...formData.purchase_order_items];
    const selectedVariant = allVariantsOptions.find(v => v.value === variantId);
    
    if (selectedVariant) {
      newItems[index] = {
        ...newItems[index],
        variant_id: variantId,
        products_id: selectedVariant.products_id,
        products_unit_of_measure_id: selectedVariant.products_unit_of_measure_id,
        packaging_type_id: '', // Reset packaging
      };

      // Set preferred packaging if available
      const preferredPts = getPreferredPackagingTypes(
        selectedVariant.products_id,
        selectedVariant.products_unit_of_measure_id
      );
      if (preferredPts.length > 0) {
        newItems[index].packaging_type_id = preferredPts[0].packaging_types_id.toString();
      }
    }

    setFormData(prevData => ({
      ...prevData,
      purchase_order_items: newItems,
    }));
  };

  const handleItemFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newItems = [...formData.purchase_order_items];
    
    newItems[index] = {
      ...newItems[index],
      [name]: type === 'checkbox' ? checked : value,
    };

    setFormData(prevData => ({
      ...prevData,
      purchase_order_items: newItems,
    }));
  };

  const handleAddItem = () => {
    setFormData((prevData) => ({
      ...prevData,
      purchase_order_items: [
        ...prevData.purchase_order_items,
        {
          products_id: '',
          variant_id: '',
          quantity_ordered: '',
          unit_cost: '',
          packaging_type_id: '',
          products_unit_of_measure_id: null,
        },
      ],
    }));
    setTimeout(() => {
      if (lastItemRef.current) {
        lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleRemoveItem = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      purchase_order_items: prevData.purchase_order_items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check for empty items (items without variant or packaging type selected)
    const emptyItems = formData.purchase_order_items.filter(item => !item.variant_id || !item.packaging_type_id);
    if (emptyItems.length > 0) {
      alert(`يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل الحفظ`);
      return;
    }
    
    const itemsToSubmit = formData.purchase_order_items.map((it) => {
      const { products_unit_of_measure_id: _omit, ...rest } = it;
      return rest;
    });
    // Include order-level discount and append discount note to notes
    const discountNote = formData.order_discount ? `\n(خصم أمر: ${formData.order_discount})` : '';
    // Convert datetime-local to backend datetime format 'YYYY-MM-DD HH:mm:ss'
    let orderDateForBackend = formData.purchase_orders_order_date;
    if (orderDateForBackend && orderDateForBackend.includes('T')) {
      orderDateForBackend = orderDateForBackend.replace('T', ' ');
      // add seconds if missing
      if (orderDateForBackend.length === 16) orderDateForBackend = orderDateForBackend + ':00';
    }

    onUpdate({ 
        ...formData, 
        purchase_orders_id: order.purchase_orders_id, 
        purchase_orders_order_discount: formData.order_discount || 0,
        purchase_orders_notes: (formData.purchase_orders_notes || '') + discountNote,
        purchase_orders_order_date: orderDateForBackend,
        purchase_order_items: itemsToSubmit 
    });
  };

  const formatMoney = (val) => {
    const num = parseFloat(val) || 0;
    const fixed = num.toFixed(2);
    return (fixed === '-0.00') ? '0.00' : fixed;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">تعديل أمر الشراء</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="purchase_orders_supplier_id" className="block text-sm font-medium text-gray-700">
              المورد
            </label>
            <select
              id="purchase_orders_supplier_id"
              name="purchase_orders_supplier_id"
              value={formData.purchase_orders_supplier_id}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">اختر مورد</option>
              {Array.isArray(suppliers) && suppliers.map(supplier => (
                <option key={supplier.supplier_id} value={supplier.supplier_id}>
                  {supplier.supplier_name}
                </option>
              ))}
            </select>
          </div>
          {/* purchase order date hidden in Update form */}
          {/* expected delivery date intentionally removed for Update form */}
          {/* purchase order status moved to totals block */}
          {/* NEW: Warehouse Selection */}
          <div>
            <label htmlFor="purchase_orders_warehouse_id" className="block text-sm font-medium text-gray-700">
              المخزن
            </label>
            <select
              id="purchase_orders_warehouse_id"
              name="purchase_orders_warehouse_id"
              value={formData.purchase_orders_warehouse_id}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">اختر مخزن</option>
              {Array.isArray(warehouses) && warehouses.map(warehouse => (
                <option key={warehouse.warehouse_id} value={String(warehouse.warehouse_id)}> {/* FIX: Convert warehouse.warehouse_id to string */}
                  {warehouse.warehouse_name}
                </option>
              ))}
            </select>
          </div>
          {/* purchase order notes hidden in Update form */}
        </div>

        {/* Purchase Order Items Section */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-xl font-bold text-gray-800 mb-4">عناصر أمر الشراء</h4>
          {formData.purchase_order_items.length === 0 && (
            <p className="text-center text-gray-600">لا توجد عناصر في أمر الشراء. أضف عنصرًا واحدًا على الأقل.</p>
          )}

          {formData.purchase_order_items.map((item, index) => {
            const { total } = calculateItemTotals(item);
            return (
              <div key={index} ref={index === formData.purchase_order_items.length - 1 ? lastItemRef : null} className="bg-gray-50 p-3 rounded-md shadow-sm mb-3 border border-gray-200">
                <div className="grid grid-cols-8 gap-2 items-start">
                  {/* Variant */}
                  <div className="col-span-3">
                    <label htmlFor={`item_variant_select_${index}`} className="block text-xs font-medium text-gray-700 mb-1">المنتج / الخيار</label>
                    <SearchableSelect
                      options={allVariantsOptions}
                      value={item.variant_id}
                      onChange={(val) => handleItemVariantSelect(index, val)}
                      placeholder="اختر..."
                      id={`item_variant_select_${index}`}
                      className="text-xs"
                    />
                  </div>
                  {/* Packaging */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">التعبئة</label>
                    <select
                      name="packaging_type_id"
                      value={item.packaging_type_id}
                      onChange={(e) => handleItemFieldChange(index, e)}
                      className="block w-full px-1 py-1.5 border border-gray-300 rounded-md text-xs"
                    >
                      <option value="">--</option>
                      {item.products_unit_of_measure_id && Array.isArray(packagingTypes) && getPreferredPackagingTypes(item.products_id, item.products_unit_of_measure_id).map(pt => (
                        <option key={pt.packaging_types_id} value={pt.packaging_types_id}>{pt.packaging_types_name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Qty */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">الكمية</label>
                    <NumberInput value={String(item.quantity_ordered ?? '')} onChange={(v)=>handleItemFieldChange(index,{target:{name:'quantity_ordered', value:v}})} className="block w-full px-1 py-1.5 text-xs" placeholder="0" />
                  </div>
                  {/* Unit Cost */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">السعر</label>
                    <NumberInput value={String(item.unit_cost ?? '')} onChange={(v)=>handleItemFieldChange(index,{target:{name:'unit_cost', value:v}})} className="block w-full px-1 py-1.5 text-xs" placeholder="0.00" />
                  </div>
                  {/* Total */}
                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-700 mb-1">الإجمالي</label>
                    <div className="px-1 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-xs font-semibold">{formatMoney(total)}</div>
                  </div>
                  {/* Remove */}
                  <div className="flex items-center justify-center pt-5 col-span-1">
                    <button type="button" onClick={()=>handleRemoveItem(index)} className="text-red-600 hover:text-red-800" title="حذف">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Add Item Button */}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <PlusCircleIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
              إضافة عنصر
            </button>
          </div>
        </div>

        {/* Order-Level Discount & Totals (Centered) */}
        <div className="mt-10">
          <div className="max-w-4xl mx-auto bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch text-center">
              <div className="min-h-24 flex flex-col justify-center items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">إجمالي العناصر</label>
                <div className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-lg font-semibold text-gray-800">{formatMoney(orderTotals.subtotal)}</div>
              </div>
              <div className="min-h-24 flex flex-col justify-center items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">خصم على الطلب</label>
                <NumberInput value={String(formData.order_discount ?? '')} onChange={(v)=>setFormData(p=>({...p, order_discount:v}))} className="w-full px-3 py-3 text-lg text-center" placeholder="0.00" />
              </div>
              <div className="min-h-24 flex flex-col justify-center items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  id="purchase_orders_status"
                  name="purchase_orders_status"
                  value={formData.purchase_orders_status}
                  onChange={handleChange}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-center"
                >
                  {order.purchase_orders_status === 'Draft' ? (
                    <>
                      <option value="Draft">Draft</option>
                      <option value="Ordered">Ordered</option>
                      <option value="Cancelled">Cancelled</option>
                    </>
                  ) : (
                    <option value={order.purchase_orders_status}>{order.purchase_orders_status}</option>
                  )}
                </select>
                {order.purchase_orders_status !== 'Draft' && (
                  <p className="text-xs text-gray-500 mt-1">لا يمكن تغيير الحالة إلا من المسودة (Draft) إلى مطلوب (Ordered) أو ملغي (Cancelled)</p>
                )}
              </div>
              <div className="min-h-24 flex flex-col justify-center items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الطلب</label>
                <input
                  type="datetime-local"
                  id="purchase_orders_order_date"
                  name="purchase_orders_order_date"
                  value={formData.purchase_orders_order_date}
                  onChange={handleChange}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-center"
                />
              </div>
              {/* purchase order date and notes intentionally hidden in Update form */}
            </div>
            <div className="border-t border-gray-300"></div>
            <div className="flex items-center justify-between text-lg font-bold text-gray-800">
              <span>الإجمالي النهائي</span>
              <span className="text-green-700">{formatMoney(orderTotals.finalTotal||0)} <span className="text-gray-600 text-sm font-normal">{symbol}</span></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 space-x-reverse mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            تحديث أمر الشراء
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdatePurchaseOrderForm;
