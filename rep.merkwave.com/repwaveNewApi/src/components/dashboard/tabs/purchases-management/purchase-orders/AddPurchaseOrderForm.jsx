import React, { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import ConfirmOrderModal from "./ConfirmOrderModal";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";
import NumberInput from "../../../../common/NumberInput/NumberInput";
import useCurrency from "../../../../../hooks/useCurrency";
import { getCurrentLocalDateTime } from "../../../../../utils/dateUtils";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalSectionClass,
  modalSectionHeaderClass,
  modalInputClass,
} from "../../../../common/AppModalShell.jsx";
import { getProductPreferredPackagingIds } from "../../../../../utils/unwrapList";

export default function AddPurchaseOrderForm({
  onAdd,
  onCancel,
  suppliers,
  products,
  packagingTypes,
  warehouses,
  dataLoaded,
}) {
  const navigate = useNavigate();
  const { symbol, formatCurrency } = useCurrency();

  const displaySuppliers = Array.isArray(suppliers) ? suppliers : [];
  const displayWarehouses = Array.isArray(warehouses) ? warehouses : [];
  const displayProducts = Array.isArray(products) ? products : [];
  const displayPackagingTypes = Array.isArray(packagingTypes) ? packagingTypes : [];

  const [formData, setFormData] = useState({
    purchase_orders_supplier_id: "",
    purchase_orders_order_date: getCurrentLocalDateTime(),
    purchase_orders_notes: "",
    purchase_orders_warehouse_id: "",
    purchase_order_items: [],
  });

  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // Memoize a flattened list of all variants, including their parent product's name and base unit ID
  // Formatted for SearchableSelect: { value: variant_id, label: "Product Name - Variant Name" }
  const allVariantsOptions = useMemo(() => {
    const variantsList = [];
    displayProducts.forEach((product) => {
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          variantsList.push({
            value: String(variant.variant_id),
            label:
              variant.variant_name ||
              `${product.products_name} - #${variant.variant_id}`,
            products_id: product.products_id,
            products_unit_of_measure_id: product.products_unit_of_measure_id,
            preferred_packaging_ids: getProductPreferredPackagingIds(product),
          });
        });
      }
    });
    return variantsList;
  }, [displayProducts]);

  // Removed auto-select warehouse to enforce explicit user choice

  // Helper to filter packaging types by base unit ID (with universal fallback)
  const getCompatiblePackagingTypes = useCallback(
    (baseUnitId) => {
      if (!displayPackagingTypes.length) return [];
      const strictMatch = displayPackagingTypes.filter(
        (pt) =>
          pt.packaging_types_compatible_base_unit_id != null &&
          String(pt.packaging_types_compatible_base_unit_id) ===
            String(baseUnitId),
      );
      if (strictMatch.length > 0) return strictMatch;

      const universal = displayPackagingTypes.filter(
        (pt) => pt.packaging_types_compatible_base_unit_id == null,
      );
      return universal.length > 0 ? universal : displayPackagingTypes;
    },
    [displayPackagingTypes],
  );

  const getPreferredPackagingTypes = useCallback(
    (productId, baseUnitId) => {
      const compatible = getCompatiblePackagingTypes(baseUnitId);
      if (!productId) return compatible;
      const product = displayProducts.find(
        (p) => String(p.products_id) === String(productId),
      );
      const preferredIds = getProductPreferredPackagingIds(product);
      if (preferredIds.length === 0) return compatible;
      const preferred = compatible.filter((pt) =>
        preferredIds.includes(Number(pt.packaging_types_id)),
      );
      return preferred.length > 0 ? preferred : compatible;
    },
    [displayProducts, getCompatiblePackagingTypes],
  );

  const getPackagingOptionsForItem = useCallback(
    (item) => {
      if (item?.variant_id) {
        return getPreferredPackagingTypes(
          item.products_id,
          item.products_unit_of_measure_id,
        );
      }
      return displayPackagingTypes;
    },
    [displayPackagingTypes, getPreferredPackagingTypes],
  );

  const productSupportsPackaging = useCallback(
    (product, packagingTypeId) => {
      if (!product || !packagingTypeId) return false;
      const pkgId = Number(packagingTypeId);
      const preferredIds = getProductPreferredPackagingIds(product);
      if (preferredIds.includes(pkgId)) return true;

      const packagingType = displayPackagingTypes.find(
        (pt) => Number(pt.packaging_types_id) === pkgId,
      );
      if (!packagingType) return false;

      const baseUnitId = product.products_unit_of_measure_id;
      if (packagingType.packaging_types_compatible_base_unit_id == null) {
        return true;
      }
      return (
        String(packagingType.packaging_types_compatible_base_unit_id) ===
        String(baseUnitId)
      );
    },
    [displayPackagingTypes],
  );

  const resolveVariantForPackaging = useCallback(
    (packagingTypeId, currentItem) => {
      if (!packagingTypeId) return null;

      const candidates = allVariantsOptions.filter((opt) => {
        const product = displayProducts.find(
          (p) => String(p.products_id) === String(opt.products_id),
        );
        return productSupportsPackaging(product, packagingTypeId);
      });

      if (currentItem?.variant_id) {
        const currentMatch = candidates.find(
          (c) => String(c.value) === String(currentItem.variant_id),
        );
        if (currentMatch) return currentMatch;
      }

      if (currentItem?.products_id) {
        const sameProduct = candidates.find(
          (c) => String(c.products_id) === String(currentItem.products_id),
        );
        if (sameProduct) return sameProduct;
      }

      return candidates[0] ?? null;
    },
    [allVariantsOptions, displayProducts, productSupportsPackaging],
  );

  const getVariantOptionsForItem = useCallback(
    (item) => {
      if (!item?.packaging_type_id) return allVariantsOptions;
      return allVariantsOptions.filter((opt) => {
        const product = displayProducts.find(
          (p) => String(p.products_id) === String(opt.products_id),
        );
        return productSupportsPackaging(product, item.packaging_type_id);
      });
    },
    [allVariantsOptions, displayProducts, productSupportsPackaging],
  );

  // Helper: get registered price from products with packaging conversion
  const getRegisteredPrice = useCallback(
    (variantId, packagingTypeId) => {
      for (const product of displayProducts) {
        const variant = product.variants?.find(
          (v) => String(v.variant_id) === String(variantId),
        );
        if (!variant?.variant_cost_price) continue;

        let basePrice = parseFloat(variant.variant_cost_price);
        if (packagingTypeId) {
          const selectedPackaging = displayPackagingTypes.find(
            (pt) =>
              String(pt.packaging_types_id) === String(packagingTypeId),
          );
          const factor = parseFloat(
            selectedPackaging?.packaging_types_default_conversion_factor,
          );
          if (factor && !Number.isNaN(factor)) basePrice *= factor;
        }
        return basePrice;
      }
      return null;
    },
    [displayProducts, displayPackagingTypes],
  );

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
    const selectedVariantData = allVariantsOptions.find(
      (v) => v.value === selectedVariantValue,
    );

    if (selectedVariantData) {
      newItems[index] = {
        ...newItems[index],
        variant_id: selectedVariantData.value, // This is the variant_id or product_id if no variants
        products_id: selectedVariantData.products_id, // Associated product ID
        products_unit_of_measure_id:
          selectedVariantData.products_unit_of_measure_id,
      };

      // Auto-select first preferred+compatible packaging type if available; fallback to compatible
      const preferredPts = getPreferredPackagingTypes(
        selectedVariantData.products_id,
        selectedVariantData.products_unit_of_measure_id,
      );
      const currentPackagingValid =
        newItems[index].packaging_type_id &&
        preferredPts.some(
          (pt) =>
            String(pt.packaging_types_id) ===
            String(newItems[index].packaging_type_id),
        );

      if (!currentPackagingValid) {
        if (preferredPts.length > 0) {
          newItems[index].packaging_type_id =
            preferredPts[0].packaging_types_id.toString();
        } else {
          const compatiblePts = getCompatiblePackagingTypes(
            selectedVariantData.products_unit_of_measure_id,
          );
          newItems[index].packaging_type_id =
            compatiblePts[0]?.packaging_types_id?.toString() || "";
        }
      }

      if (newItems[index].packaging_type_id) {
        const price = getRegisteredPrice(
          newItems[index].variant_id,
          newItems[index].packaging_type_id,
        );
        if (price != null) {
          newItems[index].unit_cost = String(price);
        }
      }
    } else {
      // Reset if no variant is selected (e.g., placeholder selected)
      newItems[index] = {
        ...newItems[index],
        variant_id: "",
        products_id: "",
        products_unit_of_measure_id: null,
        packaging_type_id: "",
      };
    }
    setFormData((prevData) => ({
      ...prevData,
      purchase_order_items: newItems,
    }));
  };

  const handleItemPackagingSelect = (index, packagingTypeId) => {
    const newItems = [...formData.purchase_order_items];
    newItems[index] = {
      ...newItems[index],
      packaging_type_id: packagingTypeId || "",
    };

    if (packagingTypeId) {
      const resolved = resolveVariantForPackaging(
        packagingTypeId,
        newItems[index],
      );
      if (resolved) {
        newItems[index].variant_id = resolved.value;
        newItems[index].products_id = resolved.products_id;
        newItems[index].products_unit_of_measure_id =
          resolved.products_unit_of_measure_id;
      }

      const price = getRegisteredPrice(
        newItems[index].variant_id,
        packagingTypeId,
      );
      if (price != null) {
        newItems[index].unit_cost = String(price);
      }
    } else if (!newItems[index].variant_id) {
      newItems[index].products_id = "";
      newItems[index].products_unit_of_measure_id = null;
    }

    setFormData((prevData) => ({
      ...prevData,
      purchase_order_items: newItems,
    }));
  };

  const handleItemFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;

    if (name === "packaging_type_id") {
      handleItemPackagingSelect(index, value);
      return;
    }

    const newItems = [...formData.purchase_order_items];
    newItems[index] = {
      ...newItems[index],
      [name]: type === "checkbox" ? checked : value,
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
          products_id: "",
          variant_id: "",
          quantity_ordered: "",
          unit_cost: "",
          packaging_type_id: "",
          products_unit_of_measure_id: null,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      purchase_order_items: prevData.purchase_order_items.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleSaveAsDraft = async (e) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting) return;

    // Check for empty items (items without variant or packaging type selected)
    const emptyItems = formData.purchase_order_items.filter(
      (item) => !item.variant_id || !item.packaging_type_id,
    );
    if (emptyItems.length > 0) {
      alert(
        `يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل الحفظ`,
      );
      return;
    }

    // Filter out temporary frontend fields before submission
    const itemsToSubmit = formData.purchase_order_items.map((it) => {
      const { products_unit_of_measure_id: _omit, ...rest } = it;
      return rest;
    });
    const discountNote = formData.order_discount
      ? `\n(خصم أمر: ${formData.order_discount})`
      : "";
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onAdd({
        supplier_id: parseInt(formData.purchase_orders_supplier_id) || null,
        warehouse_id: formData.purchase_orders_warehouse_id
          ? parseInt(formData.purchase_orders_warehouse_id)
          : null,
        order_date: formData.purchase_orders_order_date || null,
        notes: ((formData.purchase_orders_notes || "") + discountNote) || null,
        status: "Draft",
        items: itemsToSubmit.map((it) => ({
          variant_id: it.variant_id ? parseInt(it.variant_id) : null,
          packaging_type_id: it.packaging_type_id
            ? parseInt(it.packaging_type_id)
            : null,
          quantity_ordered: parseInt(it.quantity_ordered) || 0,
          unit_cost: parseFloat(it.unit_cost) || 0,
        })),
      });
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleConfirmOrder = (e) => {
    e.preventDefault();
    setIsConfirmOrderModalOpen(true);
  };

  const handleFinalConfirmOrder = async () => {
    if (submitLockRef.current || isSubmitting) return;

    // Check for empty items (items without variant or packaging type selected)
    const emptyItems = formData.purchase_order_items.filter(
      (item) => !item.variant_id || !item.packaging_type_id,
    );
    if (emptyItems.length > 0) {
      alert(
        `يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل التأكيد`,
      );
      setIsConfirmOrderModalOpen(false);
      return;
    }

    // Filter out temporary frontend fields before submission
    const itemsToSubmit = formData.purchase_order_items.map((it) => {
      const { products_unit_of_measure_id: _omit, ...rest } = it;
      return rest;
    });
    const discountNote = formData.order_discount
      ? `\n(خصم أمر: ${formData.order_discount})`
      : "";
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onAdd({
        supplier_id: parseInt(formData.purchase_orders_supplier_id) || null,
        warehouse_id: formData.purchase_orders_warehouse_id
          ? parseInt(formData.purchase_orders_warehouse_id)
          : null,
        order_date: formData.purchase_orders_order_date || null,
        notes: ((formData.purchase_orders_notes || "") + discountNote) || null,
        status: "Ordered",
        items: itemsToSubmit.map((it) => ({
          variant_id: it.variant_id ? parseInt(it.variant_id) : null,
          packaging_type_id: it.packaging_type_id
            ? parseInt(it.packaging_type_id)
            : null,
          quantity_ordered: parseInt(it.quantity_ordered) || 0,
          unit_cost: parseFloat(it.unit_cost) || 0,
        })),
      });
      setIsConfirmOrderModalOpen(false);
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  // Calculation helpers (similar to sales order form but simplified for now)
  const calculateItemTotals = useCallback((item) => {
    const quantity = parseFloat(item.quantity_ordered) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const subtotal = quantity * unitCost;
    return { subtotal, total: subtotal };
  }, []);

  const orderTotals = useMemo(() => {
    const base = formData.purchase_order_items.reduce(
      (acc, item) => {
        const { subtotal, total } = calculateItemTotals(item);
        acc.subtotal += subtotal;
        acc.total += total;
        return acc;
      },
      { subtotal: 0, total: 0 },
    );
    const discountVal = parseFloat(formData.order_discount) || 0;
    const finalTotal = Math.max(base.total - discountVal, 0);
    return { ...base, discount: discountVal, finalTotal };
  }, [
    formData.purchase_order_items,
    formData.order_discount,
    calculateItemTotals,
  ]);
  const isFormActionDisabled =
    isSubmitting ||
    !formData.purchase_orders_supplier_id ||
    !formData.purchase_orders_warehouse_id ||
    formData.purchase_order_items.length === 0;

  const formatAmount = useCallback(
    (value, { withSymbol = false, fractionDigits = 2 } = {}) => {
      const numericValue = value == null || value === "" ? 0 : Number(value);
      return formatCurrency(numericValue, { withSymbol, fractionDigits });
    },
    [formatCurrency],
  );

  if (!Array.isArray(warehouses) || warehouses.length === 0) {
    return (
      <AppModalShell
        portal
        open
        onClose={onCancel}
        title="لا توجد مخازن"
        subtitle="أضف مخزناً أولاً لإنشاء أمر شراء"
        icon={ExclamationTriangleIcon}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
              إغلاق
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/inventory-management/warehouses")}
              className={modalPrimaryBtnClass}
            >
              الذهاب للمخازن
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 text-center py-4">
          يجب عليك أولاً إضافة مخزن قبل إضافة أمر شراء جديد.
        </p>
      </AppModalShell>
    );
  }

  return (
    <AppModalShell
      portal
      open
      onClose={onCancel}
      title="إضافة أمر شراء جديد"
      subtitle="اختر المورد والمخزن ثم أضف المنتجات"
      icon={ClipboardDocumentListIcon}
      size="3xl"
      bodyClassName="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-[#FAFAFE] max-h-[75vh]"
      footer={
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={isFormActionDisabled}
            className={`${modalSecondaryBtnClass} disabled:opacity-50`}
          >
            حفظ كمسودة
          </button>
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isFormActionDisabled}
            className={`${modalPrimaryBtnClass} disabled:opacity-50`}
          >
            تأكيد الطلب
          </button>
        </div>
      }
    >
      {!dataLoaded && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-500" />
          جاري تحميل الموردين والمنتجات وأنواع التعبئة…
        </div>
      )}

      {allVariantsOptions.length === 0 && dataLoaded && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          لا توجد منتجات/خيارات متاحة. أضف منتجات من إدارة المنتجات أولاً.
        </div>
      )}

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className={modalSectionClass}>
          <div className={modalSectionHeaderClass}>معلومات الطلب</div>
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label
                htmlFor="purchase_orders_supplier_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                المورد <span className="text-red-500">*</span>
              </label>
              <select
                id="purchase_orders_supplier_id"
                name="purchase_orders_supplier_id"
                value={formData.purchase_orders_supplier_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-[#8B5FD6] bg-white"
              >
                <option value="">اختر مورداً…</option>
                {displaySuppliers.map((s, i) => (
                  <option
                    key={`supplier-${s.supplier_id}-${i}`}
                    value={s.supplier_id}
                  >
                    {s.supplier_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="purchase_orders_warehouse_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                المخزن <span className="text-red-500">*</span>
              </label>
              <select
                id="purchase_orders_warehouse_id"
                name="purchase_orders_warehouse_id"
                value={formData.purchase_orders_warehouse_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-[#8B5FD6] bg-white"
              >
                <option value="">اختر مخزناً…</option>
                {displayWarehouses.map((w, i) => (
                  <option
                    key={`warehouse-${w.warehouse_id}-${i}`}
                    value={w.warehouse_id}
                  >
                    {w.warehouse_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="purchase_orders_order_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                تاريخ الطلب <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="purchase_orders_order_date"
                name="purchase_orders_order_date"
                value={formData.purchase_orders_order_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-[#8B5FD6]"
              />
            </div>
            <div>
              <label
                htmlFor="purchase_orders_notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ملاحظات
              </label>
              <textarea
                id="purchase_orders_notes"
                name="purchase_orders_notes"
                value={formData.purchase_orders_notes}
                onChange={handleChange}
                rows="2"
                maxLength={500}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-[#8B5FD6] resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Items ── */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              عناصر الطلب
              {formData.purchase_order_items.length > 0 && (
                <span className="mr-2 text-xs bg-[#EDE7FF] text-[#7A52C2] rounded-full px-2 py-0.5 font-medium normal-case">
                  {formData.purchase_order_items.length}
                </span>
              )}
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#8B5FD6] text-white hover:bg-[#7A52C2] transition shadow-sm"
            >
              <PlusCircleIcon className="h-4 w-4" />
              إضافة عنصر
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {formData.purchase_order_items.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <PlusCircleIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  لا توجد عناصر بعد — اضغط «إضافة عنصر» للبدء
                </p>
              </div>
            ) : (
              formData.purchase_order_items.map((item, index) => {
                const { subtotal, total } = calculateItemTotals(item);
                const packagingOptions = getPackagingOptionsForItem(item);
                const registeredPrice = getRegisteredPrice(
                  item.variant_id,
                  item.packaging_type_id,
                );
                const qty = parseFloat(item.quantity_ordered) || 0;
                const unitCost = parseFloat(item.unit_cost) || 0;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Item header bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-l from-[#F8F5FF] to-white border-b border-[#EDE7FF]">
                      <span className="text-xs font-semibold text-[#7A52C2]">
                        عنصر #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="حذف"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-3 sm:p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                        {/* Product */}
                        <div className="lg:col-span-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            المنتج / الخيار <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={getVariantOptionsForItem(item)}
                            value={item.variant_id}
                            onChange={(val) =>
                              handleItemVariantSelect(index, val)
                            }
                            placeholder="ابحث أو اختر…"
                            id={`item_variant_select_${index}`}
                            className="text-sm"
                          />
                        </div>

                        {/* Qty first — then packaging */}
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            الكمية <span className="text-red-500">*</span>
                          </label>
                          <NumberInput
                            value={String(item.quantity_ordered ?? "")}
                            onChange={(v) =>
                              handleItemFieldChange(index, {
                                target: { name: "quantity_ordered", value: v },
                              })
                            }
                            className="w-full px-2 py-2 text-sm"
                            placeholder="0"
                          />
                        </div>

                        {/* Packaging */}
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            نوع التعبئة <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="packaging_type_id"
                            value={item.packaging_type_id}
                            onChange={(e) => handleItemFieldChange(index, e)}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#8B5FD6] focus:border-[#8B5FD6]"
                          >
                            <option value="">
                              {packagingOptions.length
                                ? "اختر التعبئة…"
                                : "لا توجد تعبئة متاحة"}
                            </option>
                            {packagingOptions.map((pt) => (
                              <option
                                key={pt.packaging_types_id}
                                value={pt.packaging_types_id}
                              >
                                {pt.packaging_types_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Unit cost */}
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            سعر الوحدة
                          </label>
                          <NumberInput
                            value={String(item.unit_cost ?? "")}
                            onChange={(v) =>
                              handleItemFieldChange(index, {
                                target: { name: "unit_cost", value: v },
                              })
                            }
                            className="w-full px-2 py-2 text-sm"
                            placeholder="0.00"
                          />
                          {registeredPrice != null && (
                            <p className="mt-1 text-[10px] text-gray-400">
                              السعر المسجل:{" "}
                              <button
                                type="button"
                                className="font-medium text-[#8B5FD6] hover:underline"
                                onClick={() =>
                                  handleItemFieldChange(index, {
                                    target: {
                                      name: "unit_cost",
                                      value: String(registeredPrice),
                                    },
                                  })
                                }
                              >
                                {formatAmount(registeredPrice)} {symbol}
                              </button>
                            </p>
                          )}
                        </div>

                        {/* Line total */}
                        <div className="lg:col-span-2 flex flex-col justify-end">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            الإجمالي
                          </label>
                          <div className="rounded-xl border border-[#C4A8F0]/40 bg-gradient-to-l from-[#F3EEFF] to-white px-3 py-2.5 text-center">
                            <p className="text-[10px] text-gray-500 leading-tight">
                              {qty > 0 && unitCost > 0
                                ? `${qty} × ${formatAmount(unitCost)}`
                                : "—"}
                            </p>
                            <p className="text-base font-bold text-[#6B45B0] leading-tight mt-0.5">
                              {formatAmount(total, { withSymbol: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {formData.purchase_order_items.length > 0 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-dashed border-gray-400 text-gray-600 hover:bg-gray-100 transition"
                >
                  <PlusCircleIcon className="h-4 w-4" />
                  إضافة عنصر آخر
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Totals & Discount ── */}
        <div className="rounded-xl border border-[#C4A8F0]/30 overflow-hidden bg-gradient-to-l from-[#FAFAFE] to-[#F3EEFF]">
          <div className="px-4 sm:px-6 py-3 border-b border-[#EDE7FF] bg-white/70">
            <h4 className="text-sm font-semibold text-[#4A2D8C]">
              ملخص المبالغ
            </h4>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-center sm:text-right">
                <p className="text-xs text-gray-500 mb-1">إجمالي العناصر</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatAmount(orderTotals.subtotal, { withSymbol: true })}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {formData.purchase_order_items.length} عنصر
                </p>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                <label className="block text-xs text-gray-500 mb-2 text-center sm:text-right">
                  خصم على الطلب
                </label>
                <NumberInput
                  value={String(formData.order_discount ?? "")}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, order_discount: v }))
                  }
                  className="w-full px-2 py-2 text-sm text-center"
                  placeholder="0.00"
                />
              </div>
              <div className="rounded-xl bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] px-4 py-3 text-white text-center sm:text-right shadow-md">
                <p className="text-xs text-white/80 mb-1">الإجمالي النهائي</p>
                <p className="text-2xl font-extrabold tracking-tight">
                  {formatAmount(orderTotals.finalTotal || 0, {
                    withSymbol: true,
                  })}
                </p>
                {(orderTotals.discount || 0) > 0 && (
                  <p className="text-[11px] text-white/70 mt-1">
                    بعد خصم {formatAmount(orderTotals.discount, { withSymbol: true })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {isConfirmOrderModalOpen && (
        <ConfirmOrderModal
          isOpen={isConfirmOrderModalOpen}
          onClose={() => setIsConfirmOrderModalOpen(false)}
          onConfirm={handleFinalConfirmOrder}
          message={(() => {
            const subtotalLine = `إجمالي العناصر قبل الخصم: ${formatAmount(orderTotals.subtotal, { withSymbol: true })}`;
            const discountLine =
              (orderTotals.discount || 0) > 0
                ? `إجمالي الخصومات: ${formatAmount(orderTotals.discount, { withSymbol: true })}`
                : null;
            const finalTotalLine = `القيمة النهائية بعد الخصم: ${formatAmount(orderTotals.finalTotal, { withSymbol: true })}`;
            const itemsLine = `عدد العناصر في الطلب: ${formData.purchase_order_items.length}`;
            return [
              "هل أنت متأكد من تأكيد أمر الشراء وإنشاء فاتورة؟",
              "",
              subtotalLine,
              discountLine,
              finalTotalLine,
              itemsLine,
            ]
              .filter(Boolean)
              .join("\n");
          })()}
        />
      )}
    </AppModalShell>
  );
}
