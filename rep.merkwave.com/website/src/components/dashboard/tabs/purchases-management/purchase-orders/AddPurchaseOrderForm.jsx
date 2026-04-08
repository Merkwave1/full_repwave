import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircleIcon, MinusCircleIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmOrderModal from './ConfirmOrderModal';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect'; // Import the new SearchableSelect component
import NumberInput from '../../../../common/NumberInput/NumberInput';
import useCurrency from '../../../../../hooks/useCurrency';
import { getCurrentLocalDateTime } from '../../../../../utils/dateUtils';

export default function AddPurchaseOrderForm({ onAdd, onCancel, suppliers, products, packagingTypes, warehouses, dataLoaded }) {
  const navigate = useNavigate();
  const { symbol, formatCurrency } = useCurrency();

  // Debug logging for received props

  // Fallback data for testing
  const fallbackSuppliers = [
    { supplier_id: 1, supplier_name: 'مورد تجريبي 1' },
    { supplier_id: 2, supplier_name: 'مورد تجريبي 2' }
  ];

  const fallbackWarehouses = [
    { warehouse_id: 1, warehouse_name: 'المستودع الرئيسي' },
    { warehouse_id: 2, warehouse_name: 'مستودع الفرع' }
  ];

  // Use actual data if available, otherwise use fallback
  const displaySuppliers = Array.isArray(suppliers) && suppliers.length > 0 ? suppliers : fallbackSuppliers;
  const displayWarehouses = Array.isArray(warehouses) && warehouses.length > 0 ? warehouses : fallbackWarehouses;

  const [formData, setFormData] = useState({
    purchase_orders_supplier_id: '',
    purchase_orders_order_date: getCurrentLocalDateTime(),
    purchase_orders_notes: '',
    purchase_orders_warehouse_id: '',
    purchase_order_items: [],
  });

  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);

  // Memoize a flattened list of all variants, including their parent product's name and base unit ID
  // Formatted for SearchableSelect: { value: variant_id, label: "Product Name - Variant Name" }
  const allVariantsOptions = useMemo(() => {
    const variantsList = [];
    if (Array.isArray(products)) {
      products.forEach(product => {
        if (Array.isArray(product.variants)) {
          product.variants.forEach(variant => {
            variantsList.push({
              value: variant.variant_id.toString(),
              label: variant.variant_name || `خيار #${variant.variant_id}`,
              products_id: product.products_id,
              products_unit_of_measure_id: product.products_unit_of_measure_id,
              preferred_packaging_ids: Array.isArray(product.preferred_packaging)
                ? product.preferred_packaging.map(p => p.packaging_types_id)
                : [],
            });
          });
        } else {
          // If a product has no variants, treat the product itself as a "variant" option
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

  // Removed auto-select warehouse to enforce explicit user choice

  // Helper to filter packaging types by base unit ID
  const getCompatiblePackagingTypes = useCallback((baseUnitId) => {
    if (!baseUnitId || !Array.isArray(packagingTypes)) return [];
    return packagingTypes.filter(pt => pt.packaging_types_compatible_base_unit_id === baseUnitId);
  }, [packagingTypes]);

  // Helper to get preferred packaging types for a given product, falling back to compatible if none set
  const getPreferredPackagingTypes = useCallback((productId, baseUnitId) => {
    const compatible = getCompatiblePackagingTypes(baseUnitId);
    if (!productId) return compatible;
    const product = Array.isArray(products) ? products.find(p => p.products_id?.toString() === productId?.toString()) : null;
    const preferredIds = Array.isArray(product?.preferred_packaging) ? product.preferred_packaging.map(p => p.packaging_types_id) : [];
    if (preferredIds.length === 0) return compatible;
    return compatible.filter(pt => preferredIds.includes(pt.packaging_types_id));
  }, [products, getCompatiblePackagingTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Modified handleItemChange to work with SearchableSelect's single onChange
  const handleItemVariantSelect = (index, selectedVariantValue) => {
    const newItems = [...formData.purchase_order_items];
    const selectedVariantData = allVariantsOptions.find(v => v.value === selectedVariantValue);

    if (selectedVariantData) {
      newItems[index] = {
        ...newItems[index],
        variant_id: selectedVariantData.value, // This is the variant_id or product_id if no variants
        products_id: selectedVariantData.products_id, // Associated product ID
        products_unit_of_measure_id: selectedVariantData.products_unit_of_measure_id,
      };

      // Auto-select first preferred+compatible packaging type if available; fallback to compatible
      const preferredPts = getPreferredPackagingTypes(
        selectedVariantData.products_id,
        selectedVariantData.products_unit_of_measure_id
      );
      if (preferredPts.length > 0) {
        newItems[index].packaging_type_id = preferredPts[0].packaging_types_id.toString();
      } else {
        const compatiblePts = getCompatiblePackagingTypes(selectedVariantData.products_unit_of_measure_id);
        newItems[index].packaging_type_id = compatiblePts[0]?.packaging_types_id?.toString() || '';
      }
    } else {
      // Reset if no variant is selected (e.g., placeholder selected)
      newItems[index] = {
        ...newItems[index],
        variant_id: '',
        products_id: '',
        products_unit_of_measure_id: null,
        packaging_type_id: '',
      };
    }
    setFormData((prevData) => ({
      ...prevData,
      purchase_order_items: newItems,
    }));
  };

  // handleItemChange for other fields (quantity, cost, packaging type)
  const handleItemFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newItems = [...formData.purchase_order_items];
    newItems[index] = {
      ...newItems[index],
      [name]: type === 'checkbox' ? checked : value,
    };
    setFormData((prevData) => ({
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
  };

  const handleRemoveItem = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      purchase_order_items: prevData.purchase_order_items.filter((_, i) => i !== index),
    }));
  };

  const handleSaveAsDraft = (e) => {
    e.preventDefault();
    
    // Check for empty items (items without variant or packaging type selected)
    const emptyItems = formData.purchase_order_items.filter(item => !item.variant_id || !item.packaging_type_id);
    if (emptyItems.length > 0) {
      alert(`يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل الحفظ`);
      return;
    }
    
    // Filter out temporary frontend fields before submission
    const itemsToSubmit = formData.purchase_order_items.map((it) => {
      const { products_unit_of_measure_id: _omit, ...rest } = it;
      return rest;
    });
  const discountNote = formData.order_discount ? `\n(خصم أمر: ${formData.order_discount})` : '';
    onAdd({
      ...formData,
      purchase_orders_order_discount: formData.order_discount || 0,
      purchase_orders_notes: (formData.purchase_orders_notes || '') + discountNote,
      purchase_order_items: itemsToSubmit,
      purchase_orders_status: 'Draft'
    });
  };

  const handleConfirmOrder = (e) => {
    e.preventDefault();
    setIsConfirmOrderModalOpen(true);
  };

  const handleFinalConfirmOrder = () => {
    // Check for empty items (items without variant or packaging type selected)
    const emptyItems = formData.purchase_order_items.filter(item => !item.variant_id || !item.packaging_type_id);
    if (emptyItems.length > 0) {
      alert(`يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل التأكيد`);
      setIsConfirmOrderModalOpen(false);
      return;
    }
    
    // Filter out temporary frontend fields before submission
    const itemsToSubmit = formData.purchase_order_items.map((it) => {
      const { products_unit_of_measure_id: _omit, ...rest } = it;
      return rest;
    });
  const discountNote = formData.order_discount ? `\n(خصم أمر: ${formData.order_discount})` : '';
    onAdd({
      ...formData,
      purchase_orders_order_discount: formData.order_discount || 0,
      purchase_orders_notes: (formData.purchase_orders_notes || '') + discountNote,
      purchase_order_items: itemsToSubmit,
      purchase_orders_status: 'Ordered'
    });
    setIsConfirmOrderModalOpen(false);
  };

  // Calculation helpers (similar to sales order form but simplified for now)
  const calculateItemTotals = useCallback((item) => {
    const quantity = parseFloat(item.quantity_ordered) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const subtotal = quantity * unitCost;
    return { subtotal, total: subtotal };
  }, []);

  // Helper: get registered price from localStorage appProducts with packaging conversion
  const getRegisteredPrice = (variantId, packagingTypeId) => {
    try {
      // Get products from localStorage
      const appProducts = JSON.parse(localStorage.getItem('appProducts') || '{}');
      const productsData = appProducts.data || [];
      
      // Find variant in products data
      for (const product of productsData) {
        if (Array.isArray(product.variants)) {
          const variant = product.variants.find(v => v.variant_id?.toString() === variantId?.toString());
          if (variant && variant.variant_cost_price) {
            let basePrice = parseFloat(variant.variant_cost_price);
            
            // If packaging type is selected, apply conversion rate
            if (packagingTypeId && Array.isArray(packagingTypes)) {
              const selectedPackaging = packagingTypes.find(pt => pt.packaging_types_id?.toString() === packagingTypeId?.toString());
              if (selectedPackaging && selectedPackaging.packaging_types_default_conversion_factor) {
                const conversionRate = parseFloat(selectedPackaging.packaging_types_default_conversion_factor) || 1;
                basePrice = basePrice * conversionRate;
              }
            }
            
            return basePrice;
          }
        }
      }
    } catch (error) {
      console.error('Error getting registered price:', error);
    }
    return null;
  };

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
  const isFormActionDisabled = !formData.purchase_orders_supplier_id || !formData.purchase_orders_warehouse_id || formData.purchase_order_items.length === 0;

  const formatAmount = useCallback((value, { withSymbol = false, fractionDigits = 2 } = {}) => {
    const numericValue = value == null || value === '' ? 0 : Number(value);
    return formatCurrency(numericValue, { withSymbol, fractionDigits });
  }, [formatCurrency]);

  // Conditional rendering based on warehouses availability
  if (!Array.isArray(warehouses) || warehouses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto text-center" dir="rtl">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-4 text-2xl font-bold text-gray-800">لا توجد مخازن متاحة</h3>
        <p className="mt-2 text-gray-600">يجب عليك أولاً إضافة مخزن قبل إضافة أمر شراء جديد.</p>
        <div className="mt-6 flex justify-center gap-4">
           <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">رجوع</button>
          <button type="button" onClick={() => navigate('/dashboard/inventory-management/warehouses')} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">الذهاب لصفحة المخازن</button>
        </div>
      </div>
    );
  }

  return (
  <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة أمر شراء جديد</h3>
      
      {!dataLoaded && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 ml-2" />
            <p className="text-sm text-yellow-700">
              جاري تحميل البيانات... قد تظهر بيانات تجريبية حتى يتم تحميل البيانات الفعلية.
            </p>
          </div>
        </div>
      )}
      
        <form className="space-y-10">
          {/* Basic Supplier / Warehouse Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="purchase_orders_supplier_id" className="block text-sm font-medium text-gray-700">المورد</label>
              <select id="purchase_orders_supplier_id" name="purchase_orders_supplier_id" value={formData.purchase_orders_supplier_id} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">اختر مورد</option>
                {displaySuppliers.map((supplier, index) => (<option key={`supplier-${supplier.supplier_id}-${index}`} value={supplier.supplier_id}>{supplier.supplier_name}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="purchase_orders_warehouse_id" className="block text-sm font-medium text-gray-700">المخزن</label>
              <select id="purchase_orders_warehouse_id" name="purchase_orders_warehouse_id" value={formData.purchase_orders_warehouse_id} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">اختر مخزن</option>
                {displayWarehouses.map((warehouse, index) => (<option key={`warehouse-${warehouse.warehouse_id}-${index}`} value={warehouse.warehouse_id}>{warehouse.warehouse_name}</option>))}
              </select>
            </div>
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
              <div key={index} className="bg-gray-50 p-3 rounded-md shadow-sm mb-3 border border-gray-200">
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
                    <div className="mt-1 text-[10px] text-gray-500">
                      السعر المسجل: {(() => { 
                        const rp = getRegisteredPrice(item.variant_id, item.packaging_type_id); 
                        return rp != null ? `${formatAmount(rp)} ${symbol}` : 'غير محدد'; 
                      })()}
                    </div>
                  </div>
                  {/* Total */}
                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-700 mb-1">الإجمالي</label>
                    <div className="px-1 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-xs font-semibold">{formatAmount(total)}</div>
                  </div>
                  {/* Remove (inline) */}
                  <div className="flex items-center justify-center pt-5">
                    <button type="button" onClick={()=>handleRemoveItem(index)} className="text-red-600 hover:text-red-800" title="حذف">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Moved "إضافة عنصر" button to the bottom of the items list */}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إجمالي العناصر</label>
                <div className="px-4 py-3 bg-white border border-gray-300 rounded-md text-lg font-semibold text-gray-800">{formatAmount(orderTotals.subtotal, { withSymbol: true })}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">خصم على الطلب</label>
                <NumberInput value={String(formData.order_discount ?? '')} onChange={(v)=>setFormData(p=>({...p, order_discount:v}))} className="block w-full px-3 py-3 text-lg text-center" placeholder="0.00" />
                <small className="text-xs text-gray-500 mt-1 block">يتم طرح الخصم من إجمالي العناصر.</small>
              </div>
              <div>
                <label htmlFor="purchase_orders_order_date" className="block text-sm font-medium text-gray-700 mb-2">تاريخ الطلب</label>
                <input type="datetime-local" id="purchase_orders_order_date" name="purchase_orders_order_date" value={formData.purchase_orders_order_date} onChange={handleChange} required className="block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="md:col-span-3">
                <label htmlFor="purchase_orders_notes" className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <textarea id="purchase_orders_notes" name="purchase_orders_notes" value={formData.purchase_orders_notes} onChange={handleChange} rows="3" maxLength={500} className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
            </div>
            <div className="border-t border-gray-300"></div>
            <div className="flex items-center justify-between text-lg font-bold text-gray-800">
              <span>الإجمالي النهائي</span>
              <span className="text-green-700">{formatAmount(orderTotals.finalTotal || 0, { withSymbol: true })}</span>
            </div>
          </div>
        </div>

  {/* Removed duplicate bottom order date & notes section */}

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
            type="button"
            onClick={handleSaveAsDraft}
            disabled={isFormActionDisabled}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out ${isFormActionDisabled ? 'bg-yellow-300 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'}`}
          >
            حفظ كمسودة
          </button>
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isFormActionDisabled}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out ${isFormActionDisabled ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
          >
            تـأكيد أمر الشراء
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {isConfirmOrderModalOpen && (
        <ConfirmOrderModal
          isOpen={isConfirmOrderModalOpen}
          onClose={() => setIsConfirmOrderModalOpen(false)}
          onConfirm={handleFinalConfirmOrder}
          message={(() => {
            const subtotalLine = `إجمالي العناصر قبل الخصم: ${formatAmount(orderTotals.subtotal, { withSymbol: true })}`;
            const discountLine = (orderTotals.discount || 0) > 0
              ? `إجمالي الخصومات: ${formatAmount(orderTotals.discount, { withSymbol: true })}`
              : null;
            const finalTotalLine = `القيمة النهائية بعد الخصم: ${formatAmount(orderTotals.finalTotal, { withSymbol: true })}`;
            const itemsLine = `عدد العناصر في الطلب: ${formData.purchase_order_items.length}`;
            return [
              'هل أنت متأكد من تأكيد أمر الشراء وإنشاء فاتورة؟',
              '',
              subtotalLine,
              discountLine,
              finalTotalLine,
              itemsLine
            ].filter(Boolean).join('\n');
          })()}
        />
      )}
    </div>
  );
}
