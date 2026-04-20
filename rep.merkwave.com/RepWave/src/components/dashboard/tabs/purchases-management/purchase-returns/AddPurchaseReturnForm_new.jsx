import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  PlusCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Alert from "../../../../common/Alert/Alert";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";
import NumberInput from "../../../../common/NumberInput/NumberInput";
import {
  getPurchaseOrdersBySupplier,
  getReturnableQuantities,
  getPurchaseOrderDetails,
} from "../../../../../apis/purchase_orders";
import useCurrency from "../../../../../hooks/useCurrency";
import {
  getCurrentLocalDateTime,
  formatLocalDateTime,
} from "../../../../../utils/dateUtils";

export default function AddPurchaseReturnForm({ onAdd, onCancel, suppliers }) {
  const { formatCurrency: formatMoney } = useCurrency();
  // Fallback data for testing
  const fallbackSuppliers = [
    { supplier_id: 1, supplier_name: "مورد تجريبي 1" },
    { supplier_id: 2, supplier_name: "مورد تجريبي 2" },
  ];

  // Use actual data if available, otherwise use fallback
  const displaySuppliers =
    Array.isArray(suppliers) && suppliers.length > 0
      ? suppliers
      : fallbackSuppliers;

  const [formData, setFormData] = useState({
    purchase_return_supplier_id: "",
    purchase_return_purchase_order_id: "",
    purchase_return_date: getCurrentLocalDateTime(),
    purchase_return_reason: "",
    purchase_return_notes: "",
    return_items: [],
    // legacy single-field for manual discount (we'll use toggle to decide)
    order_discount: "",
  });

  const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [selectedOrderWarehouse, setSelectedOrderWarehouse] = useState(null);
  const [orderLevelDiscount, setOrderLevelDiscount] = useState(0);
  const [orderSubtotal, setOrderSubtotal] = useState(0);
  const [manualDiscountEnabled, setManualDiscountEnabled] = useState(false);

  // Prepare supplier options for SearchableSelect
  const supplierOptions = useMemo(() => {
    return displaySuppliers.map((supplier) => ({
      value: String(supplier.supplier_id),
      label: supplier.supplier_name,
    }));
  }, [displaySuppliers]);

  // Prepare purchase order options for SearchableSelect
  const purchaseOrderOptions = useMemo(() => {
    return availablePurchaseOrders.map((order) => ({
      value: String(order.purchase_orders_id),
      label: `#${order.purchase_orders_id} - ${formatLocalDateTime(order.purchase_orders_order_date)} (${order.purchase_orders_status}) - ${formatMoney(order.purchase_orders_total_amount ?? 0)}`,
    }));
  }, [availablePurchaseOrders, formatMoney]);

  // Fetch purchase orders when supplier is selected
  useEffect(() => {
    const fetchSupplierOrders = async () => {
      if (formData.purchase_return_supplier_id) {
        setLoadingOrders(true);
        try {
          // Get orders that can be returned - Include all statuses where items can be returned:
          // - Ordered: Items ordered but not shipped yet (can return unshipped items)
          // - Shipped: Items shipped but not received yet (can return unshipped items)
          // - Received: Items fully received (can return received items from warehouse)
          // - Partially Received: Items partially received (can return both received and non-received items)
          // Request the last 20 orders for the supplier (user requested)
          const orders = await getPurchaseOrdersBySupplier(
            formData.purchase_return_supplier_id,
            "Ordered,Shipped,Received,Partially Received",
            20,
          );
          // Sort orders by date - newest first (descending order)
          const sortedOrders = orders.sort((a, b) => {
            const dateA = new Date(a.purchase_orders_order_date);
            const dateB = new Date(b.purchase_orders_order_date);
            return dateB - dateA; // Descending order (newest first)
          });
          setAvailablePurchaseOrders(sortedOrders);
        } catch (error) {
          console.error("Error fetching supplier orders:", error);
          setAvailablePurchaseOrders([]);
        } finally {
          setLoadingOrders(false);
        }
      } else {
        setAvailablePurchaseOrders([]);
        // Reset purchase order and items when supplier changes
        setFormData((prev) => ({
          ...prev,
          purchase_return_purchase_order_id: "",
          return_items: [],
        }));
      }
    };

    fetchSupplierOrders();
  }, [formData.purchase_return_supplier_id]);

  // Fetch order details when purchase order is selected
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (formData.purchase_return_purchase_order_id) {
        setLoadingOrderDetails(true);
        try {
          // Get returnable quantities (which accounts for previous returns)
          const returnableData = await getReturnableQuantities(
            formData.purchase_return_purchase_order_id,
          );

          // Auto-populate items from the returnable quantities (which accounts for previous returns)
          if (returnableData.items && returnableData.items.length > 0) {
            console.log("Raw returnable data:", returnableData.items[0]); // Debug log
            const returnItems = returnableData.items.map((item) => {
              const quantityOrdered =
                parseFloat(item.purchase_order_items_quantity_ordered) || 0;
              const quantityReceived =
                parseFloat(item.purchase_order_items_quantity_received) || 0;
              const totalReturned = parseFloat(item.total_returned) || 0;
              const availableToReturnNotReceived =
                parseFloat(item.available_to_return_not_received) || 0;
              const availableToReturnReceived =
                parseFloat(item.available_to_return_received) || 0;

              // Determine available return type - either NOT_RECEIVED or RECEIVED, but not mixed
              let availableReturnType = "NONE";
              let maxReturnableQuantity = 0;

              if (availableToReturnReceived > 0) {
                // Priority to received items if available
                availableReturnType = "RECEIVED";
                maxReturnableQuantity = availableToReturnReceived;
              } else if (availableToReturnNotReceived > 0) {
                // Only if no received items available
                availableReturnType = "NOT_RECEIVED";
                maxReturnableQuantity = availableToReturnNotReceived;
              }

              const receiveStatus = item.receive_status || "لم يتم الاستلام";

              return {
                variant_id: item.purchase_order_items_variant_id,
                products_id: "", // Will be populated by variant selection logic
                packaging_type_id: item.purchase_order_items_packaging_type_id,
                quantity_returned: "", // User must enter this
                unit_cost: item.purchase_order_items_unit_cost,
                products_unit_of_measure_id: null,
                return_reason: "",
                // Store original order item data for reference
                original_quantity: quantityOrdered,
                quantity_received: quantityReceived,
                total_returned: totalReturned,
                available_to_return_not_received: availableToReturnNotReceived,
                available_to_return_received: availableToReturnReceived,
                available_to_return: maxReturnableQuantity, // Single type available
                max_returnable_quantity: maxReturnableQuantity,
                return_type: availableReturnType, // RECEIVED, NOT_RECEIVED, or NONE
                receive_status: receiveStatus,
                original_item_id: item.purchase_order_items_id,
                // Store display names for UI
                product_name: item.product_name,
                product_variant_name: item.product_variant_name,
                packaging_type_name: item.packaging_type_name,
                // Store warehouse info
                warehouse_id: item.warehouse_id,
                warehouse_name: item.warehouse_name,
                inventory_quantity: parseFloat(item.inventory_quantity) || 0,
              };
            });

            setFormData((prev) => ({
              ...prev,
              return_items: returnItems,
            }));
            // Also fetch purchase order details to read order-level discount and subtotal for prorating
            try {
              const orderDetails = await getPurchaseOrderDetails(
                formData.purchase_return_purchase_order_id,
              );
              const lvlDiscount =
                parseFloat(
                  orderDetails.purchase_orders_order_discount ||
                    orderDetails.purchase_order_order_discount ||
                    0,
                ) || 0;
              setOrderLevelDiscount(lvlDiscount);

              // Try to get subtotal from order details if present, otherwise compute from items
              let subtotalFromOrder =
                parseFloat(
                  orderDetails.purchase_orders_subtotal ||
                    orderDetails.purchase_order_subtotal ||
                    0,
                ) || 0;
              if (!subtotalFromOrder && Array.isArray(orderDetails.items)) {
                subtotalFromOrder = orderDetails.items.reduce(
                  (s, it) =>
                    s +
                    (parseFloat(it.purchase_order_items_unit_cost) || 0) *
                      (parseFloat(it.purchase_order_items_quantity_ordered) ||
                        0),
                  0,
                );
              }
              setOrderSubtotal(subtotalFromOrder || 0);
            } catch {
              // non-fatal
              setOrderLevelDiscount(0);
              setOrderSubtotal(0);
            }
          }
        } catch (error) {
          console.error("Error fetching order details:", error);
        } finally {
          setLoadingOrderDetails(false);
        }
      } else {
        // Clear items when no purchase order is selected
        setFormData((prev) => ({
          ...prev,
          return_items: [],
        }));
      }
    };

    fetchOrderDetails();
  }, [formData.purchase_return_purchase_order_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If changing purchase order, update warehouse info
    if (name === "purchase_return_purchase_order_id") {
      const selectedOrder = availablePurchaseOrders.find(
        (order) => order.purchase_orders_id == value,
      );
      setSelectedOrderWarehouse(selectedOrder || null);
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Filter out items with no quantity returned (empty rows)
    const itemsWithQuantity = formData.return_items.filter((item) => {
      const qty = parseFloat(item.quantity_returned);
      return qty && qty > 0;
    });

    // Show confirmation dialog
    const itemCount = itemsWithQuantity.length;
    const totalAmount = formatMoney(returnTotals.finalTotal);
    const confirmMessage =
      `هل أنت متأكد من إضافة مرتجع الشراء؟\n\n` +
      `عدد الأصناف: ${itemCount}\n` +
      `المبلغ الإجمالي: ${totalAmount}\n\n` +
      `سيتم إضافة المرتجع وتحديث المخزون.`;

    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    // Filter out temporary frontend fields before submission
    const itemsToSubmit = itemsWithQuantity.map((it) => {
      const {
        products_unit_of_measure_id: _omit1,
        available_batches: _omit2,
        loading_batches: _omit3,
        selected_batch_production_date: _omit4,
        ...rest
      } = it;
      return rest;
    });

    const computedDiscount = Number(returnTotals.discount || 0);
    const discountNote = computedDiscount
      ? `\n(خصم إرجاع: ${computedDiscount})`
      : "";
    onAdd({
      ...formData,
      purchase_return_order_discount: computedDiscount,
      purchase_return_notes:
        (formData.purchase_return_notes || "") + discountNote,
      return_items: itemsToSubmit,
    });
  };

  // Calculation helpers
  const calculateItemTotals = useCallback((item) => {
    const quantity = parseFloat(item.quantity_returned) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const subtotal = quantity * unitCost;
    return { subtotal, total: subtotal };
  }, []);

  const returnTotals = useMemo(() => {
    const items = formData.return_items
      .filter(
        (item) =>
          item.quantity_returned && parseFloat(item.quantity_returned) > 0,
      )
      .map((item) => {
        const qty = parseFloat(item.quantity_returned) || 0;
        const unit = parseFloat(item.unit_cost) || 0;
        return { qty, unit, subtotal: qty * unit };
      });

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);

    // Determine order-level discount: manual override or prorated from original order
    const manualVal = parseFloat(formData.order_discount) || 0;
    let proratedOrderDiscount = 0;
    if (!manualDiscountEnabled && orderSubtotal > 0 && orderLevelDiscount > 0) {
      // prorate according to returned gross value vs original order subtotal
      proratedOrderDiscount = orderLevelDiscount * (subtotal / orderSubtotal);
    }

    const finalOrderDiscount = manualDiscountEnabled
      ? manualVal
      : proratedOrderDiscount;
    const finalOrderDiscountClamped = Math.max(
      0,
      Math.min(finalOrderDiscount, subtotal),
    );

    const finalTotal = Math.max(subtotal - finalOrderDiscountClamped, 0);

    return {
      subtotal,
      discount: finalOrderDiscountClamped,
      finalTotal,
      isManual: manualDiscountEnabled,
    };
  }, [
    formData.return_items,
    formData.order_discount,
    manualDiscountEnabled,
    orderLevelDiscount,
    orderSubtotal,
  ]);

  const isFormActionDisabled =
    !formData.purchase_return_supplier_id ||
    !formData.purchase_return_purchase_order_id ||
    formData.return_items.length === 0 ||
    !formData.return_items.some(
      (item) =>
        item.quantity_returned &&
        parseFloat(item.quantity_returned) > 0 &&
        parseFloat(item.quantity_returned) <=
          parseFloat(item.available_to_return || 0),
    );

  return (
    <div
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-6xl mx-auto overflow-hidden"
      dir="rtl"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-gradient-to-l from-[#1F2937] to-[#7C1D1D] text-white">
        <div>
          <h3 className="text-lg sm:text-2xl font-bold leading-tight">
            إضافة مرتجع شراء جديد
          </h3>
          <p className="text-xs sm:text-sm text-red-200 mt-0.5">
            اختر المورد وأمر الشراء ثم حدد الكميات المرتجعة
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

      <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-8">
        {/* ── Section 1: Basic Info ── */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              معلومات المرتجع
            </h4>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المورد <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={supplierOptions}
                value={formData.purchase_return_supplier_id}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    purchase_return_supplier_id: value,
                    purchase_return_purchase_order_id: "",
                    return_items: [],
                  }));
                }}
                placeholder="ابحث عن المورد..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                أمر الشراء <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={purchaseOrderOptions}
                value={formData.purchase_return_purchase_order_id}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    purchase_return_purchase_order_id: value,
                  }));
                }}
                placeholder={
                  loadingOrders
                    ? "جاري التحميل..."
                    : formData.purchase_return_supplier_id
                      ? "ابحث عن أمر الشراء..."
                      : "اختر المورد أولاً"
                }
                className="w-full"
                disabled={
                  !formData.purchase_return_supplier_id || loadingOrders
                }
              />
              {loadingOrderDetails && (
                <p className="text-xs text-blue-600 mt-1">
                  جاري تحميل تفاصيل الأمر...
                </p>
              )}
              {selectedOrderWarehouse && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-sm text-blue-800">
                  <span className="font-bold">المخزن:</span>{" "}
                  {selectedOrderWarehouse.warehouse_name || "غير محدد"}
                </div>
              )}
            </div>
          </div>
          {/* end grid */}
        </div>
        {/* end section card */}

        {/* ── Section 2: Items ── */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              عناصر المرتجع
            </h4>
            {!formData.purchase_return_purchase_order_id ? (
              <span className="text-xs text-gray-500">
                اختر أمر شراء لإظهار العناصر
              </span>
            ) : (
              formData.return_items.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    متاح:{" "}
                    {
                      formData.return_items.filter(
                        (i) => parseFloat(i.available_to_return || 0) > 0,
                      ).length
                    }
                  </span>
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    غير مستلم:{" "}
                    {
                      formData.return_items.filter(
                        (i) => i.return_type === "NOT_RECEIVED",
                      ).length
                    }
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    في المخزون:{" "}
                    {
                      formData.return_items.filter(
                        (i) => i.return_type === "RECEIVED",
                      ).length
                    }
                  </span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    مُرتجع كلياً:{" "}
                    {
                      formData.return_items.filter(
                        (i) => i.return_type === "NONE",
                      ).length
                    }
                  </span>
                </div>
              )
            )}
          </div>

          <div className="p-4 sm:p-6">
            {!formData.purchase_return_purchase_order_id ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">
                  يجب اختيار أمر الشراء أولاً لإظهار العناصر
                </p>
              </div>
            ) : formData.return_items.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">
                  {loadingOrderDetails
                    ? "جاري تحميل عناصر أمر الشراء..."
                    : "لا توجد عناصر في أمر الشراء المحدد"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.return_items.map((item, index) => {
                  const canReturn = item.return_type !== "NONE";
                  return (
                    <div
                      key={index}
                      className={`bg-white rounded-xl border shadow-sm overflow-hidden ${!canReturn ? "opacity-60" : ""}`}
                    >
                      {/* Item header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-600">
                          عنصر #{index + 1} —{" "}
                          {item.product_variant_name ||
                            item.product_name ||
                            "منتج غير معروف"}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-gray-500">
                            مطلوب: <b>{item.original_quantity || "0"}</b>
                          </span>
                          <span className="text-gray-500">
                            مستلم: <b>{item.quantity_received || "0"}</b>
                          </span>
                          <span className="text-red-500">
                            مُرتجع سابقاً: <b>{item.total_returned || "0"}</b>
                          </span>
                          {item.return_type === "NOT_RECEIVED" && (
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                              متاح (غير مستلم): {item.available_to_return}
                            </span>
                          )}
                          {item.return_type === "RECEIVED" && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              متاح (مخزون): {item.available_to_return}
                            </span>
                          )}
                          {item.return_type === "NONE" && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                              مُرتجع بالكامل
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium ${
                              item.receive_status === "تم الاستلام بالكامل"
                                ? "bg-green-100 text-green-700"
                                : item.receive_status === "تم الاستلام جزئياً"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {item.receive_status}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Product read-only */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            المنتج
                          </label>
                          <div className="px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 truncate">
                            {item.product_variant_name ||
                              item.product_name ||
                              "غير معروف"}
                          </div>
                        </div>
                        {/* Packaging read-only */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            نوع التعبئة
                          </label>
                          <div className="px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                            {item.packaging_type_name || "غير محدد"}
                          </div>
                        </div>
                        {/* Qty input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            الكمية المرتجعة{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <NumberInput
                            value={item.quantity_returned || ""}
                            onChange={(value) => {
                              const newItems = [...formData.return_items];
                              newItems[index].quantity_returned = value;
                              setFormData((prev) => ({
                                ...prev,
                                return_items: newItems,
                              }));
                            }}
                            placeholder="0"
                            min="0"
                            max={item.available_to_return}
                            step="0.01"
                            disabled={!canReturn}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                          {item.available_to_return > 0 ? (
                            <p className="text-[10px] text-green-600 mt-0.5">
                              الحد الأقصى: {item.available_to_return}
                            </p>
                          ) : (
                            <p className="text-[10px] text-red-500 mt-0.5">
                              لا توجد كمية متاحة
                            </p>
                          )}
                        </div>
                        {/* Total chip */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            الإجمالي
                          </label>
                          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-700 text-center">
                            {formatMoney(calculateItemTotals(item).total)}
                          </div>
                          <p className="text-[10px] text-blue-500 mt-0.5 text-center">
                            سعر الوحدة: {formatMoney(item.unit_cost)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* end items padding */}
        </div>
        {/* end items section card */}

        {/* ── Section 3: Totals & reason ── */}
        {formData.return_items.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                ملخص المرتجع
              </h4>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      سبب الإرجاع
                    </label>
                    <select
                      name="purchase_return_reason"
                      value={formData.purchase_return_reason}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                    >
                      <option value="">اختر السبب…</option>
                      <option value="damaged">منتج تالف</option>
                      <option value="wrong_item">عنصر خاطئ</option>
                      <option value="poor_quality">جودة ضعيفة</option>
                      <option value="expired">منتهي الصلاحية</option>
                      <option value="overstocked">فائض مخزون</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ملاحظات الإرجاع
                    </label>
                    <input
                      type="text"
                      name="purchase_return_notes"
                      value={formData.purchase_return_notes}
                      onChange={handleChange}
                      placeholder="ملاحظات مختصرة..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      خصم على الإرجاع
                    </label>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={manualDiscountEnabled}
                          onChange={(e) =>
                            setManualDiscountEnabled(e.target.checked)
                          }
                          className="w-3.5 h-3.5 text-red-500 border-gray-300 rounded"
                        />
                        تخصيص يدوي
                      </label>
                      {!manualDiscountEnabled && orderLevelDiscount > 0 && (
                        <span className="text-[10px] text-blue-500">
                          (تلقائي: {formatMoney(returnTotals.discount)})
                        </span>
                      )}
                    </div>
                    <NumberInput
                      value={formData.order_discount || ""}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          order_discount: value,
                        }))
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={!manualDiscountEnabled}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {!manualDiscountEnabled && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        يُحسب تلقائياً بنسبة الكمية (
                        {formatMoney(orderLevelDiscount)})
                      </p>
                    )}
                  </div>
                </div>

                {/* Totals row */}
                <div className="flex flex-col sm:flex-row justify-end gap-4 sm:gap-8 pt-3 border-t border-gray-200 text-sm">
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                    <span className="text-gray-500">المجموع الفرعي</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatMoney(returnTotals.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-r border-gray-300 sm:pr-8">
                    <span className="font-bold text-gray-700">
                      الإجمالي النهائي
                    </span>
                    <span className="text-xl font-extrabold text-red-600">
                      {formatMoney(returnTotals.finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {isFormActionDisabled && formData.return_items.length > 0 && (
            <div className="flex-1 min-w-0">
              <Alert
                type="warning"
                message="يجب إدخال كمية إرجاع صحيحة لعنصر واحد على الأقل"
              />
            </div>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isFormActionDisabled}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition ${isFormActionDisabled ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
          >
            إضافة المرتجع
          </button>
        </div>
      </form>
    </div>
  );
}
