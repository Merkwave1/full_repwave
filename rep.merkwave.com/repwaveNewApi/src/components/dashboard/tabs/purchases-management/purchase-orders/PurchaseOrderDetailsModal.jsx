import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaEdit, FaPrint } from "react-icons/fa";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import AppModalShell, {
  modalSecondaryBtnClass,
  modalSectionClass,
  modalSectionHeaderClass,
} from "../../../../common/AppModalShell.jsx";
import Loader from "../../../../common/Loader/Loader";
import { getPurchaseOrderDetails } from "../../../../../apis/purchase_orders";
import useCurrency from "../../../../../hooks/useCurrency";

const STATUS_LABELS = {
  Draft: "مسودة",
  Ordered: "مؤكد",
  Received: "مستلم",
  "Partial Receipt": "استلام جزئي",
  Pending: "قيد الانتظار",
  Cancelled: "ملغي",
};

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-800",
  Ordered: "bg-[#EDE7FF] text-[#2D1B69]",
  Received: "bg-green-100 text-green-800",
  "Partial Receipt": "bg-amber-100 text-amber-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Cancelled: "bg-red-100 text-red-800",
};

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
}

const PurchaseOrderDetailsModal = ({
  isOpen,
  onClose,
  purchaseOrder,
  suppliers,
  warehouses,
  onEdit,
}) => {
  const { formatCurrency: formatMoney } = useCurrency();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const orderId =
    purchaseOrder?.purchase_orders_id ?? purchaseOrder?.purchase_order_id;

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPurchaseOrderDetails(orderId);
        if (!cancelled) setDetails(data);
      } catch (err) {
        console.error("Error loading purchase order details:", err);
        if (!cancelled) setError("فشل في تحميل تفاصيل أمر الشراء");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, orderId]);

  const supplierName = useMemo(() => {
    const sid =
      details?.purchase_orders_supplier_id ??
      details?.purchase_order_supplier_id;
    const fromList = suppliers?.find((s) => s.supplier_id == sid)?.supplier_name;
    return details?.supplier_name || fromList || "غير محدد";
  }, [details, suppliers]);

  const warehouseName = useMemo(() => {
    const wid =
      details?.purchase_orders_warehouse_id ??
      details?.purchase_order_warehouse_id;
    const fromList = warehouses?.find(
      (w) => w.warehouse_id == wid,
    )?.warehouse_name;
    return details?.warehouse_name || fromList || "غير محدد";
  }, [details, warehouses]);

  const status = useMemo(
    () =>
      details?.purchase_orders_status ??
      details?.purchase_order_status ??
      "—",
    [details],
  );

  const statusLabel = STATUS_LABELS[status] || status;

  const calculateItemTotal = useCallback((item) => {
    const qty = parseFloat(
      item.purchase_order_items_quantity_ordered ??
        item.purchase_order_items_quantity ??
        0,
    );
    const unitCost = parseFloat(
      item.purchase_order_items_unit_cost ??
        item.purchase_order_items_unit_price ??
        0,
    );
    const storedTotal = parseFloat(item.purchase_order_items_total_cost);
    const total =
      !Number.isNaN(storedTotal) && storedTotal > 0
        ? storedTotal
        : qty * unitCost;
    return { quantity: qty, unitCost, total };
  }, []);

  const formattedItems = useMemo(() => {
    const items = details?.items ?? [];
    return items.map((item) => ({
      ...item,
      display_name:
        item.product_variant_name ||
        item.variant_name ||
        item.product_name ||
        item.products_name ||
        "غير محدد",
      packaging_name:
        item.packaging_type_name || item.packaging_types_name || "—",
      received_qty: item.purchase_order_items_quantity_received ?? 0,
      returned_qty: item.purchase_order_items_quantity_returned ?? 0,
      calculated: calculateItemTotal(item),
    }));
  }, [details?.items, calculateItemTotal]);

  const orderTotals = useMemo(() => {
    const itemsSubtotal = formattedItems.reduce(
      (sum, item) => sum + (item.calculated.total || 0),
      0,
    );
    const orderDiscount = parseFloat(
      details?.purchase_orders_order_discount ??
        details?.purchase_order_order_discount ??
        0,
    );
    const apiTotal = parseFloat(
      details?.purchase_orders_total_amount ??
        details?.purchase_order_total_amount,
    );
    const grandTotal =
      !Number.isNaN(apiTotal) && apiTotal > 0
        ? apiTotal
        : Math.max(0, itemsSubtotal - orderDiscount);

    return {
      subtotal: itemsSubtotal,
      orderDiscount,
      grandTotal,
    };
  }, [formattedItems, details]);

  const formattedOrder = useMemo(() => {
    if (!details) return null;
    return {
      id: details.purchase_orders_id ?? details.purchase_order_id,
      date:
        details.purchase_orders_order_date ?? details.purchase_order_date,
      notes:
        details.purchase_orders_notes ?? details.purchase_order_notes,
    };
  }, [details]);

  const handleEdit = useCallback(() => {
    if (onEdit && details) onEdit(details);
  }, [onEdit, details]);

  const handlePrint = useCallback(async () => {
    if (!formattedOrder) return;

    const itemsRows = formattedItems
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.display_name}</td>
          <td>${item.packaging_name}</td>
          <td>${item.calculated.quantity.toLocaleString("en-GB")}</td>
          <td>${formatMoney(item.calculated.unitCost)}</td>
          <td>${formatMoney(item.calculated.total)}</td>
        </tr>`,
      )
      .join("");

    const printContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>أمر شراء #${formattedOrder.id}</title><style>
      body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 13px; }
      th { background: #f5f5f5; }
      .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
      .info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
      .info div { padding: 8px 0; }
      .label { font-weight: bold; color: #555; }
      .total { margin-top: 16px; font-size: 16px; font-weight: bold; text-align: left; }
    </style></head><body>
      <div class="header"><h1>أمر شراء #${formattedOrder.id}</h1></div>
      <div class="info">
        <div><span class="label">المورد: </span>${supplierName}</div>
        <div><span class="label">المستودع: </span>${warehouseName}</div>
        <div><span class="label">التاريخ: </span>${formatDateTime(formattedOrder.date)}</div>
        <div><span class="label">الحالة: </span>${statusLabel}</div>
      </div>
      ${formattedItems.length ? `<table><thead><tr><th>#</th><th>المنتج</th><th>التعبئة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${itemsRows}</tbody></table>` : ""}
      <div class="total">الإجمالي: ${formatMoney(orderTotals.grandTotal)}</div>
      ${formattedOrder.notes ? `<p style="margin-top:16px"><strong>ملاحظات:</strong> ${formattedOrder.notes}</p>` : ""}
    </body></html>`;

    try {
      const { printHtml } = await import("../../../../../utils/printUtils.js");
      await printHtml(printContent, {
        title: `أمر شراء #${formattedOrder.id}`,
        closeAfter: 700,
      });
    } catch {
      window.print();
    }
  }, [
    formattedOrder,
    formattedItems,
    supplierName,
    warehouseName,
    statusLabel,
    orderTotals.grandTotal,
    formatMoney,
  ]);

  if (!isOpen || !purchaseOrder) return null;

  if (loading) {
    return (
      <AppModalShell
        open
        onClose={onClose}
        title={`تفاصيل أمر الشراء #${orderId}`}
        icon={ClipboardDocumentListIcon}
        size="3xl"
        gradient="purple"
      >
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      </AppModalShell>
    );
  }

  if (error) {
    return (
      <AppModalShell
        open
        onClose={onClose}
        title={`تفاصيل أمر الشراء #${orderId}`}
        icon={ClipboardDocumentListIcon}
        size="3xl"
        gradient="purple"
        footer={
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
              إغلاق
            </button>
          </div>
        }
      >
        <div className="p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        </div>
      </AppModalShell>
    );
  }

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title={`تفاصيل أمر الشراء #${formattedOrder?.id}`}
      subtitle={statusLabel}
      icon={ClipboardDocumentListIcon}
      size="3xl"
      gradient="purple"
      bodyClassName="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-[#FAFAFE] max-h-[75vh]"
      headerActions={
        <>
          {status === "Draft" && onEdit && (
            <button
              type="button"
              onClick={handleEdit}
              className="no-print rounded-lg bg-white/20 p-2 text-white transition hover:bg-white/30"
              title="تعديل"
            >
              <FaEdit size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="no-print rounded-lg bg-white/20 p-2 text-white transition hover:bg-white/30"
            title="طباعة"
          >
            <FaPrint size={16} />
          </button>
        </>
      }
      footer={
        <div className="flex justify-end print:hidden">
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "المورد", value: supplierName, accent: "text-[#6B45B0]" },
            { label: "المستودع", value: warehouseName, accent: "text-[#6B45B0]" },
            {
              label: "تاريخ الطلب",
              value: formatDateTime(formattedOrder?.date),
              accent: "text-gray-900",
            },
            {
              label: "الإجمالي",
              value: formatMoney(orderTotals.grandTotal),
              accent: "text-green-600 text-lg font-bold",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[#C4A8F0]/30 bg-gradient-to-br from-white to-[#F8F5FF] p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              <p className={`mt-1 font-semibold ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className={modalSectionClass}>
          <div className={modalSectionHeaderClass}>معلومات الطلب</div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <span className="text-xs font-medium text-gray-500">رقم الطلب</span>
                <p className="mt-1 font-semibold text-gray-900">#{formattedOrder?.id}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">الحالة</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                      STATUS_COLORS[status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">عدد العناصر</span>
                <p className="mt-1 font-semibold text-gray-900">{formattedItems.length}</p>
              </div>
            </div>
            {formattedOrder?.notes && (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <span className="text-xs font-medium text-gray-500">ملاحظات</span>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {formattedOrder.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className={modalSectionClass}>
          <div className={modalSectionHeaderClass}>عناصر الطلب</div>

          {formattedItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              لا توجد عناصر في هذا الطلب
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 sm:hidden">
                {formattedItems.map((item, index) => (
                  <div key={item.purchase_order_items_id ?? index} className="space-y-2 p-4">
                    <p className="font-semibold text-gray-900">{item.display_name}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400">التعبئة: </span>
                        {item.packaging_name}
                      </div>
                      <div>
                        <span className="text-gray-400">الكمية: </span>
                        {item.calculated.quantity.toLocaleString("en-GB")}
                      </div>
                      <div>
                        <span className="text-gray-400">مستلم: </span>
                        {item.received_qty.toLocaleString("en-GB")}
                      </div>
                      <div>
                        <span className="text-gray-400">مرتجع: </span>
                        {item.returned_qty.toLocaleString("en-GB")}
                      </div>
                      <div>
                        <span className="text-gray-400">سعر الوحدة: </span>
                        {formatMoney(item.calculated.unitCost)}
                      </div>
                      <div>
                        <span className="text-gray-400">الإجمالي: </span>
                        <span className="font-semibold text-gray-900">
                          {formatMoney(item.calculated.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#FAFAFE]">
                    <tr>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        المنتج
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        التعبئة
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        مطلوب
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        مستلم
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        مرتجع
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        سعر الوحدة
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {formattedItems.map((item, index) => (
                      <tr
                        key={item.purchase_order_items_id ?? index}
                        className="hover:bg-gray-50/80"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {item.display_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.packaging_name}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.calculated.quantity.toLocaleString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.received_qty.toLocaleString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.returned_qty.toLocaleString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatMoney(item.calculated.unitCost)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {formatMoney(item.calculated.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-[#C4A8F0]/30 overflow-hidden bg-gradient-to-l from-[#FAFAFE] to-[#F3EEFF]">
          <div className="border-b border-[#EDE7FF] bg-white/70 px-4 py-3 sm:px-6">
            <h3 className="text-sm font-semibold text-[#4A2D8C]">ملخص المبالغ</h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-2 text-sm max-w-md ms-auto">
              <div className="flex justify-between text-gray-700">
                <span>مجموع العناصر</span>
                <span className="font-medium">{formatMoney(orderTotals.subtotal)}</span>
              </div>
              {orderTotals.orderDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>خصم على الطلب</span>
                  <span>-{formatMoney(orderTotals.orderDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#C4A8F0]/40 pt-3 text-base font-bold">
                <span>الإجمالي النهائي</span>
                <span className="text-green-600">{formatMoney(orderTotals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppModalShell>
  );
};

export default PurchaseOrderDetailsModal;
