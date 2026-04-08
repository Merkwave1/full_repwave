// src/components/dashboard/tabs/inventory-management/Transfers/TransferDetailsModal.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TruckIcon,
  TagIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  InformationCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  Bars3BottomLeftIcon,
  CubeTransparentIcon, // For items
  CubeIcon, // Replaced BoxIcon with CubeIcon for packaging type
  ScaleIcon, // For base unit
  HashtagIcon, // Import HashtagIcon
  CheckCircleIcon, // Import CheckCircleIcon for Complete
  ExclamationTriangleIcon, // For warning
  PencilIcon, // For edit functionality
  PlusCircleIcon, // For add item functionality
  MinusCircleIcon, // For remove item functionality
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import { editTransfer } from '../../../../../apis/transfers'; // Corrected Import Path as requested
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';

// Reusable DetailItem component (assuming it's available or defined here)
const DetailItem = ({ icon, label, value, valueClassName = 'text-slate-800', children }) => (
  <div className="flex items-start justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center gap-2">
      {React.cloneElement(icon, { className: 'h-5 w-5 text-blue-500' })}
      <span className="font-medium text-gray-700">{label}:</span>
    </div>
    {children || (
      <span className={`font-semibold break-words text-right ${valueClassName}`}>
        {value ?? 'غير متوفر'}
      </span>
    )}
  </div>
);

// Basic Modal component (can be reused from common/Modal/Modal if available)
const Modal = ({ isOpen, dir = 'rtl', modalWidthClass = 'max-w-2xl', children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div
        className={`bg-white rounded-xl shadow-2xl p-6 ${modalWidthClass} w-full max-h-[90vh] overflow-hidden flex flex-col`}
        dir={dir}
      >
        {children}
      </div>
    </div>
  );
};


