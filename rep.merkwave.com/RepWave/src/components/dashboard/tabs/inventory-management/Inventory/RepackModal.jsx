// src/components/dashboard/tabs/inventory-management/Inventory/RepackModal.jsx
import React, { useState, useMemo, useEffect } from "react";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../common/Modal/Modal";
import Alert from "../../../../common/Alert/Alert";

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

export default function RepackModal({
  isOpen,
  onClose,
  onRepackConfirm,
  inventoryItem,
  packagingTypes,
  baseUnits,
  allowedTargetPackagingTypeIds,
}) {
  // theme colors from your page
  const THEME_DARK = "#1F2937";
  const THEME_ACCENT = "#8DD8F5";
  // rgb values (used for rgba backgrounds)
  const THEME_ACCENT_RGB = "141,216,245";
  const THEME_DARK_RGB = "31,41,55";

  // Initialize quantityToConvert to 0, as the step will handle initial increment
  const [quantityToConvert, setQuantityToConvert] = useState(0);
  const [toPackagingTypeId, setToPackagingTypeId] = useState("");
  const [error, setError] = useState(null);

  // Find the base unit of the current inventory item's product
  const currentBaseUnitId = useMemo(() => {
    return inventoryItem?.products_unit_of_measure_id;
  }, [inventoryItem]);

  // Find the current packaging type object
  const currentPackagingType = useMemo(() => {
    return Array.isArray(packagingTypes)
      ? packagingTypes.find(
          (pt) => pt.packaging_types_id === inventoryItem?.packaging_type_id,
        )
      : undefined;
  }, [packagingTypes, inventoryItem]);

  // Filter packaging types that share the same base unit as the current item
  // Exclude the current packaging type from compatible options
  const compatiblePackagingTypes = useMemo(() => {
    if (!Array.isArray(packagingTypes) || !currentBaseUnitId) return [];
    let list = packagingTypes.filter(
      (pt) =>
        pt.packaging_types_compatible_base_unit_id === currentBaseUnitId &&
        pt.packaging_types_id !== inventoryItem?.packaging_type_id,
    );
    if (
      Array.isArray(allowedTargetPackagingTypeIds) &&
      allowedTargetPackagingTypeIds.length > 0
    ) {
      const allowedSet = new Set(
        allowedTargetPackagingTypeIds.map((id) => parseInt(id)),
      );
      list = list.filter((pt) =>
        allowedSet.has(parseInt(pt.packaging_types_id)),
      );
    }
    return list;
  }, [
    packagingTypes,
    currentBaseUnitId,
    inventoryItem?.packaging_type_id,
    allowedTargetPackagingTypeIds,
  ]);

  // Find the selected target packaging type object
  const selectedToPackagingType = useMemo(() => {
    return compatiblePackagingTypes.find(
      (pt) => pt.packaging_types_id.toString() === toPackagingTypeId,
    );
  }, [compatiblePackagingTypes, toPackagingTypeId]);

  // Calculate the step size for increment/decrement buttons
  // This step size ensures that the target quantity is always a whole number.
  const conversionStep = useMemo(() => {
    if (!currentPackagingType || !selectedToPackagingType) return 1; // Default to 1 if no types selected

    const currentFactor = parseFloat(
      currentPackagingType.packaging_types_default_conversion_factor,
    );
    const targetFactor = parseFloat(
      selectedToPackagingType.packaging_types_default_conversion_factor,
    );

    if (
      isNaN(currentFactor) ||
      isNaN(targetFactor) ||
      currentFactor <= 0 ||
      targetFactor <= 0
    )
      return 1;

    // Convert factors to integers by multiplying by a large power of 10 to handle decimals
    const multiplier = 10000; // Adjust as needed for precision
    const intCurrentFactor = Math.round(currentFactor * multiplier);
    const intTargetFactor = Math.round(targetFactor * multiplier);

    // Calculate the step in terms of 'current packaging units'
    const commonMultiple = lcm(intCurrentFactor, intTargetFactor);
    const step = commonMultiple / intCurrentFactor;

    return Math.max(1, step);
  }, [currentPackagingType, selectedToPackagingType]);

  // Calculate equivalent quantity in target packaging type, ensuring it's a whole number
  const equivalentQuantityInTarget = useMemo(() => {
    const currentQty = quantityToConvert;
    const currentConversionFactor =
      parseFloat(
        currentPackagingType?.packaging_types_default_conversion_factor,
      ) || 1;
    const targetConversionFactor =
      parseFloat(
        selectedToPackagingType?.packaging_types_default_conversion_factor,
      ) || 1;

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
    setToPackagingTypeId(""); // Reset target packaging type
  }, [inventoryItem]);

  const handleIncrement = () => {
    setError(null); // Clear error on interaction
    if (!selectedToPackagingType) {
      setError("الرجاء اختيار نوع تعبئة أولاً لتحديد خطوة التحويل.");
      return;
    }

    setQuantityToConvert((prev) => {
      const newVal = prev + conversionStep;
      const availableQty = parseFloat(inventoryItem.inventory_quantity);
      if (newVal > availableQty) {
        setError(
          `لا يمكن أن تكون الكمية أكبر من الكمية المتاحة (${availableQty.toFixed(0)}).`,
        );
        return prev;
      }
      return newVal;
    });
  };

  const handleDecrement = () => {
    setError(null); // Clear error on interaction
    if (!selectedToPackagingType) {
      setError("الرجاء اختيار نوع تعبئة أولًا لتحديد خطوة التحويل.");
      return;
    }

    setQuantityToConvert((prev) => {
      const newVal = prev - conversionStep;
      if (newVal < 0) {
        setError("الكمية لا يمكن أن تكون أقل من صفر.");
        return prev;
      }
      return newVal;
    });
  };

  const handleConfirm = () => {
    setError(null);
    const quantity = quantityToConvert;

    if (quantity <= 0) {
      setError("الكمية يجب أن تكون رقمًا صحيحًا وموجبًا.");
      return;
    }
    if (!toPackagingTypeId) {
      setError("الرجاء اختيار نوع التعبئة للتحويل إليه.");
      return;
    }
    if (toPackagingTypeId === inventoryItem.packaging_type_id.toString()) {
      setError("لا يمكن التحويل إلى نفس نوع التعبئة الحالي.");
      return;
    }
    if (quantity > parseFloat(inventoryItem.inventory_quantity)) {
      setError(
        `الكمية المراد تحويلها (${quantity}) أكبر من الكمية المتاحة في المخزون (${parseFloat(inventoryItem.inventory_quantity).toFixed(0)}).`,
      );
      return;
    }
    if (selectedToPackagingType === undefined) {
      setError("نوع التعبئة المحدد غير صالح.");
      return;
    }
    if (equivalentQuantityInTarget === null) {
      setError(
        "لا يمكن إجراء هذا التحويل بكميات صحيحة. يرجى تعديل الكمية أو نوع التعبئة.",
      );
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تحويل تعبئة/تفكيك — ${inventoryItem?.variant_display_name}`}
    >
      <div
        className="p-3 sm:p-6 space-y-4 sm:space-y-6"
        dir="rtl"
        style={{ color: THEME_DARK }}
      >
        {error && <Alert type="error" message={error} className="mb-2" />}

        {/* ===== PRODUCT CARD ===== */}
        <div
          className="relative overflow-hidden rounded-2xl p-3 sm:p-5 shadow-lg"
          style={{
            background: `linear-gradient(135deg, rgba(${THEME_ACCENT_RGB},0.18), rgba(255,255,255,1))`,
            border: `1px solid rgba(${THEME_ACCENT_RGB},0.45)`,
          }}
        >
          <div className="absolute top-[-20px] right-[-20px] w-36 h-36 bg-blue-200 opacity-20 rounded-full filter blur-2xl" />

          <p className="text-xs uppercase tracking-wide opacity-70 mb-1">
            العنصر الحالي
          </p>

          <h3 className="font-extrabold text-base sm:text-lg mb-2">
            {inventoryItem?.variant_display_name}
          </h3>

          <div className="flex justify-between text-sm font-semibold">
            <span>الكمية المتاحة</span>
            <span className="text-lg">
              {parseFloat(inventoryItem?.inventory_quantity || 0).toFixed(0)}{" "}
              {currentPackagingType?.packaging_types_name || ""}
            </span>
          </div>
        </div>

        {/* ===== TARGET PACKAGING ===== */}
        <div className="bg-white rounded-2xl shadow-md p-3 sm:p-5 border">
          <p className="text-xs font-semibold opacity-70 mb-2">التحويل إلى</p>

          <select
            value={toPackagingTypeId}
            onChange={(e) => setToPackagingTypeId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-300 transition text-sm"
            style={{ borderColor: THEME_ACCENT }}
          >
            <option value="">اختر نوع تعبئة</option>
            {compatiblePackagingTypes.map((pt) => (
              <option key={pt.packaging_types_id} value={pt.packaging_types_id}>
                {pt.packaging_types_name} — معامل{" "}
                {pt.packaging_types_default_conversion_factor}
              </option>
            ))}
          </select>

          {compatiblePackagingTypes.length === 0 && (
            <p className="text-sm mt-2" style={{ color: "#cc3333" }}>
              لا توجد أنواع تعبئة متوافقة
              {Array.isArray(allowedTargetPackagingTypeIds) &&
              allowedTargetPackagingTypeIds.length > 0
                ? " ضمن التعبئة المفضلة لهذا المنتج."
                : " مع الوحدة الأساسية لهذا المنتج."}
            </p>
          )}
        </div>

        {/* ===== QUANTITY CONTROL ===== */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border space-y-4">
          <p className="text-xs font-semibold opacity-70 text-center">
            الكمية المراد تحويلها
          </p>

          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={handleDecrement}
              disabled={quantityToConvert <= 0 || !selectedToPackagingType}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow hover:scale-105 transition bg-white border"
              aria-label="decrement"
            >
              <MinusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div
              className="px-6 sm:px-10 py-3 sm:py-4 rounded-2xl text-2xl sm:text-3xl font-extrabold shadow-inner min-w-[80px] text-center"
              style={{
                background: "#f8fafc",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {quantityToConvert.toFixed(0)}
            </div>

            <button
              onClick={handleIncrement}
              disabled={!selectedToPackagingType}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow hover:scale-105 transition bg-white border"
              aria-label="increment"
            >
              <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {selectedToPackagingType && quantityToConvert > 0 && (
            <div
              className="text-center rounded-xl p-3 text-sm font-semibold"
              style={{
                background: `rgba(${THEME_ACCENT_RGB},0.12)`,
                border: `1px solid rgba(${THEME_ACCENT_RGB},0.35)`,
              }}
            >
              الناتج =
              {equivalentQuantityInTarget !== null ? (
                <span className="mx-1 text-lg font-extrabold">
                  {equivalentQuantityInTarget.toFixed(0)}
                </span>
              ) : (
                <span className="mx-1 text-red-600 font-bold">غير صالح</span>
              )}
              {selectedToPackagingType?.packaging_types_name || ""}
            </div>
          )}

          {!selectedToPackagingType && (
            <p
              className="text-sm mt-2 text-center"
              style={{ color: `rgba(${THEME_DARK_RGB},0.6)` }}
            >
              الرجاء اختيار نوع تعبئة جديد لحساب الكمية المحولة.
            </p>
          )}
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2 sm:pt-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border hover:bg-gray-50 transition"
          >
            إلغاء
          </button>

          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition"
            style={{
              background: `linear-gradient(135deg, ${THEME_DARK}, #0f172a)`,
              color: "white",
            }}
          >
            تنفيذ التحويل
          </button>
        </div>
      </div>
    </Modal>
  );
}
