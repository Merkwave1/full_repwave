// src/components/dashboard/tabs/purchases-management/purchase-returns/PurchaseReturnDetailsModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaPrint } from "react-icons/fa";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import AppModalShell, { modalPrimaryBtnClass, modalSecondaryBtnClass } from "../../../../common/AppModalShell.jsx";
import Loader from "../../../../common/Loader/Loader";
import { getPurchaseReturnDetails } from "../../../../../apis/purchase_returns";
import useCurrency from "../../../../../hooks/useCurrency";

export default function PurchaseReturnDetailsModal({
  purchaseReturn,
  suppliers,
  onClose,
  onPrint,
  onEdit,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const detailsData = await getPurchaseReturnDetails(
          purchaseReturn.purchase_returns_id,
        );
        setDetails(detailsData);
      } catch (err) {
        console.error("Error loading purchase return details:", err);
        setError("فشل في تحميل تفاصيل مرتجع الشراء");
      } finally {
        setLoading(false);
      }
    };

    if (purchaseReturn?.purchase_returns_id) {
      loadDetails();
    }
  }, [purchaseReturn]);

  const { formatCurrency: formatMoney } = useCurrency();

  const calculateItemTotal = useCallback((item) => {
    const quantity = parseFloat(item.purchase_return_items_quantity) || 0;
    const unitPrice = parseFloat(item.purchase_return_items_unit_cost) || 0;
    const total = quantity * unitPrice;
    return { total };
  }, []);

  const supplierName = useMemo(() => {
    const sid = details?.purchase_returns_supplier_id;
    const s = suppliers?.find((x) => x.supplier_id == sid);
    return s?.supplier_name || details?.supplier_name || "غير محدد";
  }, [details, suppliers]);

  const formattedReturnData = useMemo(() => {
    if (!details) return null;
    return {
      ...details,
      formatted_date: details.purchase_returns_date
        ? new Date(details.purchase_returns_date).toLocaleDateString("en-GB") +
          " " +
          new Date(details.purchase_returns_date).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      items: (details.items || []).map((it) => ({
        ...it,
        display_name: it.products_name || it.variant_name || "غير محدد",
        packaging_type_name: it.packaging_types_name || "غير محدد",
        calculated: calculateItemTotal(it),
      })),
    };
  }, [details, calculateItemTotal]);

  const returnTotals = useMemo(() => {
    if (!formattedReturnData?.items) return { grandTotal: 0 };
    const itemsTotal = formattedReturnData.items.reduce(
      (s, it) => s + (parseFloat(it.calculated.total) || 0),
      0,
    );
    // Try explicit fields first, otherwise try to parse a discount value from notes (e.g. "(خصم إرجاع: 3000)")
    let orderDiscount =
      parseFloat(
        formattedReturnData.purchase_returns_order_discount ||
          formattedReturnData.purchase_return_order_discount ||
          0,
      ) || 0;
    if (!orderDiscount && formattedReturnData.purchase_returns_notes) {
      const notes = String(formattedReturnData.purchase_returns_notes || "");
      // Regex to catch Arabic 'خصم إرجاع' or generic 'discount' patterns followed by a number
      const reArabic = /خصم\s*إرجاع\s*[:：]?\s*([0-9.,]+)/i;
      const reGeneric = /discount\s*[:：]?\s*([0-9.,]+)/i;
      let m = notes.match(reArabic) || notes.match(reGeneric);
      if (m && m[1]) {
        // Remove commas and parse
        const cleaned = m[1].replace(/,/g, "");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) orderDiscount = parsed;
      }
    }
    const grandTotal = Math.max(itemsTotal - orderDiscount, 0);
    return { itemsTotal, orderDiscount, grandTotal };
  }, [formattedReturnData]);

  const statusColors = {
    Draft: "bg-gray-100 text-gray-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Approved: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Processed: "bg-[#EDE7FF] text-[#2D1B69]",
    Cancelled: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <AppModalShell open onClose={onClose} title="تفاصيل مرتجع الشراء" icon={ArrowUturnLeftIcon} size="3xl" gradient="amber">
        <Loader className="mt-8" />
      </AppModalShell>
    );
  }

  if (error) {
    return (
      <AppModalShell open onClose={onClose} title="تفاصيل مرتجع الشراء" icon={ArrowUturnLeftIcon} size="md" gradient="amber">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>
      </AppModalShell>
    );
  }

  if (!formattedReturnData) return null;

  return (
    <AppModalShell
      open
      onClose={onClose}
      title={`تفاصيل مرتجع الشراء #${formattedReturnData.purchase_returns_id}`}
      subtitle={formattedReturnData.purchase_returns_status || "غير محدد"}
      icon={ArrowUturnLeftIcon}
      size="3xl"
      gradient="amber"
      headerActions={
        <button
          type="button"
          onClick={() => onPrint?.(details)}
          className="no-print p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
          title="طباعة"
        >
          <FaPrint size={16} />
        </button>
      }
      footer={
        <div className="flex items-center justify-end gap-3 print:hidden">
          {onEdit && (
            <button type="button" onClick={() => onEdit(purchaseReturn)} className={modalPrimaryBtnClass}>
              تعديل
            </button>
          )}
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
        <div className="space-y-6">
            {/* Return Information Card */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                معلومات المرتجع
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    رقم المرتجع:
                  </span>
                  <p className="text-gray-900">
                    {formattedReturnData.purchase_returns_id}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    المورد:
                  </span>
                  <p className="text-gray-900">{supplierName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    التاريخ:
                  </span>
                  <p className="text-gray-900">
                    {formattedReturnData.formatted_date}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    الحالة:
                  </span>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[formattedReturnData.purchase_returns_status] || "bg-gray-100 text-gray-800"}`}
                  >
                    {formattedReturnData.purchase_returns_status || "غير محدد"}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    أمر الشراء المرتبط:
                  </span>
                  <p className="text-gray-900">
                    {formattedReturnData.purchase_returns_purchase_order_id
                      ? `#${formattedReturnData.purchase_returns_purchase_order_id}`
                      : "غير مرتبط"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    إجمالي المرتجع:
                  </span>
                  <p className="text-lg font-semibold text-green-600">
                    {formatMoney(returnTotals.grandTotal)}
                  </p>
                </div>
              </div>
              {(formattedReturnData.purchase_returns_reason ||
                formattedReturnData.purchase_returns_notes) && (
                <div className="mt-4">
                  {formattedReturnData.purchase_returns_reason && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        سبب المرتجع:
                      </span>
                      <p className="text-gray-900 mt-1">
                        {formattedReturnData.purchase_returns_reason}
                      </p>
                    </div>
                  )}
                  {formattedReturnData.purchase_returns_notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        ملاحظات:
                      </span>
                      <p className="text-gray-900 mt-1">
                        {formattedReturnData.purchase_returns_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  عناصر المرتجع
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        المنتج
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الكمية
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        سعر الوحدة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formattedReturnData.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          لا توجد عناصر في هذا المرتجع
                        </td>
                      </tr>
                    ) : (
                      formattedReturnData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.display_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.packaging_type_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {parseFloat(
                              item.purchase_return_items_quantity,
                            ).toLocaleString("en-GB")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatMoney(item.purchase_return_items_unit_cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatMoney(item.calculated.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ملخص المرتجع
              </h3>
              <div className="space-y-2">
                {/* Show breakdown: items total, order discount (if any), grand total */}
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-medium">
                    {formatMoney(returnTotals.itemsTotal || 0)}
                  </span>
                </div>
                {returnTotals.orderDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">خصم على الطلب:</span>
                    <span className="font-medium text-red-600">
                      -{formatMoney(returnTotals.orderDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-300">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-green-600">
                    {formatMoney(returnTotals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
    </AppModalShell>
  );
}
