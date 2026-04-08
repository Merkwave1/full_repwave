// src/components/dashboard/tabs/inventory-management/Inventory/RepackModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import Modal from '../../../../common/Modal/Modal';
import Alert from '../../../../common/Alert/Alert';

// Helper function to calculate GCD (Greatest Common Divisor)
const gcd = (a, b) => {
  if (b === 0) return a;
  return gcd(b, a % b);
};

// Helper function to calculate LCM (Least Common Multiple)
const lcm = (a, b) => {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
};

export default function RepackModal({ isOpen, onClose, onRepackConfirm, inventoryItem, packagingTypes, baseUnits, allowedTargetPackagingTypeIds }) {
  // Initialize quantityToConvert to 0, as the step will handle initial increment
  const [quantityToConvert, setQuantityToConvert] = useState(0);
  const [toPackagingTypeId, setToPackagingTypeId] = useState('');
  const [error, setError] = useState(null);

  // Find the base unit of the current inventory item's product
  const currentBaseUnitId = useMemo(() => {
    return inventoryItem?.products_unit_of_measure_id;
  }, [inventoryItem]);

  // Find the current packaging type object
  const currentPackagingType = useMemo(() => {
    return Array.isArray(packagingTypes) ? packagingTypes.find(pt => pt.packaging_types_id === inventoryItem?.packaging_type_id) : undefined;
  }, [packagingTypes, inventoryItem]);

  // Filter packaging types that share the same base unit as the current item
  // Exclude the current packaging type from compatible options
  const compatiblePackagingTypes = useMemo(() => {
    if (!Array.isArray(packagingTypes) || !currentBaseUnitId) return [];
    let list = packagingTypes.filter(pt => 
      pt.packaging_types_compatible_base_unit_id === currentBaseUnitId &&
      pt.packaging_types_id !== inventoryItem?.packaging_type_id
    );
    if (Array.isArray(allowedTargetPackagingTypeIds) && allowedTargetPackagingTypeIds.length > 0) {
      const allowedSet = new Set(allowedTargetPackagingTypeIds.map(id => parseInt(id)));
      list = list.filter(pt => allowedSet.has(parseInt(pt.packaging_types_id)));
    }
    return list;
  }, [packagingTypes, currentBaseUnitId, inventoryItem?.packaging_type_id, allowedTargetPackagingTypeIds]);

  // Find the selected target packaging type object
  const selectedToPackagingType = useMemo(() => {
    return compatiblePackagingTypes.find(pt => pt.packaging_types_id.toString() === toPackagingTypeId);
  }, [compatiblePackagingTypes, toPackagingTypeId]);

  // Calculate the step size for increment/decrement buttons
  // This step size ensures that the target quantity is always a whole number.
  const conversionStep = useMemo(() => {
    if (!currentPackagingType || !selectedToPackagingType) return 1; // Default to 1 if no types selected

    const currentFactor = parseFloat(currentPackagingType.packaging_types_default_conversion_factor);
    const targetFactor = parseFloat(selectedToPackagingType.packaging_types_default_conversion_factor);

    if (isNaN(currentFactor) || isNaN(targetFactor) || currentFactor <= 0 || targetFactor <= 0) return 1;

    // To ensure whole numbers in target, we need to find the smallest 'x' such that (x * currentFactor) / targetFactor is a whole number.
    // This is equivalent to finding the smallest 'x' such that (x * currentFactor) is a multiple of targetFactor.
    // Let ratio = currentFactor / targetFactor. We need x * ratio to be a whole number.
    // If ratio is a fraction a/b, we need x * a/b to be a whole number, so x must be a multiple of b.
    // More generally, we can use LCM.
    // The step in source units should be (targetFactor / GCD(currentFactor, targetFactor))
    // This simplifies to LCM(currentFactor, targetFactor) / currentFactor, but since factors can be decimals,
    // we need to work with ratios.

    // Convert factors to integers by multiplying by a large power of 10 to handle decimals
    const multiplier = 10000; // Adjust as needed for precision
    const intCurrentFactor = Math.round(currentFactor * multiplier);
    const intTargetFactor = Math.round(targetFactor * multiplier);

    // Calculate the step in terms of 'current packaging units'
    // This is the smallest number of 'current packaging units' that will result in a whole number of 'target packaging units'
    // and vice-versa.
    const commonMultiple = lcm(intCurrentFactor, intTargetFactor);
    const step = commonMultiple / intCurrentFactor;

    // If the step is very small (e.g., due to very different conversion factors),
    // we might still want a minimum step of 1 to avoid tiny increments.
    return Math.max(1, step); 

  }, [currentPackagingType, selectedToPackagingType]);

  // Calculate equivalent quantity in target packaging type, ensuring it's a whole number
  const equivalentQuantityInTarget = useMemo(() => {
    const currentQty = quantityToConvert;
    const currentConversionFactor = parseFloat(currentPackagingType?.packaging_types_default_conversion_factor) || 1;
    const targetConversionFactor = parseFloat(selectedToPackagingType?.packaging_types_default_conversion_factor) || 1;

    if (currentQty === 0 || targetConversionFactor === 0) return 0;

    const quantityInBaseUnits = currentQty * currentConversionFactor;
    const calculatedTargetQty = quantityInBaseUnits / targetConversionFactor;

    // Check if the calculated quantity is a whole number
    if (calculatedTargetQty % 1 !== 0) {
      return null; // Indicates it's not an exact whole number conversion
    }
    return calculatedTargetQty; // Return exact whole number
  }, [quantityToConvert, currentPackagingType, selectedToPackagingType]);

  // Effect to clear error when inputs change
  useEffect(() => {
    setError(null);
  }, [quantityToConvert, toPackagingTypeId]);

  // Ensure quantityToConvert is reset if inventoryItem changes (e.g., modal is reused for a different item)
  useEffect(() => {
    setQuantityToConvert(0); // Start at 0 for new item, let increment button set first step
    setToPackagingTypeId(''); // Reset target packaging type
  }, [inventoryItem]);


  const handleIncrement = () => {
    setError(null); // Clear error on interaction
    if (!selectedToPackagingType) {
        setError('الرجاء اختيار نوع تعبئة أولاً لتحديد خطوة التحويل.');
        return;
    }

    setQuantityToConvert(prev => {
      const newVal = prev + conversionStep;
      const availableQty = parseFloat(inventoryItem.inventory_quantity);
      if (newVal > availableQty) {
        setError(`لا يمكن أن تكون الكمية أكبر من الكمية المتاحة (${availableQty.toFixed(0)}).`);
        return prev;
      }
      return newVal;
    });
  };

  const handleDecrement = () => {
    setError(null); // Clear error on interaction
    if (!selectedToPackagingType) {
        setError('الرجاء اختيار نوع تعبئة أولاً لتحديد خطوة التحويل.');
        return;
    }

    setQuantityToConvert(prev => {
      const newVal = prev - conversionStep;
      if (newVal < 0) {
        setError('الكمية لا يمكن أن تكون أقل من صفر.');
        return prev;
      }
      return newVal;
    });
  };

  const handleConfirm = () => {
    setError(null);
    const quantity = quantityToConvert;

    if (quantity <= 0) {
      setError('الكمية يجب أن تكون رقمًا صحيحًا وموجبًا.');
      return;
    }
    if (!toPackagingTypeId) {
      setError('الرجاء اختيار نوع التعبئة للتحويل إليه.');
      return;
    }
    if (toPackagingTypeId === inventoryItem.packaging_type_id.toString()) {
      setError('لا يمكن التحويل إلى نفس نوع التعبئة الحالي.');
      return;
    }
    if (quantity > parseFloat(inventoryItem.inventory_quantity)) {
        setError(`الكمية المراد تحويلها (${quantity}) أكبر من الكمية المتاحة في المخزون (${parseFloat(inventoryItem.inventory_quantity).toFixed(0)}).`);
        return;
    }
    if (selectedToPackagingType === undefined) {
        setError('نوع التعبئة المحدد غير صالح.');
        return;
    }
    if (equivalentQuantityInTarget === null) {
        setError('لا يمكن إجراء هذا التحويل بكميات صحيحة. يرجى تعديل الكمية أو نوع التعبئة.');
        return;
    }

    onRepackConfirm({
      inventory_id: inventoryItem.inventory_id,
      to_packaging_type_id: toPackagingTypeId,
      quantity_to_convert: quantity,
    });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تحويل تعبئة/تفكيك لـ: ${inventoryItem?.variant_display_name}`}>
      <div className="p-6" dir="rtl">
        {error && <Alert type="error" message={error} className="mb-4" />}
        
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md mb-6">
            <p className="font-semibold text-lg mb-1">تفاصيل العنصر الحالي:</p>
            <p className="text-base">
                <span className="font-medium">المنتج:</span> {inventoryItem?.variant_display_name}
            </p>
            <p className="text-base">
                <span className="font-medium">الكمية المتاحة:</span> <span className="font-semibold">{parseFloat(inventoryItem?.inventory_quantity).toFixed(0)}</span> {currentPackagingType?.packaging_types_name || 'غير معروفة'}
            </p>
        </div>

        {/* Convert to Packaging Type - Placed first for better flow */}
        <div className="mb-6">
          <label htmlFor="toPackagingType" className="block text-sm font-medium text-gray-700 mb-2">
            التحويل إلى نوع التعبئة الجديد
          </label>
          <select
            id="toPackagingType"
            value={toPackagingTypeId}
            onChange={(e) => setToPackagingTypeId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">اختر نوع تعبئة</option>
            {compatiblePackagingTypes.map(pt => (
              <option key={pt.packaging_types_id} value={pt.packaging_types_id}>
                {pt.packaging_types_name} (معامل تحويل: {pt.packaging_types_default_conversion_factor})
              </option>
            ))}
          </select>
          {compatiblePackagingTypes.length === 0 && (
            <p className="text-sm text-red-500 mt-2">
              لا توجد أنواع تعبئة متوافقة{Array.isArray(allowedTargetPackagingTypeIds) && allowedTargetPackagingTypeIds.length > 0 ? ' ضمن التعبئة المفضلة لهذا المنتج.' : ' مع الوحدة الأساسية لهذا المنتج.'}
            </p>
          )}
        </div>

        {/* Quantity to Convert with Increment/Decrement Buttons */}
        <div className="mb-6">
          <label htmlFor="quantityToConvert" className="block text-sm font-medium text-gray-700 mb-2">
            الكمية المراد تحويلها (بالتعبئة الحالية)
          </label>
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <button
              type="button"
              onClick={handleDecrement}
              className="p-3 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150 ease-in-out"
              disabled={quantityToConvert <= 0 || !selectedToPackagingType} // Disable if no target type selected
            >
              <MinusIcon className="h-6 w-6 text-gray-700" />
            </button>
            <input
              type="text"
              id="quantityToConvert"
              value={quantityToConvert.toFixed(0)}
              readOnly
              className="w-24 text-xl font-bold px-3 py-2 border border-gray-300 rounded-md shadow-sm text-center bg-gray-100 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleIncrement}
              className="p-3 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150 ease-in-out"
              disabled={quantityToConvert >= parseFloat(inventoryItem?.inventory_quantity) || !selectedToPackagingType} // Disable if no target type selected
            >
              <PlusIcon className="h-6 w-6 text-gray-700" />
            </button>
          </div>
          {/* Display equivalent quantity in target packaging */}
          {selectedToPackagingType && quantityToConvert > 0 && (
            <p className="text-base text-gray-700 mt-4 text-center p-3 bg-indigo-50 border border-indigo-200 rounded-md">
              وهذا يعادل: 
              {equivalentQuantityInTarget !== null ? (
                <span className="font-extrabold text-indigo-700 text-lg ml-1">{equivalentQuantityInTarget.toFixed(0)}</span>
              ) : (
                <span className="font-bold text-red-700 text-lg ml-1">لا يمكن التحويل بكمية صحيحة</span>
              )}
              {selectedToPackagingType.packaging_types_name}
            </p>
          )}
          {!selectedToPackagingType && (
            <p className="text-sm text-gray-500 mt-2 text-center">الرجاء اختيار نوع تعبئة جديد لحساب الكمية المحولة.</p>
          )}
        </div>

        <div className="flex justify-end space-x-4 space-x-reverse mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-purple-600 hover:bg-purple-700 transition duration-150 ease-in-out"
          >
            تأكيد التحويل
          </button>
        </div>
      </div>
    </Modal>
  );
}
