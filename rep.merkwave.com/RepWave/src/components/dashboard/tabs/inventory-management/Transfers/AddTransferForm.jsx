// src/components/dashboard/tabs/inventory-management/Transfers/AddTransferForm.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';
import { PlusCircleIcon, MinusCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect'; // Reusing SearchableSelect
import { format } from 'date-fns'; // For date formatting
import ConfirmActionModal from '../../../../common/ConfirmActionModal';

// A reusable component for form sections to keep the design consistent.
function FormSection({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible mb-8" style={{position: 'relative', zIndex: 'auto'}}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-6 overflow-visible">
        {children}
      </div>
    </div>
  );
}

// Helper function to group variant stock (moved outside the component render to avoid Hook rule violation)
const groupVariantStock = (selectedVariantData, sourceWarehouseId, allInventoryItems) => {
    if (!selectedVariantData || !sourceWarehouseId || !Array.isArray(allInventoryItems)) return {};

    const filteredStock = allInventoryItems.filter(item => {
        const isCorrectVariant = (selectedVariantData.variant_id && item.variant_id === selectedVariantData.variant_id) ||
                                (!selectedVariantData.variant_id && item.products_id === selectedVariantData.products_id);
        return isCorrectVariant && String(item.warehouse_id) === sourceWarehouseId && parseFloat(item.inventory_quantity) > 0;
    });

    // Group by production date, then by packaging type
    const groupedByDate = filteredStock.reduce((acc, item) => {
        const dateKey = item.inventory_production_date ? format(new Date(item.inventory_production_date), 'yyyy-MM-dd') : 'No Production Date';
        if (!acc[dateKey]) acc[dateKey] = {};
        const packagingKey = item.packaging_type_name || 'No Packaging Type';
        if (!acc[dateKey][packagingKey]) acc[dateKey][packagingKey] = [];
        acc[dateKey][packagingKey].push(item);
        return acc;
    }, {});

    return groupedByDate;
};


export default function AddTransferForm({ onAdd, onCancel, warehouses, allInventoryItems, onRefreshSupporting, setGlobalMessage }) {
  const [formData, setFormData] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    // Use 'Pending' by default so the normal status-transition logic (update.php)
    // can run to move inventory when the transfer is progressed to 'In Transit' or 'Completed'.
    status: 'Pending',
    notes: '',
    // Each item in formData.items will represent a selected variant/product line
    // and will contain an array of specific inventory entries to transfer.
    items: [],
  });
  const [errors, setErrors] = useState({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const lastItemRef = useRef(null);

  // Debug warehouse data

  // Memoized options for warehouse dropdowns (no filtering) – ensure all warehouses appear
  const warehouseOptions = useMemo(() => {
    if (!Array.isArray(warehouses)) return [];
    
    // Sort: Main first then Van (if types exist)
    const sorted = [...warehouses].sort((a,b)=>{
      const ta = (a.warehouse_type || '').toLowerCase();
      const tb = (b.warehouse_type || '').toLowerCase();
      if (ta === tb) return a.warehouse_name.localeCompare(b.warehouse_name, 'ar');
      if (ta === 'main') return -1;
      if (tb === 'main') return 1;
      return a.warehouse_name.localeCompare(b.warehouse_name, 'ar');
    });
    
    
    const options = sorted.map(w => ({
      value: w.warehouse_id.toString(),
      label: `${w.warehouse_name} (${w.warehouse_code})${w.warehouse_type ? ' - ' + (w.warehouse_type === 'Van' ? 'فان' : w.warehouse_type) : ''}`
    }));
    return options;
  }, [warehouses]);

  const warehouseLabelMap = useMemo(() => {
    return warehouseOptions.reduce((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, [warehouseOptions]);

  const inventoryItemMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(allInventoryItems)) {
      allInventoryItems.forEach(item => {
        if (item?.inventory_id != null) {
          map.set(String(item.inventory_id), item);
        }
      });
    }
    return map;
  }, [allInventoryItems]);

  const englishQuantityFormatter = useMemo(() => (
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  ), []);

  const englishIntegerFormatter = useMemo(() => (
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })
  ), []);

  // Memoized list of unique variants/products available in inventory for selection
  const availableVariantsForTransferOptions = useMemo(() => {
    // Build an index by warehouse once to avoid repeated filtering on large arrays
    const warehouseIndex = new Map();
    if (Array.isArray(allInventoryItems)) {
      for (const item of allInventoryItems) {
        if (parseFloat(item.inventory_quantity) <= 0) continue;
        const wKey = String(item.warehouse_id);
        if (!warehouseIndex.has(wKey)) warehouseIndex.set(wKey, []);
        warehouseIndex.get(wKey).push(item);
      }
    }
    const sourceItems = warehouseIndex.get(formData.source_warehouse_id) || [];
    const uniqueVariants = new Map();
    for (const item of sourceItems) {
      const id = item.variant_id ? `v-${item.variant_id}` : `p-${item.products_id}`;
      if (!uniqueVariants.has(id)) {
        uniqueVariants.set(id, {
          value: id,
            label: item.variant_display_name,
            products_id: item.products_id,
            variant_id: item.variant_id,
        });
      }
    }
    return Array.from(uniqueVariants.values());
  }, [allInventoryItems, formData.source_warehouse_id]);


  // Effect to clear items when source warehouse changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      items: [], // Clear selected items if source warehouse changes
    }));
    setErrors({}); // Clear errors too
  }, [formData.source_warehouse_id]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleAddItemLine = () => {
    setFormData((prevData) => ({
      ...prevData,
      items: [
        ...prevData.items,
        {
          selected_variant_key: '', // e.g., 'v-52' or 'p-50'
          transfer_entries: [], // Array of { inventory_id, quantity } for this variant
        },
      ],
    }));
    setTimeout(() => {
      if (lastItemRef.current) {
        lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleRemoveItemLine = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      items: prevData.items.filter((_, i) => i !== index),
    }));
  };

  // Handle selection of a variant for a line item
  const handleVariantSelect = (index, selectedVariantKey) => {
    setFormData(prevData => {
      const newItems = [...prevData.items];
      newItems[index] = {
        ...newItems[index],
        selected_variant_key: selectedVariantKey,
        transfer_entries: [], // Reset entries when variant changes
      };
      return { ...prevData, items: newItems };
    });
    setErrors(prev => ({ ...prev, [`item_${index}_selected_variant_key`]: null }));
  };

  // Handle quantity input for a specific inventory_id within a variant's stock
  const handleQuantityInputChange = (itemLineIndex, inventoryId, value) => {
    setFormData(prevData => {
      const newItems = [...prevData.items];
      const currentItemLine = { ...newItems[itemLineIndex] };
      let newTransferEntries = [...currentItemLine.transfer_entries];

      const existingEntryIndex = newTransferEntries.findIndex(entry => String(entry.inventory_id) === String(inventoryId));
      const quantity = parseFloat(value);

      if (isNaN(quantity) || quantity <= 0) {
        // Remove entry if quantity is invalid or zero
        if (existingEntryIndex !== -1) {
          newTransferEntries = newTransferEntries.filter((_, i) => i !== existingEntryIndex);
        }
      } else {
        if (existingEntryIndex !== -1) {
          newTransferEntries[existingEntryIndex] = { ...newTransferEntries[existingEntryIndex], quantity: quantity };
        } else {
          newTransferEntries.push({ inventory_id: inventoryId, quantity: quantity });
        }
      }
      
      currentItemLine.transfer_entries = newTransferEntries;
      newItems[itemLineIndex] = currentItemLine;
      return { ...prevData, items: newItems };
    });
    setErrors(prev => ({ ...prev, [`item_${itemLineIndex}_quantity_${inventoryId}`]: null }));
  };


  const validateForm = () => {
    const newErrors = {};
    if (!formData.source_warehouse_id) {
      newErrors.source_warehouse_id = 'الرجاء اختيار المخزن المصدر.';
    }
    if (!formData.destination_warehouse_id) {
      newErrors.destination_warehouse_id = 'الرجاء اختيار المخزن الوجهة.';
    }
    if (formData.source_warehouse_id === formData.destination_warehouse_id && formData.source_warehouse_id !== '') {
      newErrors.destination_warehouse_id = 'لا يمكن أن يكون المخزن المصدر هو نفسه المخزن الوجهة.';
    }
    if (formData.items.length === 0) {
      newErrors.items = 'الرجاء إضافة عنصر واحد على الأقل للتحويل.';
    }

    let totalTransferItems = 0;
    formData.items.forEach((itemLine, lineIndex) => {
      if (!itemLine.selected_variant_key) {
        newErrors[`item_${lineIndex}_selected_variant_key`] = 'الرجاء اختيار منتج/خيار.';
      }
      if (itemLine.transfer_entries.length === 0) {
        newErrors[`item_${lineIndex}_transfer_entries`] = 'الرجاء تحديد كمية واحدة على الأقل لعنصر مخزون.';
      }

      itemLine.transfer_entries.forEach(entry => {
        const inventoryItem = allInventoryItems.find(inv => inv.inventory_id === entry.inventory_id);
        const quantity = parseFloat(entry.quantity);
        
        if (isNaN(quantity) || quantity <= 0) {
          newErrors[`item_${lineIndex}_quantity_${entry.inventory_id}`] = 'الكمية يجب أن تكون رقمًا موجبًا.';
        } else if (inventoryItem && quantity > parseFloat(inventoryItem.inventory_quantity)) {
          newErrors[`item_${lineIndex}_quantity_${entry.inventory_id}`] = `الكمية (${quantity}) تتجاوز المتاح (${parseFloat(inventoryItem.inventory_quantity)}).`;
        }
        totalTransferItems++;
      });
    });

    if (totalTransferItems === 0 && formData.items.length > 0) {
      newErrors.items = 'الرجاء تحديد عناصر وكميات للتحويل.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setGlobalMessage({ type: 'error', message: 'الرجاء تصحيح الأخطاء في النموذج.' });
      return;
    }

    // Flatten all transfer_entries from all item lines into a single array
    const flattenedItemsToSubmit = formData.items.flatMap(itemLine => itemLine.transfer_entries.map(entry => ({
        inventory_id: parseInt(entry.inventory_id),
        quantity: parseFloat(entry.quantity),
    })));

    const payload = {
      source_warehouse_id: parseInt(formData.source_warehouse_id),
      destination_warehouse_id: parseInt(formData.destination_warehouse_id),
      status: formData.status,
      notes: formData.notes,
      items: flattenedItemsToSubmit,
    };

    const totalQuantity = flattenedItemsToSubmit.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const itemsCount = flattenedItemsToSubmit.length;
    const packagingBreakdownMap = new Map();

    formData.items.forEach(itemLine => {
      itemLine.transfer_entries.forEach(entry => {
        const quantity = parseFloat(entry.quantity);
        if (!quantity || quantity <= 0) return;
        const record = inventoryItemMap.get(String(entry.inventory_id));
        const variantName = record?.variant_display_name || record?.product_name || 'عنصر';
        const packagingLabel = record?.packaging_type_name || 'وحدة';
        const mapKey = `${variantName}|||${packagingLabel}`;
        if (!packagingBreakdownMap.has(mapKey)) {
          packagingBreakdownMap.set(mapKey, {
            variantName,
            packagingLabel,
            quantity: 0,
          });
        }
        const aggregate = packagingBreakdownMap.get(mapKey);
        aggregate.quantity += quantity;
      });
    });

    const packagingBreakdown = Array.from(packagingBreakdownMap.values());
    const sourceLabel = warehouseLabelMap[formData.source_warehouse_id] || 'المخزن المصدر';
    const destinationLabel = warehouseLabelMap[formData.destination_warehouse_id] || 'المخزن الوجهة';

    setPendingSubmission({
      payload,
      totalQuantity,
      itemsCount,
      sourceLabel,
      destinationLabel,
      packagingBreakdown,
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (!pendingSubmission) return;
    onAdd(pendingSubmission.payload);
    setIsConfirmModalOpen(false);
    setPendingSubmission(null);
  };

  const confirmationMessage = useMemo(() => {
    if (!pendingSubmission) return '';
    const { totalQuantity, itemsCount, sourceLabel, destinationLabel, packagingBreakdown } = pendingSubmission;
    const quantityText = totalQuantity > 0
      ? `${englishQuantityFormatter.format(totalQuantity)} وحدة`
      : `${englishIntegerFormatter.format(itemsCount)} عنصر`;
    const baseText = `هل أنت متأكد من أنك تريد تحويل ${quantityText} من ${sourceLabel} إلى ${destinationLabel}؟`;
    if (!Array.isArray(packagingBreakdown) || packagingBreakdown.length === 0) {
      return baseText;
    }
    const lines = packagingBreakdown.map(item => `• ${englishQuantityFormatter.format(item.quantity)} ${item.packagingLabel} – ${item.variantName}`);
    return `${baseText}\n\n${lines.join('\n')}`;
  }, [pendingSubmission, englishIntegerFormatter, englishQuantityFormatter]);

  // Check if there are any warehouses to select from (essential for any transfer)
  if (!Array.isArray(warehouses) || warehouses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto text-center" dir="rtl">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-4 text-2xl font-bold text-gray-800">لا توجد مخازن متاحة</h3>
        <p className="mt-2 text-gray-600">يجب عليك أولاً إضافة مخازن قبل إنشاء تحويل.</p>
        <div className="mt-6 flex justify-center gap-4">
           <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">رجوع</button>
           {/* Add a navigate button here to warehouses page if needed */}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto overflow-visible" dir="rtl" style={{position: 'relative', zIndex: 1}}>
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة تحويل مخزون جديد</h3>
      <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">
        <FormSection title="تفاصيل التحويل">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
            <div>
              <label htmlFor="source_warehouse_id" className="block text-sm font-medium text-gray-700">
                المخزن المصدر
              </label>
              <SearchableSelect
                options={warehouseOptions}
                value={formData.source_warehouse_id}
                onChange={(value) => handleChange({ target: { name: 'source_warehouse_id', value } })}
                placeholder="اختر مخزن مصدر..."
                id="source_warehouse_id"
                className="mt-1"
              />
              {errors.source_warehouse_id && <p className="mt-2 text-sm text-red-600">{errors.source_warehouse_id}</p>}
            </div>
            {warehouses.length > 0 && warehouseOptions.length < warehouses.length && (
              <p className="text-xs text-yellow-600 mt-2">تنبيه: لم يتم تحميل كل المخازن بعد، الرجاء الانتظار لحظات...</p>
            )}
            <div>
              <label htmlFor="destination_warehouse_id" className="block text-sm font-medium text-gray-700">
                المخزن الوجهة
              </label>
              <SearchableSelect
                options={warehouseOptions}
                value={formData.destination_warehouse_id}
                onChange={(value) => handleChange({ target: { name: 'destination_warehouse_id', value } })}
                placeholder="اختر مخزن وجهة..."
                id="destination_warehouse_id"
                className="mt-1"
              />
              {errors.destination_warehouse_id && <p className="mt-2 text-sm text-red-600">{errors.destination_warehouse_id}</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                ملاحظات
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                maxLength={500}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              ></textarea>
            </div>
          </div>
        </FormSection>

        <FormSection title="عناصر التحويل">
          {formData.items.length === 0 && (
            <div className="text-center text-gray-600">
              <p>لا توجد عناصر في التحويل. أضف عنصرًا واحدًا على الأقل.</p>
              <div className="mt-2 flex justify-center gap-3">
                <button type="button" onClick={handleAddItemLine} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700">إضافة أول عنصر</button>
                {onRefreshSupporting && <button type="button" onClick={onRefreshSupporting} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">تحديث البيانات</button>}
              </div>
            </div>
          )}

          {errors.items && <p className="mt-2 text-sm text-red-600 text-center">{errors.items}</p>}

          {formData.items.map((itemLine, lineIndex) => {
            const selectedVariantData = availableVariantsForTransferOptions.find(opt => opt.value === itemLine.selected_variant_key);
            
            // Filter and group inventory items for the selected variant in the source warehouse
            // Moved useMemo outside of map to adhere to Rules of Hooks
            const groupedVariantStock = groupVariantStock(selectedVariantData, formData.source_warehouse_id, allInventoryItems);

            return (
              <div key={lineIndex} ref={lineIndex === formData.items.length - 1 ? lastItemRef : null} className="bg-gray-50 p-4 rounded-md shadow-sm mb-4 border border-gray-200 overflow-visible" style={{position: 'relative', zIndex: 'auto'}}>
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-lg font-semibold text-gray-700">عنصر التحويل #{lineIndex + 1}</h5>
                  <button
                    type="button"
                    onClick={() => handleRemoveItemLine(lineIndex)}
                    className="text-red-600 hover:text-red-800 focus:outline-none"
                    title="حذف هذا العنصر"
                  >
                    <MinusCircleIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="mb-4 overflow-visible">
                  <label htmlFor={`item_variant_select_${lineIndex}`} className="block text-sm font-medium text-gray-700">
                    المنتج / الخيار
                  </label>
                  <div className="flex gap-2 items-start overflow-visible">
                    <div className="flex-1 overflow-visible">
                      <SearchableSelect
                        options={availableVariantsForTransferOptions}
                        value={itemLine.selected_variant_key}
                        onChange={(value) => handleVariantSelect(lineIndex, value)}
                        placeholder={formData.source_warehouse_id ? (availableVariantsForTransferOptions.length ? 'اختر منتج أو خيار...' : 'لا يوجد مخزون متاح') : 'اختر المخزن المصدر أولاً'}
                        id={`item_variant_select_${lineIndex}`}
                        className="mt-1"
                        disabled={!formData.source_warehouse_id || availableVariantsForTransferOptions.length === 0}
                      />
                    </div>
                    {onRefreshSupporting && (
                      <button
                        type="button"
                        onClick={onRefreshSupporting}
                        className="mt-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                        title="تحديث البيانات"
                      >
                        تحديث
                      </button>
                    )}
                  </div>
                  {errors[`item_${lineIndex}_selected_variant_key`] && <p className="mt-2 text-sm text-red-600">{errors[`item_${lineIndex}_selected_variant_key`]}</p>}
                  {!formData.source_warehouse_id && (
                    <p className="mt-2 text-sm text-yellow-600">الرجاء اختيار المخزن المصدر أولاً لعرض المنتجات/الخيارات المتاحة.</p>
                  )}
                  {formData.source_warehouse_id && availableVariantsForTransferOptions.length === 0 && (
                    <p className="mt-2 text-sm text-blue-600">لا يوجد مخزون متاح في هذا المخزن لهذا التحويل حاليًا.</p>
                  )}
                </div>

                {selectedVariantData && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h6 className="text-md font-semibold text-gray-700 mb-3">المخزون المتاح لـ: {selectedVariantData.label}</h6>
                    
                    {Object.keys(groupedVariantStock).length === 0 ? (
                        <p className="text-center text-gray-500 py-4">لا يوجد مخزون متاح لهذا المنتج/الخيار في المخزن المصدر.</p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedVariantStock).map(([dateKey, packagingTypesData]) => (
                                <div key={dateKey} className="border border-gray-200 rounded-md overflow-hidden">
                                    <div className="bg-gray-100 p-3 font-semibold text-gray-700">
                                        تاريخ الإنتاج: {dateKey}
                                    </div>
                                    <div className="p-3">
                                        {Object.entries(packagingTypesData).map(([packagingKey, inventoryItems]) => (
                                            <div key={packagingKey} className="mb-3 last:mb-0 border-b last:border-b-0 pb-3 last:pb-0">
                                                <p className="font-medium text-gray-800 mb-2">{packagingKey}</p>
                                                {inventoryItems.map(invItem => {
                                                    const currentTransferQuantity = itemLine.transfer_entries.find(e => String(e.inventory_id) === String(invItem.inventory_id))?.quantity || '';
                                                    return (
                                                        <div key={invItem.inventory_id} className="flex items-center justify-between py-2 px-3 bg-white rounded-md shadow-sm mb-2 last:mb-0">
                              <span className="text-sm text-gray-700">
                                متاح: <span className="font-semibold">{englishIntegerFormatter.format(parseFloat(invItem.inventory_quantity) || 0)}</span> {invItem.packaging_type_name}
                              </span>
                                                            <div className="flex items-center">
                                                                <label htmlFor={`qty_${lineIndex}_${invItem.inventory_id}`} className="sr-only">الكمية</label>
                                <NumberInput
                                  id={`qty_${lineIndex}_${invItem.inventory_id}`}
                                  value={currentTransferQuantity}
                                  onChange={(val) => handleQuantityInputChange(lineIndex, invItem.inventory_id, val)}
                                  placeholder="الكمية"
                                  className="w-24 px-2 py-1 text-center text-sm"
                                />
                                                            </div>
                                                            {errors[`item_${lineIndex}_quantity_${invItem.inventory_id}`] && <p className="mt-2 text-sm text-red-600">{errors[`item_${lineIndex}_quantity_${invItem.inventory_id}`]}</p>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {errors[`item_${lineIndex}_transfer_entries`] && <p className="mt-2 text-sm text-red-600">{errors[`item_${lineIndex}_transfer_entries`]}</p>}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleAddItemLine}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <PlusCircleIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
              إضافة عنصر تحويل
            </button>
          </div>
        </FormSection>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 space-x-reverse mt-8 pt-5 border-t border-gray-200">
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">إلغاء</button>
          <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">إنشاء التحويل</button>
        </div>
      </form>
      <ConfirmActionModal
        isOpen={isConfirmModalOpen}
        onClose={() => { setIsConfirmModalOpen(false); setPendingSubmission(null); }}
        onConfirm={handleConfirmSubmit}
        message={confirmationMessage}
        confirmButtonText="تأكيد التحويل"
        cancelButtonText="إلغاء"
      />
    </div>
  );
}