import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftIcon,
  PlusCircleIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  CalendarDaysIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  DocumentTextIcon,
  ReceiptRefundIcon,
} from "@heroicons/react/24/outline";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";
import NumberInput from "../../../../common/NumberInput/NumberInput";
import {
  getSalesOrdersByClient,
  getSalesOrderDetails,
} from "../../../../../apis/sales_orders";
import { getSalesReturnDetails } from "../../../../../apis/sales_returns";
import { formatCurrency } from "../../../../../utils/currency";
import {
  getCurrentLocalDateTime,
  localDateTimeToISOString,
  isoStringToLocalDateTime,
  formatLocalDate,
} from "../../../../../utils/dateUtils";

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export default function SalesReturnForm({
  onSubmit,
  onCancel,
  clients,
  isEditMode = false,
  returnItem = null,
}) {
  // Status mapping between Arabic display and English database values
  const statusMapping = {
    مسودة: "Draft",
    ملغى: "Cancelled",
    "فى الانتظار": "Pending",
    مرفوض: "Rejected",
    معتمد: "Approved",
    "تم المعالجة": "Processed",
  };

  const reverseStatusMapping = Object.fromEntries(
    Object.entries(statusMapping).map(([arabic, english]) => [english, arabic]),
  );

  const [formData, setFormData] = useState({
    returns_client_id: "",
    returns_date: getCurrentLocalDateTime(),
    returns_status: "Processed",
    returns_reason: "",
    returns_notes: "",
    returns_sales_order_id: "",
    return_items: [],
    manual_discount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [clientOrders, setClientOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [manualDiscountEnabled, setManualDiscountEnabled] = useState(false);
  const [orderLevelDiscount, setOrderLevelDiscount] = useState(0);
  const [orderSummary, setOrderSummary] = useState({
    subtotalBeforeDiscount: 0,
    itemSummaries: {},
  });

  // Safe array processing for clients
  const safeClients = Array.isArray(clients)
    ? clients.filter(
        (client) => client && client.clients_id && client.clients_company_name,
      )
    : [];

  const clientOptions = safeClients.map((client) => ({
    value: client.clients_id,
    label: client.clients_company_name,
  }));

  // Load return data for edit mode
  useEffect(() => {
    if (!isEditMode || !returnItem) {
      setInitialLoading(false);
      return;
    }

    const loadReturnData = async () => {
      setInitialLoading(true);
      try {
        const returnId =
          returnItem?.returns_id ||
          returnItem?.sales_returns_id ||
          returnItem?.id ||
          returnItem?.returnsID;
        if (!returnId) {
          setInitialLoading(false);
          return;
        }

        const data = await getSalesReturnDetails(returnId);
        const clientId =
          data.returns_client_id ||
          data.client_id ||
          returnItem?.returns_client_id ||
          returnItem?.client_id ||
          "";
        const orderId =
          data.returns_sales_order_id ||
          data.sales_order_id ||
          returnItem?.returns_sales_order_id ||
          "";
        const date = isoStringToLocalDateTime(
          data.returns_date || data.return_date || "",
        );
        const status = data.returns_status || data.status || "Processed";
        const reason = data.returns_reason || data.reason || "";
        const notes = data.returns_notes || data.notes || "";
        const manualDiscountValue = toNumber(data.manual_discount, 0);
        const items = Array.isArray(data.items) ? data.items : [];

        let itemSummaries = {};
        let subtotalBeforeDiscount = 0;
        let headerOrderDiscount = toNumber(
          data.sales_orders_discount_amount ??
            data.sales_order_discount_amount ??
            data.sales_orders_discount,
          0,
        );
        let headerSubtotal = toNumber(data.sales_order_subtotal, 0);

        if (orderId) {
          try {
            const orderDetails = await getSalesOrderDetails(orderId);
            const orderItems = Array.isArray(orderDetails?.items)
              ? orderDetails.items
              : [];
            subtotalBeforeDiscount = orderItems.reduce((sum, orderItem) => {
              const unitPrice = toNumber(
                orderItem.sales_order_items_unit_price ?? orderItem.unit_price,
                0,
              );
              const quantity = toNumber(
                orderItem.sales_order_items_quantity ?? orderItem.quantity,
                0,
              );
              return sum + unitPrice * quantity;
            }, 0);

            itemSummaries = orderItems.reduce((acc, orderItem) => {
              const soItemId = orderItem.sales_order_items_id || orderItem.id;
              if (!soItemId) {
                return acc;
              }

              const orderedQty = toNumber(
                orderItem.sales_order_items_quantity ?? orderItem.quantity,
                0,
              );
              const totalReturnedQty = toNumber(
                orderItem.returned_quantity ??
                  orderItem.sales_order_items_returned_quantity ??
                  orderItem.total_returned,
                0,
              );

              acc[soItemId] = {
                orderedQty,
                totalReturnedQty,
                originalUnitPrice: toNumber(
                  orderItem.sales_order_items_unit_price ??
                    orderItem.unit_price,
                  0,
                ),
                discountAmount: toNumber(
                  orderItem.sales_order_items_discount_amount ??
                    orderItem.discount_amount,
                  0,
                ),
                taxAmount: toNumber(
                  orderItem.sales_order_items_tax_amount ??
                    orderItem.tax_amount,
                  0,
                ),
                taxRate: toNumber(
                  orderItem.sales_order_items_tax_rate ??
                    orderItem._tax_rate ??
                    orderItem.tax_rate,
                  0,
                ),
                hasTax:
                  Boolean(
                    orderItem.sales_order_items_has_tax ?? orderItem.has_tax,
                  ) ||
                  toNumber(
                    orderItem.sales_order_items_tax_rate ?? orderItem.tax_rate,
                    0,
                  ) > 0,
              };
              return acc;
            }, {});

            headerOrderDiscount = toNumber(
              orderDetails.sales_orders_discount_amount ??
                orderDetails.sales_order_discount_amount,
              0,
            );
            headerSubtotal = toNumber(orderDetails.sales_orders_subtotal, 0);
          } catch (orderError) {
            console.error(
              "Error loading order details for return:",
              orderError,
            );
          }
        }

        setOrderLevelDiscount(headerOrderDiscount);
        setOrderSummary({
          subtotalBeforeDiscount: subtotalBeforeDiscount || headerSubtotal,
          itemSummaries,
        });

        setFormData({
          returns_client_id: clientId,
          returns_date: date,
          returns_status: status,
          returns_reason: reason,
          returns_notes: notes,
          returns_sales_order_id: orderId,
          manual_discount: manualDiscountValue,
          return_items: items.map((item) => {
            const soItemId =
              item.return_items_sales_order_item_id ||
              item.sales_order_items_id ||
              item.id;
            const summary = itemSummaries[soItemId] || {};
            const currentQty = toNumber(
              item.return_items_quantity ?? item.quantity,
              0,
            );
            const orderedQty =
              summary.orderedQty ?? toNumber(item.ordered_quantity, 0);
            const totalReturnedQty =
              summary.totalReturnedQty ?? toNumber(item.returned_quantity, 0);
            const previouslyReturned = Math.max(
              0,
              totalReturnedQty - currentQty,
            );
            const remainingQuantity = Math.max(
              0,
              orderedQty - totalReturnedQty,
            );

            return {
              return_items_sales_order_item_id: soItemId,
              return_items_quantity: currentQty,
              return_items_unit_price: toNumber(
                item.return_items_unit_price ?? item.unit_price,
                0,
              ),
              return_items_total_price: toNumber(
                item.return_items_total_price ?? item.total_price,
                0,
              ),
              return_items_notes: item.return_items_notes || item.notes || "",
              product_name: item.product_name || item.variant_name || "",
              packaging_type_name: item.packaging_type_name || "",
              ordered_quantity: orderedQty,
              returned_quantity: previouslyReturned,
              remaining_quantity: remainingQuantity,
              _has_tax:
                summary.hasTax ??
                (Boolean(item.sales_order_items_has_tax) ||
                  toNumber(
                    item.sales_order_items_tax_rate ?? item._tax_rate,
                    0,
                  ) > 0),
              _tax_rate:
                summary.taxRate ??
                toNumber(item.sales_order_items_tax_rate ?? item._tax_rate, 0),
              _discount_amount:
                summary.discountAmount ??
                toNumber(item.sales_order_items_discount_amount, 0),
              _original_unit_price:
                summary.originalUnitPrice ??
                toNumber(
                  item.sales_order_items_unit_price ?? item.unit_price,
                  0,
                ),
              _tax_amount:
                summary.taxAmount ??
                toNumber(item.sales_order_items_tax_amount, 0),
            };
          }),
        });

        setManualDiscountEnabled(manualDiscountValue > 0);
      } catch (error) {
        console.error("Error loading return data:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadReturnData();
  }, [isEditMode, returnItem]);

  // Load client orders when client is selected (only in add mode)
  useEffect(() => {
    if (isEditMode) return; // Skip in edit mode

    const loadClientOrders = async () => {
      if (!formData.returns_client_id) {
        setClientOrders([]);
        return;
      }

      setLoadingOrders(true);
      try {
        // Limit to last 5 orders for this client
        const ordersRaw = await getSalesOrdersByClient(
          formData.returns_client_id,
          5,
        );
        const orders = Array.isArray(ordersRaw)
          ? ordersRaw
          : ordersRaw?.data || [];

        // Filter by selected client ID (server may not filter by client_id)
        const byClient = orders.filter((o) => {
          const cid = Number(formData.returns_client_id);
          return (
            Number(o.clients_id) === cid ||
            Number(o.sales_orders_client_id) === cid
          );
        });

        // Eligible statuses for returns - only invoiced orders can have returns
        const eligibleStatuses = ["Invoiced"];
        const eligibleOrders = byClient.filter((order) =>
          eligibleStatuses.includes(order.sales_orders_status),
        );
        // Sort orders by date - newest first (descending order)
        const sortedOrders = eligibleOrders.sort((a, b) => {
          const dateA = new Date(a.sales_orders_order_date || a.order_date);
          const dateB = new Date(b.sales_orders_order_date || b.order_date);
          return dateB - dateA; // Descending order (newest first)
        });
        setClientOrders(sortedOrders);
      } catch (error) {
        console.error("Error loading client orders:", error);
        setClientOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    loadClientOrders();
  }, [formData.returns_client_id, isEditMode]);

  // Load order details when order is selected (only in add mode)
  useEffect(() => {
    if (isEditMode) return; // Skip in edit mode

    const loadOrderDetails = async () => {
      if (!formData.returns_sales_order_id) {
        setOrderSummary({
          subtotalBeforeDiscount: 0,
          itemSummaries: {},
        });
        return;
      }

      setLoadingOrderDetails(true);
      try {
        const orderDetails = await getSalesOrderDetails(
          formData.returns_sales_order_id,
        );
        const items = Array.isArray(orderDetails.items)
          ? orderDetails.items
          : [];

        const subtotalBeforeDiscount = items.reduce((sum, orderItem) => {
          const unitPrice = Number(orderItem.sales_order_items_unit_price || 0);
          const quantity = Number(orderItem.sales_order_items_quantity || 0);
          return (
            sum +
            (Number.isFinite(unitPrice) && Number.isFinite(quantity)
              ? unitPrice * quantity
              : 0)
          );
        }, 0);

        const itemSummaries = items.reduce((acc, orderItem, index) => {
          const soItemId =
            orderItem.sales_order_items_id || orderItem.id || index;
          if (!soItemId) {
            return acc;
          }

          acc[soItemId] = {
            orderedQty: Number(orderItem.sales_order_items_quantity || 0) || 0,
            totalReturnedQty:
              Number(
                orderItem.returned_quantity ??
                  orderItem.sales_order_items_returned_quantity ??
                  orderItem.total_returned ??
                  0,
              ) || 0,
            originalUnitPrice:
              Number(orderItem.sales_order_items_unit_price || 0) || 0,
            discountAmount:
              Number(orderItem.sales_order_items_discount_amount || 0) || 0,
            taxAmount: Number(orderItem.sales_order_items_tax_amount || 0) || 0,
            taxRate:
              Number(
                orderItem.sales_order_items_tax_rate ||
                  orderItem._tax_rate ||
                  0,
              ) || 0,
            hasTax:
              Boolean(orderItem.sales_order_items_has_tax) ||
              Number(
                orderItem.sales_order_items_tax_rate ||
                  orderItem._tax_rate ||
                  0,
              ) > 0,
          };

          return acc;
        }, {});

        setOrderSummary({
          subtotalBeforeDiscount,
          itemSummaries,
        });

        // Store order-level discount
        setOrderLevelDiscount(
          Number(
            orderDetails.sales_orders_discount_amount ||
              orderDetails.sales_order_discount_amount ||
              0,
          ) || 0,
        );

        // Transform order items to return items format
        const returnItems = items.map((item, index) => {
          const summary =
            itemSummaries[item.sales_order_items_id || item.id || index] || {};
          const ordered_quantity = summary.orderedQty || 0;
          const returned_quantity = summary.totalReturnedQty || 0;
          const remaining_quantity = Math.max(
            0,
            ordered_quantity - returned_quantity,
          );

          return {
            return_items_sales_order_item_id:
              item.sales_order_items_id || item.id || index,
            return_items_quantity: 0,
            return_items_unit_price: summary.originalUnitPrice || 0,
            return_items_total_price: 0,
            return_items_notes: "",
            product_name: item.variant_name || item.products_name || "",
            packaging_type_name: item.packaging_types_name || "",
            ordered_quantity,
            returned_quantity,
            remaining_quantity,
            _has_tax: summary.hasTax,
            _tax_rate: summary.taxRate || 0,
            _discount_amount: summary.discountAmount || 0,
            _original_unit_price: summary.originalUnitPrice || 0,
            _tax_amount: summary.taxAmount || 0,
            _original_subtotal:
              Number(item.sales_order_items_subtotal || 0) || 0,
            _total_with_tax_and_discount:
              Number(item.sales_order_items_total_price || 0) || 0,
          };
        });

        setFormData((prev) => ({ ...prev, return_items: returnItems }));
      } catch (error) {
        console.error("Error loading order details:", error);
      } finally {
        setLoadingOrderDetails(false);
      }
    };

    loadOrderDetails();
  }, [formData.returns_sales_order_id, isEditMode]);

  // Calculate totals
  const totals = useMemo(() => {
    const items = Array.isArray(formData.return_items)
      ? formData.return_items
      : [];

    const subtotal = items.reduce((sum, item) => {
      const unitPrice = Number(item.return_items_unit_price || 0);
      const quantity = Number(item.return_items_quantity || 0);
      if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) {
        return sum;
      }
      return sum + unitPrice * quantity;
    }, 0);

    const itemDiscountTotal = items.reduce((sum, item) => {
      const orderedQty = Number(item.ordered_quantity || 0);
      const returnedQty = Number(item.return_items_quantity || 0);
      if (orderedQty <= 0 || returnedQty <= 0) {
        return sum;
      }
      const discountAmount = Number(item._discount_amount || 0);
      const discountPerUnit = discountAmount / orderedQty;
      return sum + discountPerUnit * returnedQty;
    }, 0);

    const returnedGrossValue = items.reduce((sum, item) => {
      const originalUnitPrice = Number(
        item._original_unit_price ?? item.return_items_unit_price ?? 0,
      );
      const quantity = Number(item.return_items_quantity || 0);
      if (!Number.isFinite(originalUnitPrice) || !Number.isFinite(quantity)) {
        return sum;
      }
      return sum + originalUnitPrice * quantity;
    }, 0);

    const inferredOrderSubtotal = (() => {
      if (orderSummary.subtotalBeforeDiscount > 0) {
        return orderSummary.subtotalBeforeDiscount;
      }
      return items.reduce((sum, item) => {
        const orderedQty = Number(item.ordered_quantity || 0);
        const originalUnitPrice = Number(
          item._original_unit_price ?? item.return_items_unit_price ?? 0,
        );
        if (
          !Number.isFinite(orderedQty) ||
          !Number.isFinite(originalUnitPrice)
        ) {
          return sum;
        }
        return sum + orderedQty * originalUnitPrice;
      }, 0);
    })();

    const finalOrderDiscount = manualDiscountEnabled
      ? Number(formData.manual_discount || 0)
      : inferredOrderSubtotal > 0
        ? orderLevelDiscount * (returnedGrossValue / inferredOrderSubtotal)
        : 0;

    const taxTotal = items.reduce((sum, item) => {
      const orderedQty = Number(item.ordered_quantity || 0);
      const taxAmount = Number(item._tax_amount || 0);
      const quantity = Number(item.return_items_quantity || 0);
      if (orderedQty <= 0 || quantity <= 0) {
        return sum;
      }
      const taxPerUnit = taxAmount / orderedQty;
      return sum + taxPerUnit * quantity;
    }, 0);

    const totalDiscount = itemDiscountTotal + finalOrderDiscount;
    const total = subtotal + taxTotal - totalDiscount;

    return {
      subtotal: subtotal.toFixed(2),
      itemDiscount: itemDiscountTotal.toFixed(2),
      orderDiscount: finalOrderDiscount.toFixed(2),
      isManualDiscount: manualDiscountEnabled,
      totalDiscount: totalDiscount.toFixed(2),
      tax: taxTotal.toFixed(2),
      total: total.toFixed(2),
    };
  }, [
    formData.return_items,
    orderLevelDiscount,
    manualDiscountEnabled,
    formData.manual_discount,
    orderSummary,
  ]);

  // Handle quantity change
  const handleQuantityChange = (index, newQuantity) => {
    const requested = Number(newQuantity) || 0;
    setFormData((prev) => ({
      ...prev,
      return_items: prev.return_items.map((item, idx) => {
        if (idx === index) {
          const maxQty = Number.isFinite(Number(item.remaining_quantity))
            ? Number(item.remaining_quantity)
            : Math.max(
                0,
                Number(item.ordered_quantity || 0) -
                  Number(item.returned_quantity || 0),
              );
          const quantity = Math.max(0, Math.min(requested, maxQty));
          const unitPrice = Number(item.return_items_unit_price || 0);
          const orderedQty = Number(item.ordered_quantity || 0) || 1;
          const taxAmount = Number(item._tax_amount || 0) || 0;
          const taxPerUnit = orderedQty > 0 ? taxAmount / orderedQty : 0;
          const discountAmount = Number(item._discount_amount || 0) || 0;
          const discountPerUnit =
            orderedQty > 0 ? discountAmount / orderedQty : 0;
          const lineSubtotal = unitPrice * quantity;
          const taxForQuantity = taxPerUnit * quantity;
          const discountForQuantity = discountPerUnit * quantity;
          const totalWithAdjustments =
            lineSubtotal + taxForQuantity - discountForQuantity;
          return {
            ...item,
            return_items_quantity: quantity,
            return_items_total_price: Number(lineSubtotal.toFixed(2)),
            computed_total_with_tax: Number(totalWithAdjustments.toFixed(2)),
          };
        }
        return item;
      }),
    }));
  };

  // Handle unit price change
  const handleUnitPriceChange = (index, newUnitPrice) => {
    const unitPrice = Number(newUnitPrice) || 0;
    setFormData((prev) => ({
      ...prev,
      return_items: prev.return_items.map((item, idx) => {
        if (idx === index) {
          const quantity = Number(item.return_items_quantity || 0);
          const orderedQty = Number(item.ordered_quantity || 0) || 1;
          const taxAmount = Number(item._tax_amount || 0) || 0;
          const taxPerUnit = orderedQty > 0 ? taxAmount / orderedQty : 0;
          const discountAmount = Number(item._discount_amount || 0) || 0;
          const discountPerUnit =
            orderedQty > 0 ? discountAmount / orderedQty : 0;
          const lineSubtotal = unitPrice * quantity;
          const taxForQuantity = taxPerUnit * quantity;
          const discountForQuantity = discountPerUnit * quantity;
          const totalWithAdjustments =
            lineSubtotal + taxForQuantity - discountForQuantity;
          return {
            ...item,
            return_items_unit_price: unitPrice,
            return_items_total_price: Number(lineSubtotal.toFixed(2)),
            computed_total_with_tax: Number(totalWithAdjustments.toFixed(2)),
            _original_unit_price: Number(
              item._original_unit_price ?? unitPrice ?? 0,
            ),
          };
        }
        return item;
      }),
    }));
  };

  // Remove item from return
  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      return_items: prev.return_items.filter((_, idx) => idx !== index),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert status from Arabic to English if necessary
    const arabicStatus =
      reverseStatusMapping[formData.returns_status] || formData.returns_status;
    const englishStatus =
      statusMapping[arabicStatus] || formData.returns_status;

    const payload = {
      client_id: formData.returns_client_id,
      order_id: formData.returns_sales_order_id || null,
      return_date: localDateTimeToISOString(formData.returns_date),
      status: englishStatus, // Ensure English status for database
      reason: formData.returns_reason,
      notes: formData.returns_notes,
      total_amount: totals.total,
      items: formData.return_items
        .filter((item) => Number(item.return_items_quantity || 0) > 0)
        .map((item) => ({
          return_items_sales_order_item_id:
            item.return_items_sales_order_item_id,
          return_items_quantity: item.return_items_quantity,
          return_items_unit_price: item.return_items_unit_price,
          return_items_total_price: item.return_items_total_price,
          return_items_notes: item.return_items_notes || "",
        })),
    };

    if (manualDiscountEnabled) {
      payload.manual_discount = Number(formData.manual_discount || 0);
    }

    try {
      setLoading(true);
      await onSubmit(payload);
    } catch (error) {
      console.error("Error submitting sales return:", error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div
        className="bg-white rounded-2xl shadow-xl max-w-4xl mx-auto overflow-hidden"
        dir="rtl"
      >
        <div className="bg-gradient-to-l from-rose-600 to-red-500 px-6 py-5 flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <ReceiptRefundIcon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {isEditMode ? "تعديل مرتجع بيع" : "إضافة مرتجع بيع جديد"}
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-sm font-medium">جاري تحميل بيانات المرتجع...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gray-50 rounded-2xl shadow-xl max-w-4xl mx-auto overflow-hidden"
      dir="rtl"
    >
      {/* ── Premium Header ── */}
      <div className="bg-gradient-to-l from-rose-600 to-red-500 px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2 flex-shrink-0">
              <ReceiptRefundIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                {isEditMode ? "تعديل مرتجع بيع" : "إضافة مرتجع بيع جديد"}
              </h3>
              <p className="text-xs text-red-100 mt-0.5 hidden sm:block">
                أدخل بيانات المرتجع بالكامل ثم اضغط حفظ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق"
            className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
        {/* ── Section: Client & Date ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <UserIcon className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-gray-700">
              بيانات العميل والتاريخ
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                العميل <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={clientOptions}
                value={formData.returns_client_id}
                onChange={(value) => {
                  setFormData({
                    ...formData,
                    returns_client_id: value,
                    returns_sales_order_id: "",
                  });
                }}
                placeholder="اختر العميل"
                disabled={isEditMode}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                تاريخ ووقت المرتجع <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarDaysIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  required
                  value={formData.returns_date}
                  onChange={(e) =>
                    setFormData({ ...formData, returns_date: e.target.value })
                  }
                  className="block w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Status & Order ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <ClipboardDocumentListIcon className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-gray-700">
              ربط بطلب وحالة المرتجع
            </span>
          </div>
          <div
            className={`p-4 grid gap-4 ${isEditMode ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
          >
            {isEditMode && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  حالة المرتجع
                </label>
                <select
                  value={
                    reverseStatusMapping[formData.returns_status] ||
                    formData.returns_status
                  }
                  onChange={(e) => {
                    const englishStatus =
                      statusMapping[e.target.value] || e.target.value;
                    setFormData({ ...formData, returns_status: englishStatus });
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="مسودة">مسودة</option>
                  <option value="ملغى">ملغى</option>
                  <option value="فى الانتظار">فى الانتظار</option>
                  <option value="معتمد">معتمد</option>
                  <option value="مرفوض">مرفوض</option>
                  <option value="تم المعالجة">تم المعالجة</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {isEditMode
                  ? "رقم الطلب المرتبط"
                  : "رقم الطلب المرتبط (اختياري)"}
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.returns_sales_order_id || ""}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                  placeholder="رقم الطلب"
                  disabled
                  readOnly
                />
              ) : (
                <>
                  <select
                    value={formData.returns_sales_order_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        returns_sales_order_id: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:bg-gray-50 disabled:text-gray-400"
                    disabled={loadingOrders || !formData.returns_client_id}
                  >
                    <option value="">اختر طلب (اختياري)</option>
                    {clientOrders.map((order) => {
                      const dateValue =
                        order.sales_orders_order_date ||
                        order.sales_orders_date ||
                        order.sales_order_date ||
                        "";
                      return (
                        <option
                          key={order.sales_orders_id}
                          value={order.sales_orders_id}
                        >
                          رقم {order.sales_orders_id} —{" "}
                          {formatLocalDate(dateValue, "en-GB")} —{" "}
                          {formatCurrency(order.sales_orders_total_amount)}
                        </option>
                      );
                    })}
                  </select>
                  {loadingOrders && (
                    <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
                      جاري تحميل الطلبات...
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Section: Reason & Notes ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <DocumentTextIcon className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-gray-700">
              سبب الإرجاع والملاحظات
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                سبب الإرجاع
              </label>
              <textarea
                rows={3}
                value={formData.returns_reason}
                onChange={(e) =>
                  setFormData({ ...formData, returns_reason: e.target.value })
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                placeholder="اذكر سبب الإرجاع..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                ملاحظات إضافية
              </label>
              <textarea
                rows={3}
                value={formData.returns_notes}
                onChange={(e) =>
                  setFormData({ ...formData, returns_notes: e.target.value })
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                placeholder="أي ملاحظات أخرى..."
              />
            </div>
          </div>
        </div>

        {/* ── Section: Manual Discount ── */}
        {Array.isArray(formData.return_items) &&
          formData.return_items.length > 0 && (
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 bg-purple-50">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-800">
                    إعدادات الخصم الإجمالي
                  </span>
                </div>
                <label
                  htmlFor="manualDiscountToggle"
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <span className="text-xs text-purple-600 font-medium">
                    خصم يدوي
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="manualDiscountToggle"
                      checked={manualDiscountEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setManualDiscountEnabled(enabled);
                        if (!enabled)
                          setFormData((prev) => ({
                            ...prev,
                            manual_discount: 0,
                          }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-checked:bg-purple-500 rounded-full transition-colors" />
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:-translate-x-4" />
                  </div>
                </label>
              </div>
              <div className="p-4">
                {!manualDiscountEnabled && orderLevelDiscount > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                    <span className="font-semibold text-blue-700">
                      خصم الطلب الأصلي:
                    </span>
                    <span className="text-blue-600 mr-1">
                      {formatCurrency(orderLevelDiscount)}
                    </span>
                    <p className="text-xs text-blue-500 mt-1">
                      سيُوزَّع الخصم تناسبياً حسب الكمية المرتجعة
                    </p>
                  </div>
                )}
                {manualDiscountEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-purple-700 mb-1.5">
                        قيمة الخصم المخصص
                      </label>
                      <NumberInput
                        value={String(formData.manual_discount ?? "")}
                        onChange={(v) =>
                          setFormData({
                            ...formData,
                            manual_discount: parseFloat(v || "0") || 0,
                          })
                        }
                        className="block w-full"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-purple-500 mt-1">
                        يستبدل الخصم التلقائي (
                        {formatCurrency(orderLevelDiscount)})
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 text-sm text-purple-800 space-y-1">
                      <div className="flex justify-between">
                        <span>الخصم المخصص:</span>
                        <span className="font-semibold">
                          {formatCurrency(formData.manual_discount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-purple-500">
                        <span>+ خصم الأصناف:</span>
                        <span>{formatCurrency(totals.itemDiscount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* ── Section: Items Table ── */}
        {Array.isArray(formData.return_items) &&
          formData.return_items.length > 0 && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <ArrowUturnLeftIcon className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-semibold text-gray-700">
                    أصناف المرتجع
                  </span>
                  <span className="mr-auto bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {formData.return_items.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          #
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          المنتج
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          التعبئة
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          الكمية
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          سعر الوحدة
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          الإجمالي
                        </th>
                        {!isEditMode && <th className="px-3 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {formData.return_items.map((item, index) => {
                        const orderedQty =
                          Number(item.ordered_quantity || 0) || 0;
                        const previouslyReturnedQty =
                          Number(item.returned_quantity ?? 0) || 0;
                        const currentQty =
                          Number(item.return_items_quantity || 0) || 0;
                        const originalUnitPrice =
                          Number(
                            item._original_unit_price ??
                              item.return_items_unit_price ??
                              0,
                          ) || 0;
                        const unitPrice =
                          Number(item.return_items_unit_price || 0) || 0;
                        const orderedTaxAmount =
                          Number(item._tax_amount || 0) || 0;
                        const taxPerUnit =
                          orderedQty > 0
                            ? orderedTaxAmount / orderedQty
                            : item._has_tax
                              ? (originalUnitPrice *
                                  Number(item._tax_rate || 0)) /
                                100
                              : 0;
                        const originalDiscountPerUnit =
                          orderedQty > 0
                            ? Number(item._discount_amount || 0) / orderedQty
                            : 0;
                        const discountForCurrentQty =
                          originalDiscountPerUnit * currentQty;
                        const calculatedRemaining = Math.max(
                          0,
                          orderedQty - previouslyReturnedQty - currentQty,
                        );
                        const remainingQty = Number.isFinite(
                          Number(item.remaining_quantity),
                        )
                          ? Number(item.remaining_quantity)
                          : calculatedRemaining;
                        const computedLineTotal = Number.isFinite(
                          Number(item.computed_total_with_tax),
                        )
                          ? Number(item.computed_total_with_tax)
                          : unitPrice * currentQty +
                            taxPerUnit * currentQty -
                            discountForCurrentQty;

                        return (
                          <tr
                            key={index}
                            className="hover:bg-rose-50/40 transition-colors"
                          >
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-gray-900 text-sm">
                                {item.product_name}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                                {item.packaging_type_name || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex gap-3 text-xs">
                                  <span className="text-gray-500">
                                    مطلوب:{" "}
                                    <strong className="text-gray-800">
                                      {orderedQty}
                                    </strong>
                                  </span>
                                  <span className="text-red-500">
                                    مرتجع:{" "}
                                    <strong>{previouslyReturnedQty}</strong>
                                  </span>
                                  <span className="text-green-600">
                                    متبقي: <strong>{remainingQty}</strong>
                                  </span>
                                </div>
                                <NumberInput
                                  value={String(
                                    item.return_items_quantity || 0,
                                  )}
                                  onChange={(v) =>
                                    handleQuantityChange(index, v)
                                  }
                                  className="w-20 text-center text-sm"
                                  placeholder="0"
                                  min="0"
                                  max={remainingQty}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col items-center gap-1">
                                <NumberInput
                                  value={String(unitPrice)}
                                  onChange={(v) =>
                                    handleUnitPriceChange(index, v)
                                  }
                                  className="w-24 text-center text-sm"
                                  placeholder="0.00"
                                />
                                {originalDiscountPerUnit > 0 && (
                                  <span className="text-xs text-orange-500">
                                    خصم:{" "}
                                    {formatCurrency(originalDiscountPerUnit)}
                                  </span>
                                )}
                                {taxPerUnit > 0 && (
                                  <span className="text-xs text-blue-500">
                                    ض.{item._tax_rate || 0}%:{" "}
                                    {formatCurrency(taxPerUnit)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-bold text-gray-900">
                                {formatCurrency(computedLineTotal)}
                              </span>
                            </td>
                            {!isEditMode && (
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="حذف الصنف"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Order Summary ── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">
                    ملخص المرتجع
                  </span>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>المجموع الفرعي</span>
                    <span className="font-medium text-gray-800">
                      {formatCurrency(totals.subtotal)}
                    </span>
                  </div>
                  {Number(totals.itemDiscount) > 0 && (
                    <div className="flex justify-between items-center text-orange-600">
                      <span>خصم الأصناف</span>
                      <span className="font-medium">
                        - {formatCurrency(totals.itemDiscount)}
                      </span>
                    </div>
                  )}
                  {Number(totals.orderDiscount) > 0 && (
                    <div className="flex justify-between items-center text-orange-600">
                      <span>خصم الطلب</span>
                      <span className="font-medium">
                        - {formatCurrency(totals.orderDiscount)}
                      </span>
                    </div>
                  )}
                  {(Number(totals.itemDiscount) > 0 ||
                    Number(totals.orderDiscount) > 0) && (
                    <div className="flex justify-between items-center text-orange-700 font-semibold border-t border-orange-100 pt-2">
                      <span>إجمالي الخصم</span>
                      <span>
                        -{" "}
                        {formatCurrency(
                          Number(totals.itemDiscount) +
                            Number(totals.orderDiscount),
                        )}
                      </span>
                    </div>
                  )}
                  {Number(totals.tax) > 0 && (
                    <div className="flex justify-between items-center text-blue-600">
                      <span>الضريبة</span>
                      <span className="font-medium">
                        + {formatCurrency(totals.tax)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                    <span className="text-base font-bold text-gray-900">
                      إجمالي المرتجع
                    </span>
                    <span className="text-xl font-extrabold text-rose-600">
                      {formatCurrency(totals.total)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

        {/* ── Loading order details ── */}
        {loadingOrderDetails && (
          <div className="flex items-center justify-center gap-3 py-8 text-rose-500">
            <span className="w-5 h-5 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            <span className="text-sm font-medium">
              جاري تحميل تفاصيل الطلب...
            </span>
          </div>
        )}

        {/* ── Empty: order selected but no items ── */}
        {!isEditMode &&
          (!formData.return_items || formData.return_items.length === 0) &&
          !loadingOrderDetails &&
          formData.returns_sales_order_id && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50 text-amber-600 gap-3">
              <ExclamationTriangleIcon className="w-10 h-10 text-amber-400" />
              <p className="font-semibold text-sm">
                لم يتم العثور على أصناف لهذا الطلب
              </p>
              <p className="text-xs text-amber-500">
                قد يكون الطلب فارغاً أو تم حذف أصنافه
              </p>
            </div>
          )}

        {/* ── Empty: no order selected ── */}
        {!isEditMode && !formData.returns_sales_order_id && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <PlusCircleIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-sm text-gray-500">
              اختر عميلاً ثم طلباً لتحميل الأصناف
            </p>
            <p className="text-xs">أو يمكنك الحفظ بدون طلب محدد</p>
          </div>
        )}

        {/* ── Footer Actions ── */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={
              loading || !formData.returns_client_id || !formData.returns_date
            }
            className="w-full sm:w-auto px-6 py-2.5 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-l from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <ReceiptRefundIcon className="w-4 h-4" />
                {isEditMode ? "حفظ التغييرات" : "إضافة المرتجع"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