function TransferDetailsModal({ isOpen, onClose, transfer, warehouses, products, packagingTypes, baseUnits, onUpdateStatus, allInventoryItems, setGlobalMessage, refreshData }) {
  // Added setGlobalMessage and refreshData props
  const [isEditing, setIsEditing] = useState(false);
  const [editableNotes, setEditableNotes] = useState(transfer.notes || '');
  const [editableItems, setEditableItems] = useState([]);
  const [itemErrors, setItemErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editable items when modal opens or transfer changes
  useEffect(() => {
    if (transfer && Array.isArray(transfer.items)) {
      setEditableNotes(transfer.notes || '');
      // Deep copy items to avoid direct mutation
      setEditableItems(transfer.items.map(item => ({ ...item })));
      setItemErrors({});
      setIsEditing(false); // Reset editing mode on transfer change
    }
  }, [transfer]);

  // Helper to get warehouse name by ID
  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.warehouse_id === warehouseId);
    return warehouse ? `${warehouse.warehouse_name} (${warehouse.warehouse_code})` : 'غير معروف';
  };

  // Helper to get product/variant display name
  const getProductVariantDisplayName = useCallback((productId, variantId) => {
    const product = products.find(p => p.products_id === productId);
    if (!product) return 'منتج غير معروف';
    if (variantId) {
      const variant = product.variants?.find(v => v.variant_id === variantId);
      return variant ? `${product.products_name} - ${variant.variant_name}` : product.products_name;
    }
    return product.products_name;
  }, [products]);

  // Helper to get packaging type details by ID
  const getPackagingTypeDetails = useCallback((packagingTypeId) => {
    return packagingTypes.find(pt => pt.packaging_types_id === packagingTypeId);
  }, [packagingTypes]);

  const englishDecimalFormatter = useMemo(() => (
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  ), []);

  // Helper to get base unit name by ID
  const getBaseUnitName = useCallback((baseUnitId) => {
    if (!Array.isArray(baseUnits)) return 'غير معروف';
    const baseUnit = baseUnits.find(bu => bu.base_units_id === baseUnitId);
    return baseUnit ? baseUnit.base_units_name : 'غير معروف';
  }, [baseUnits]);

  // Normalize allInventoryItems (it might come wrapped as an object with a data array)
  const normalizedInventoryItems = useMemo(() => {
    if (Array.isArray(allInventoryItems)) return allInventoryItems;
    if (allInventoryItems && Array.isArray(allInventoryItems.data)) return allInventoryItems.data;
    return [];
  }, [allInventoryItems]);

  // Debug: Log inventory items to verify data
  useEffect(() => {
    console.log('[TransferDetailsModal] normalizedInventoryItems count:', normalizedInventoryItems.length);
    console.log('[TransferDetailsModal] transfer source warehouse:', transfer?.transfer_source_warehouse_id);
    console.log('[TransferDetailsModal] transfer destination warehouse:', transfer?.transfer_destination_warehouse_id);
    if (normalizedInventoryItems.length > 0) {
      console.log('[TransferDetailsModal] Sample inventory item:', normalizedInventoryItems[0]);
    }
  }, [normalizedInventoryItems, transfer]);

  // Helper to get available quantity in a specific warehouse
  const getAvailableQuantityInSpecificWarehouse = useCallback((productId, variantId, packagingTypeId, warehouseId) => {
    const relevantInventory = normalizedInventoryItems.filter(item => {
      const matchProduct = parseInt(item.products_id) === parseInt(productId);
      const matchVariant = (item.variant_id === null && variantId === null) || 
                          (item.variant_id !== null && variantId !== null && parseInt(item.variant_id) === parseInt(variantId));
      const matchPackaging = parseInt(item.packaging_type_id) === parseInt(packagingTypeId);
      const matchWarehouse = String(item.warehouse_id) === String(warehouseId);
      
      return matchProduct && matchVariant && matchPackaging && matchWarehouse;
    });
    
    // Debug log
    console.log(`[getAvailableQuantity] Checking: productId=${productId}, variantId=${variantId}, packagingId=${packagingTypeId}, warehouseId=${warehouseId}`);
    console.log(`[getAvailableQuantity] Found ${relevantInventory.length} matching items`);
    if (relevantInventory.length > 0) {
      console.log(`[getAvailableQuantity] Sample match:`, relevantInventory[0]);
    }
    
    const totalAvailable = relevantInventory.reduce((sum, item) => sum + (parseFloat(item.inventory_quantity) || 0), 0);
    console.log(`[getAvailableQuantity] Total available: ${totalAvailable}`);
    return totalAvailable;
  }, [normalizedInventoryItems]);

  // Memoized function to group and summarize transfer items by variant
  const groupedTransferItems = useMemo(() => {
    const grouped = {};

  if (Array.isArray(editableItems) && Array.isArray(products) && Array.isArray(packagingTypes) && Array.isArray(baseUnits) && Array.isArray(normalizedInventoryItems)) {
      editableItems.forEach(item => {
        const product = products.find(p => p.products_id === item.products_id);
        const packagingType = getPackagingTypeDetails(item.packaging_type_id);
        const baseUnit = product ? getBaseUnitName(product.products_unit_of_measure_id) : 'غير معروف';

        const variantKey = item.variant_id ? `v-${item.variant_id}` : `p-${item.products_id}`;
        const variantDisplayName = getProductVariantDisplayName(item.products_id, item.variant_id);

        if (!grouped[variantKey]) {
          grouped[variantKey] = {
            products_id: item.products_id,
            variant_id: item.variant_id,
            variant_display_name: variantDisplayName,
            base_unit_name: baseUnit,
            total_quantity_in_base_unit: 0,
            packaging_details: [],
          };
        }

        const conversionFactor = packagingType?.packaging_types_default_conversion_factor || 1;
        const quantityInBaseUnit = (parseFloat(item.quantity) || 0) * conversionFactor; // Use item.quantity

        grouped[variantKey].total_quantity_in_base_unit += quantityInBaseUnit;

        const availableInSource = getAvailableQuantityInSpecificWarehouse(
          item.products_id,
          item.variant_id,
          item.packaging_type_id,
          transfer.transfer_source_warehouse_id
        );
        const availableInDestination = getAvailableQuantityInSpecificWarehouse(
          item.products_id,
          item.variant_id,
          item.packaging_type_id,
          transfer.transfer_destination_warehouse_id
        );

        grouped[variantKey].packaging_details.push({
          ...item, // Include all item properties
          packaging_type_name: packagingType?.packaging_types_name || 'غير معروف',
          quantity_in_packaging_type: parseFloat(item.quantity) || 0, // Use item.quantity
          quantity_in_base_unit: quantityInBaseUnit,
          available_in_source: availableInSource,
          available_in_destination: availableInDestination,
        });
      });
    }
    return Object.values(grouped);
  }, [editableItems, products, packagingTypes, baseUnits, normalizedInventoryItems, transfer.transfer_destination_warehouse_id, transfer.transfer_source_warehouse_id, getAvailableQuantityInSpecificWarehouse, getPackagingTypeDetails, getBaseUnitName, getProductVariantDisplayName]);

  // Options for adding new items
  const availableInventoryOptions = useMemo(() => {
    const options = [];
    normalizedInventoryItems.forEach(item => {
      // Only show items from the source warehouse for adding to a transfer
      if (String(item.warehouse_id) === String(transfer.transfer_source_warehouse_id)) { // Convert both to string for comparison
        const product = products.find(p => p.products_id === item.products_id);
        const packagingType = packagingTypes.find(pt => pt.packaging_types_id === item.packaging_type_id);

        if (product && packagingType) {
    const label = `${getProductVariantDisplayName(item.products_id, item.variant_id)} - ${packagingType.packaging_types_name} (متاح: ${englishDecimalFormatter.format(parseFloat(item.inventory_quantity) || 0)})`;
          options.push({
            value: item.inventory_id,
            label: label,
            item_details: { // Store necessary details to reconstruct the item
              inventory_id: item.inventory_id,
              products_id: item.products_id,
              variant_id: item.variant_id,
              packaging_type_id: item.packaging_type_id,
              quantity: 1, // Default quantity when adding
            }
          });
        }
      }
    });
    return options;
  }, [normalizedInventoryItems, products, packagingTypes, transfer.transfer_source_warehouse_id, englishDecimalFormatter, getProductVariantDisplayName]);


  const handleQuantityChange = (inventoryId, newQuantity) => {
    setEditableItems(prevItems =>
      prevItems.map(item =>
        item.inventory_id === inventoryId ? { ...item, quantity: newQuantity } : item
      )
    );
    setItemErrors(prevErrors => ({ ...prevErrors, [`qty_${inventoryId}`]: null }));
  };

  const handleAddItem = (selectedOptionValue) => {
    const selectedItem = availableInventoryOptions.find(opt => opt.value === selectedOptionValue);
    if (selectedItem && !editableItems.some(item => item.inventory_id === selectedItem.value)) {
      setEditableItems(prevItems => [...prevItems, { ...selectedItem.item_details, quantity: 1 }]); // Add with default quantity 1
    } else if (selectedItem) {
      setGlobalMessage({ type: 'warning', message: 'هذا العنصر موجود بالفعل في التحويل.' });
    }
  };

  const handleRemoveItem = (inventoryIdToRemove) => {
    setEditableItems(prevItems => prevItems.filter(item => item.inventory_id !== inventoryIdToRemove));
    setItemErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[`qty_${inventoryIdToRemove}`];
      return newErrors;
    });
  };

  const validateEditForm = () => {
    const errors = {};
    if (editableItems.length === 0) {
      errors.general = 'الرجاء إضافة عنصر واحد على الأقل للتحويل.';
    }

    editableItems.forEach(item => {
      const quantity = parseFloat(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        errors[`qty_${item.inventory_id}`] = 'الكمية يجب أن تكون رقمًا موجبًا.';
      }
      // Add more specific validation if needed, e.g., against available stock in source
      // For 'Pending' transfers, we generally allow requesting more than available,
      // as the actual stock check happens on status change to 'In Transit'/'Completed'.
    });
    setItemErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!validateEditForm()) {
      setGlobalMessage({ type: 'error', message: 'الرجاء تصحيح الأخطاء في عناصر التحويل.' });
      return;
    }

    setIsSaving(true);
    try {
      const itemsPayload = editableItems.map(item => ({
        inventory_id: item.inventory_id,
        quantity: parseFloat(item.quantity),
        // Include other necessary fields if your backend needs them for new items
        products_id: item.products_id,
        variant_id: item.variant_id,
        packaging_type_id: item.packaging_type_id,
      }));

      const responseMessage = await editTransfer(transfer.transfer_id, {
        notes: editableNotes,
        items: itemsPayload,
      });

      setGlobalMessage({ type: 'success', message: responseMessage || 'تم تحديث التحويل بنجاح!' });
      setIsEditing(false); // Exit edit mode
      onClose(); // Close the modal
      refreshData(true); // Refresh parent data
    } catch (error) {
      setGlobalMessage({ type: 'error', message: error.message || 'فشل في تحديث التحويل.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !transfer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} dir="rtl" modalWidthClass="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl sticky top-0 z-10">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bars3BottomLeftIcon className="h-7 w-7 text-blue-600" />
          تفاصيل التحويل رقم {transfer.transfer_id}
        </h3>
        <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 flex-grow overflow-y-auto bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">معلومات التحويل الأساسية</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem icon={<BuildingOffice2Icon />} label="المخزن المصدر" value={getWarehouseName(transfer.transfer_source_warehouse_id)} />
            <DetailItem icon={<BuildingOffice2Icon />} label="المخزن الوجهة" value={getWarehouseName(transfer.transfer_destination_warehouse_id)} />
            <DetailItem icon={<InformationCircleIcon />} label="الحالة">
              <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                transfer.status === 'Completed' ? 'bg-green-100 text-green-800' :
                transfer.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                transfer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {transfer.status}
              </span>
            </DetailItem>
            <DetailItem icon={<CalendarDaysIcon />} label="تاريخ الإنشاء" value={transfer.created_at ? format(new Date(transfer.created_at), 'yyyy-MM-dd HH:mm') : 'غير متوفر'} />
            <div className="col-span-full">
              {isEditing ? (
                <div className="flex flex-col">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">ملاحظات:</label>
                  <textarea
                    id="notes"
                    value={editableNotes}
                    onChange={(e) => setEditableNotes(e.target.value)}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  ></textarea>
                </div>
              ) : (
                <DetailItem icon={<ChatBubbleBottomCenterTextIcon />} label="ملاحظات" value={editableNotes || 'لا يوجد'} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">عناصر التحويل (مجمعة حسب المنتج/الخيار)</h4>
          {editableItems.length === 0 && (
            <p className="text-center text-gray-600 py-4">لا توجد عناصر لهذا التحويل.</p>
          )}
          {itemErrors.general && <p className="text-red-600 text-center mb-4">{itemErrors.general}</p>}

          {groupedTransferItems.length > 0 ? (
            <div className="space-y-4">
              {groupedTransferItems.map((groupedItem, index) => (
                <div key={groupedItem.variant_key || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="text-lg font-semibold text-gray-700 mb-3 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <CubeTransparentIcon className="h-5 w-5 text-purple-600" />
                                {groupedItem.variant_display_name}
                              </span>
                              <span className="text-sm font-semibold text-gray-600">
                                إجمالي الكمية: {englishDecimalFormatter.format(groupedItem.total_quantity_in_base_unit || 0)} {groupedItem.base_unit_name}
                              </span>
                            </h5>
                  <div className="col-span-full">
                    <p className="font-medium text-gray-800 mb-2">تفاصيل التعبئة:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {groupedItem.packaging_details.map((pkg, pkgIndex) => {
                        const exceedsSource = pkg.quantity_in_packaging_type > pkg.available_in_source;
                        
                        // Enhanced styling for "متاح في المصدر"
                        const sourceAvailabilityClass = exceedsSource
                            ? 'text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md' // Red background for warning
                            : 'text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-md'; // Default gray for source

                        // "متاح في الوجهة" always gray
                        const destinationAvailabilityClass = 'text-gray-500'; // Always gray for destination

                        return (
                          <li key={pkg.inventory_id || pkgIndex} className="flex flex-wrap items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-center w-full sm:w-auto mb-2 sm:mb-0">
                              <span className="flex-none text-gray-700 mr-2">
                                {pkg.packaging_type_name} ({englishDecimalFormatter.format(pkg.quantity_in_base_unit || 0)} {groupedItem.base_unit_name}):
                              </span>
                              {isEditing ? (
                                <NumberInput
                                  value={pkg.quantity_in_packaging_type}
                                  onChange={(val) => handleQuantityChange(pkg.inventory_id, val)}
                                  className={`w-24 px-2 py-1 text-center text-sm ${itemErrors[`qty_${pkg.inventory_id}`] ? 'border-red-500' : 'border-gray-300'}`}
                                />
                              ) : (
                                <span className="font-semibold text-gray-800">
                                  {pkg.quantity_in_packaging_type}
                                </span>
                              )}
                              {isEditing && (
                                <button
                                  onClick={() => handleRemoveItem(pkg.inventory_id)}
                                  className="ml-2 p-1 text-red-600 hover:text-red-800 rounded-full"
                                  title="إزالة العنصر"
                                >
                                  <MinusCircleIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center w-full sm:w-auto sm:justify-end">
                                <span className={`text-xs mr-2 flex items-center ${sourceAvailabilityClass}`}>
                                  {exceedsSource && <ExclamationTriangleIcon className="h-4 w-4 ml-1 text-red-500" />}
                                  (متاح في المصدر: {englishDecimalFormatter.format(pkg.available_in_source || 0)} {pkg.packaging_type_name})
                                </span>
                                <span className={`text-xs flex items-center ${destinationAvailabilityClass}`}>
                                  {/* No warning icon for destination availability, as per request focus on source */}
                                  (متاح في الوجهة: {englishDecimalFormatter.format(pkg.available_in_destination || 0)} {pkg.packaging_type_name})
                                </span>
                            </div>
                            {itemErrors[`qty_${pkg.inventory_id}`] && (
                              <p className="text-red-600 text-xs mt-1 w-full">{itemErrors[`qty_${pkg.inventory_id}`]}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-4">لا توجد عناصر لهذا التحويل.</p>
          )}

          {isEditing && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <h5 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <PlusCircleIcon className="h-5 w-5 text-green-600" />
                إضافة عنصر جديد
              </h5>
              <div className="flex items-center gap-2">
                <div className="flex-grow">
                  <SearchableSelect
                    options={availableInventoryOptions}
                    onChange={handleAddItem}
                    placeholder="ابحث عن منتج لإضافته..."
                    value="" // Controlled component, reset value after selection
                  />
                </div>
                {/* No explicit add button needed, as selection triggers handleAddItem */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-100 border-t border-gray-200 rounded-b-xl sticky bottom-0">
        <div className="flex justify-center space-x-4 rtl:space-x-reverse">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveChanges}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={() => setIsEditing(false)} // Simply exit edit mode without saving
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                disabled={isSaving}
              >
                إلغاء
              </button>
            </>
          ) : (
            <>
              {/* Edit Button - Only for Pending transfers */}
              {transfer.status === 'Pending' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out shadow-md flex items-center gap-2"
                >
                  <PencilIcon className="h-5 w-5" />
                  تعديل التحويل
                </button>
              )}

              {/* Conditionally render status change buttons */}
              {/* Allow direct completion from Pending */}
              {transfer.status === 'Pending' && (
                <button
                  onClick={() => { onUpdateStatus(transfer, 'Completed'); onClose(); }}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out shadow-md flex items-center gap-2"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  تأكيد الاكتمال
                </button>
              )}
              {/* Keep 'In Transit' to 'Completed' transition */}
              {transfer.status === 'In Transit' && (
                <button
                  onClick={() => { onUpdateStatus(transfer, 'Completed'); onClose(); }}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out shadow-md flex items-center gap-2"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  تحويل إلى مكتمل
                </button>
              )}
              {/* Cancel button remains for Pending or In Transit */}
              {(transfer.status === 'Pending' || transfer.status === 'In Transit') && (
                <button
                  onClick={() => { onUpdateStatus(transfer, 'Cancelled'); onClose(); }}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out shadow-md flex items-center gap-2"
                >
                  <XMarkIcon className="h-5 w-5" />
                  إلغاء التحويل
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
              >
                إغلاق
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default TransferDetailsModal;
