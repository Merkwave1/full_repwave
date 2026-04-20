import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import ConfirmOrderModal from "./ConfirmOrderModal";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect"; // Import the new SearchableSelect component
import NumberInput from "../../../../common/NumberInput/NumberInput";
import useCurrency from "../../../../../hooks/useCurrency";
import { getCurrentLocalDateTime } from "../../../../../utils/dateUtils";

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

  // Debug logging for received props

  // Fallback data for testing
  const fallbackSuppliers = [
    { supplier_id: 1, supplier_name: "مورد تجريبي 1" },
    { supplier_id: 2, supplier_name: "مورد تجريبي 2" },
  ];

  const fallbackWarehouses = [
    { warehouse_id: 1, warehouse_name: "المستودع الرئيسي" },
    { warehouse_id: 2, warehouse_name: "مستودع الفرع" },
  ];

  // Use actual data if available, otherwise use fallback
  const displaySuppliers =
    Array.isArray(suppliers) && suppliers.length > 0
      ? suppliers
      : fallbackSuppliers;
  const displayWarehouses =
    Array.isArray(warehouses) && warehouses.length > 0
      ? warehouses
      : fallbackWarehouses;

  const [formData, setFormData] = useState({
    purchase_orders_supplier_id: "",
    purchase_orders_order_date: getCurrentLocalDateTime(),
    purchase_orders_notes: "",
    purchase_orders_warehouse_id: "",
    purchase_order_items: [],
  });

  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);

  // Memoize a flattened list of all variants, including their parent product's name and base unit ID
  // Formatted for SearchableSelect: { value: variant_id, label: "Product Name - Variant Name" }
  const allVariantsOptions = useMemo(() => {
    const variantsList = [];
    if (Array.isArray(products)) {
      products.forEach((product) => {
        if (Array.isArray(product.variants)) {
          product.variants.forEach((variant) => {
            variantsList.push({
              value: variant.variant_id.toString(),
              label: variant.variant_name || `خيار #${variant.variant_id}`,
              products_id: product.products_id,
              products_unit_of_measure_id: product.products_unit_of_measure_id,
              preferred_packaging_ids: Array.isArray(
                product.preferred_packaging,
              )
                ? product.preferred_packaging.map((p) => p.packaging_types_id)
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
              ? product.preferred_packaging.map((p) => p.packaging_types_id)
              : [],
          });
        }
      });
    }
    return variantsList;
  }, [products]);

  // Removed auto-select warehouse to enforce explicit user choice

  // Helper to filter packaging types by base unit ID
  const getCompatiblePackagingTypes = useCallback(
    (baseUnitId) => {
      if (!baseUnitId || !Array.isArray(packagingTypes)) return [];
      return packagingTypes.filter(
        (pt) => pt.packaging_types_compatible_base_unit_id === baseUnitId,
      );
    },
    [packagingTypes],
  );

  // Helper to get preferred packaging types for a given product, falling back to compatible if none set
  const getPreferredPackagingTypes = useCallback(
    (productId, baseUnitId) => {
      const compatible = getCompatiblePackagingTypes(baseUnitId);
      if (!productId) return compatible;
      const product = Array.isArray(products)
        ? products.find(
            (p) => p.products_id?.toString() === productId?.toString(),
          )
        : null;
      const preferredIds = Array.isArray(product?.preferred_packaging)
        ? product.preferred_packaging.map((p) => p.packaging_types_id)
        : [];
      if (preferredIds.length === 0) return compatible;
      return compatible.filter((pt) =>
        preferredIds.includes(pt.packaging_types_id),
      );
    },
    [products, getCompatiblePackagingTypes],
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

  // handleItemChange for other fields (quantity, cost, packaging type)
  const handleItemFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
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

  const handleSaveAsDraft = (e) => {
    e.preventDefault();

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
    onAdd({
      ...formData,
      purchase_orders_order_discount: formData.order_discount || 0,
      purchase_orders_notes:
        (formData.purchase_orders_notes || "") + discountNote,
      purchase_order_items: itemsToSubmit,
      purchase_orders_status: "Draft",
    });
  };

  const handleConfirmOrder = (e) => {
    e.preventDefault();
    setIsConfirmOrderModalOpen(true);
  };

  const handleFinalConfirmOrder = () => {
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
    onAdd({
      ...formData,
      purchase_orders_order_discount: formData.order_discount || 0,
      purchase_orders_notes:
        (formData.purchase_orders_notes || "") + discountNote,
      purchase_order_items: itemsToSubmit,
      purchase_orders_status: "Ordered",
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
      const appProducts = JSON.parse(
        localStorage.getItem("appProducts") || "{}",
      );
      const productsData = appProducts.data || [];

      // Find variant in products data
      for (const product of productsData) {
        if (Array.isArray(product.variants)) {
          const variant = product.variants.find(
            (v) => v.variant_id?.toString() === variantId?.toString(),
          );
          if (variant && variant.variant_cost_price) {
            let basePrice = parseFloat(variant.variant_cost_price);

            // If packaging type is selected, apply conversion rate
            if (packagingTypeId && Array.isArray(packagingTypes)) {
              const selectedPackaging = packagingTypes.find(
                (pt) =>
                  pt.packaging_types_id?.toString() ===
                  packagingTypeId?.toString(),
              );
              if (
                selectedPackaging &&
                selectedPackaging.packaging_types_default_conversion_factor
              ) {
                const conversionRate =
                  parseFloat(
                    selectedPackaging.packaging_types_default_conversion_factor,
                  ) || 1;
                basePrice = basePrice * conversionRate;
              }
            }

            return basePrice;
          }
        }
      }
    } catch (error) {
      console.error("Error getting registered price:", error);
    }
    return null;
  };

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

  // Conditional rendering based on warehouses availability
  if (!Array.isArray(warehouses) || warehouses.length === 0) {
    return (
      <div
        className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto text-center"
        dir="rtl"
      >
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-4 text-2xl font-bold text-gray-800">
          لا توجد مخازن متاحة
        </h3>
        <p className="mt-2 text-gray-600">
          يجب عليك أولاً إضافة مخزن قبل إضافة أمر شراء جديد.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            رجوع
          </button>
          <button
            type="button"
            onClick={() =>
              navigate("/dashboard/inventory-management/warehouses")
            }
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            الذهاب لصفحة المخازن
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-6xl mx-auto overflow-hidden"
      dir="rtl"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-gradient-to-l from-[#1F2937] to-[#02415A] text-white">
        <div>
          <h3 className="text-lg sm:text-2xl font-bold leading-tight">
            إضافة أمر شراء جديد
          </h3>
          <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
            أملأ التفاصيل أدناه ثم احفظ كمسودة أو أكّد الطلب
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-white/20 transition"
          aria-label="إغلاق"
        >
          <MinusCircleIcon className="h-6 w-6 text-white" />
        </button>
      </div>

      {!dataLoaded && (
        <div className="mx-4 sm:mx-8 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-500" />
          جاري تحميل البيانات… قد تظهر بيانات تجريبية حتى يكتمل التحميل.
        </div>
      )}

      <form className="p-4 sm:p-8 space-y-8">
        {/* ── Section 1: Supplier & Warehouse ── */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              معلومات الطلب
            </h4>
          </div>
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                <span className="mr-2 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium normal-case">
                  {formData.purchase_order_items.length}
                </span>
              )}
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
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
                const { total } = calculateItemTotals(item);
                const registeredPrice = getRegisteredPrice(
                  item.variant_id,
                  item.packaging_type_id,
                );
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Item header bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold text-gray-500">
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

                    <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Product */}
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          المنتج / الخيار
                        </label>
                        <SearchableSelect
                          options={allVariantsOptions}
                          value={item.variant_id}
                          onChange={(val) =>
                            handleItemVariantSelect(index, val)
                          }
                          placeholder="ابحث أو اختر…"
                          id={`item_variant_select_${index}`}
                          className="text-sm"
                        />
                      </div>

                      {/* Packaging */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          نوع التعبئة
                        </label>
                        <select
                          name="packaging_type_id"
                          value={item.packaging_type_id}
                          onChange={(e) => handleItemFieldChange(index, e)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">--</option>
                          {item.products_unit_of_measure_id &&
                            Array.isArray(packagingTypes) &&
                            getPreferredPackagingTypes(
                              item.products_id,
                              item.products_unit_of_measure_id,
                            ).map((pt) => (
                              <option
                                key={pt.packaging_types_id}
                                value={pt.packaging_types_id}
                              >
                                {pt.packaging_types_name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          الكمية
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

                      {/* Unit cost + registered price hint */}
                      <div className="sm:col-span-2 lg:col-span-1">
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
                            <span className="font-medium text-gray-600">
                              {formatAmount(registeredPrice)} {symbol}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Row total chip */}
                      <div className="flex items-end">
                        <div className="w-full">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            الإجمالي
                          </label>
                          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 text-center">
                            {formatAmount(total)} {symbol}
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
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              ملخص المبالغ
            </h4>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-end gap-4 sm:gap-8 text-sm">
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                <span className="text-gray-500">إجمالي العناصر</span>
                <span className="font-semibold text-gray-800 text-base">
                  {formatAmount(orderTotals.subtotal, { withSymbol: true })}
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                <label className="text-gray-500">خصم على الطلب</label>
                <NumberInput
                  value={String(formData.order_discount ?? "")}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, order_discount: v }))
                  }
                  className="w-32 px-2 py-1.5 text-sm text-center"
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-r border-gray-300 sm:pr-8">
                <span className="font-bold text-gray-700">
                  الإجمالي النهائي
                </span>
                <span className="text-xl font-extrabold text-emerald-600">
                  {formatAmount(orderTotals.finalTotal || 0, {
                    withSymbol: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={isFormActionDisabled}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-black shadow-sm transition ${isFormActionDisabled ? "bg-amber-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600"}`}
          >
            حفظ كمسودة
          </button>
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isFormActionDisabled}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-black shadow-sm transition ${isFormActionDisabled ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            تأكيد أمر الشراء
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
    </div>
  );
}
