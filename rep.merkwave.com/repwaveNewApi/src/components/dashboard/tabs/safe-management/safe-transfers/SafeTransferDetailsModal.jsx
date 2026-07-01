// src/components/dashboard/tabs/safe-management/safe-transfers/SafeTransferDetailsModal.jsx
import React, { useState, useEffect } from "react";
import {
  ArrowsRightLeftIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import AppModalShell, { modalPrimaryBtnClass, modalSecondaryBtnClass } from "../../../../common/AppModalShell.jsx";
import { getSafeTransferDetails } from "../../../../../apis/safe_transfers";
import { updateTransactionStatus } from "../../../../../apis/safe_transactions";
import Loader from "../../../../common/Loader/Loader";
import useCurrency from "../../../../../hooks/useCurrency";
import { formatLocalDateTime } from "../../../../../utils/dateUtils";

const STATUS_META = {
  pending: {
    label: "في انتظار الموافقة",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
    icon: ClockIcon,
  },
  approved: {
    label: "تمت الموافقة",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    icon: CheckCircleIcon,
  },
  rejected: {
    label: "تم رفضها",
    className: "bg-rose-100 text-rose-700 border border-rose-200",
    icon: XCircleIcon,
  },
};

const SafeTransferDetailsModal = ({
  transferId,
  onClose,
  onActionComplete = () => {},
}) => {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [pendingDecision, setPendingDecision] = useState(null);
  const { formatCurrency: formatMoney } = useCurrency();

  useEffect(() => {
    const loadTransferDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSafeTransferDetails(transferId);
        setTransfer(data);
      } catch (err) {
        setError(err.message || "خطأ في تحميل تفاصيل التحويل");
      } finally {
        setLoading(false);
      }
    };

    if (transferId) {
      loadTransferDetails();
    }
  }, [transferId]);

  const overallStatus = (
    transfer?.transfer_status ||
    transfer?.safe_transactions_status ||
    ""
  ).toLowerCase();
  const transferOutStatus = (
    transfer?.transfer_out_status ||
    transfer?.safe_transactions_status ||
    ""
  ).toLowerCase();
  const transferInStatus = (
    transfer?.transfer_in_status ||
    transfer?.pair_transaction_status ||
    ""
  ).toLowerCase();
  const statusInfo = STATUS_META[overallStatus] || STATUS_META.approved;
  const StatusIcon = statusInfo.icon;
  const canTakeAction = overallStatus === "pending";
  const primaryTransactionId =
    transfer?.transfer_out_id ??
    (transfer?.safe_transactions_type === "transfer_out"
      ? transfer?.safe_transactions_id
      : transfer?.pair_transaction_id) ??
    transfer?.safe_transactions_id ??
    null;

  const renderStatusBadge = (statusKey) => {
    const normalized = (statusKey || "").toLowerCase();
    const meta = STATUS_META[normalized] || STATUS_META.approved;
    const IconComponent = meta.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}
      >
        {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
        <span>{meta.label}</span>
      </span>
    );
  };

  const handleDecision = async (nextStatus) => {
    if (!transfer || !primaryTransactionId) {
      return;
    }

    const trimmedNote = decisionNote.trim();
    setPendingDecision(nextStatus);
    setActionLoading(true);
    setActionError(null);

    try {
      await updateTransactionStatus(
        primaryTransactionId,
        nextStatus,
        trimmedNote,
      );
      setActionLoading(false);
      setPendingDecision(null);
      setDecisionNote("");
      onActionComplete(nextStatus);
    } catch (err) {
      setActionLoading(false);
      setPendingDecision(null);
      setActionError(
        err?.message || "تعذر تحديث حالة التحويل، يرجى المحاولة مرة أخرى.",
      );
    }
  };

  const formatDate = (dateString) => formatLocalDateTime(dateString);

  return (
    <AppModalShell
      open
      onClose={onClose}
      title="تفاصيل التحويل"
      subtitle={transfer ? `#${transfer.safe_transactions_id}` : undefined}
      icon={ArrowsRightLeftIcon}
      size="lg"
      gradient="brand"
      zIndex="z-[9999]"
      portal
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          {canTakeAction ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleDecision("rejected")}
                disabled={actionLoading}
                className={`${modalPrimaryBtnClass} bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-60`}
              >
                {actionLoading && pendingDecision === "rejected" ? (
                  <>جاري الرفض...</>
                ) : (
                  <>
                    <XCircleIcon className="h-4 w-4" /> رفض الطلب
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDecision("approved")}
                disabled={actionLoading}
                className={`${modalPrimaryBtnClass} bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-60`}
              >
                {actionLoading && pendingDecision === "approved" ? (
                  <>جاري الموافقة...</>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" /> الموافقة على التحويل
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {overallStatus === "approved"
                ? "✓ تمت الموافقة على هذا التحويل."
                : overallStatus === "rejected"
                  ? "✗ تم رفض هذا التحويل."
                  : null}
            </p>
          )}
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
          {loading ? (
            <Loader />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          ) : transfer ? (
            <div className="space-y-3">
              {/* Transfer Overview Card */}
              <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-[#f5f3ff] px-4 py-2 flex items-center gap-2">
                  <ArrowsRightLeftIcon className="h-4 w-4 text-[#8B5FD6]" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#7A52C2]">
                    نظرة عامة على التحويل
                  </span>
                </div>
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        رقم التحويل
                      </p>
                      <p className="text-base font-bold text-gray-800 mt-0.5">
                        #{transfer.safe_transactions_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        الخزنة المصدر
                      </p>
                      <p className="text-sm font-semibold text-red-600 mt-0.5">
                        {transfer.source_safe_name || "غير محدد"}
                        <span className="text-xs text-gray-400 font-normal mr-1">
                          (
                          {transfer.source_safe_type === "company"
                            ? "شركة"
                            : "مندوب"}
                          )
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        الخزنة الوجهة
                      </p>
                      <p className="text-sm font-semibold text-green-600 mt-0.5">
                        {transfer.destination_safe_name || "غير محدد"}
                        <span className="text-xs text-gray-400 font-normal mr-1">
                          (
                          {transfer.destination_safe_type === "company"
                            ? "شركة"
                            : "مندوب"}
                          )
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end">
                    <div className="bg-gradient-to-br from-[#f5f3ff] to-[#f5f3ff] border border-[#EDE7FF] rounded-xl px-5 py-4 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-[#8B5FD6]">
                        {formatMoney(transfer.safe_transactions_amount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">مبلغ التحويل</p>
                      {transfer.safe_transactions_type && (
                        <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EDE7FF] text-[#7A52C2]">
                          {transfer.safe_transactions_type === "transfer_out"
                            ? "صادر"
                            : transfer.safe_transactions_type === "transfer_in"
                              ? "وارد"
                              : transfer.safe_transactions_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    حالة التحويل
                  </span>
                </div>
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      الحالة العامة
                    </p>
                    {renderStatusBadge(overallStatus)}
                    {transfer.safe_transactions_admin_notes &&
                      !canTakeAction && (
                        <p className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-lg p-2 whitespace-pre-wrap">
                          {transfer.safe_transactions_admin_notes}
                        </p>
                      )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      التحويل الصادر
                    </p>
                    {renderStatusBadge(transferOutStatus)}
                    {transfer.transfer_out_approved_by_name && (
                      <p className="text-[11px] text-gray-500 leading-4">
                        بواسطة {transfer.transfer_out_approved_by_name}
                        {transfer.transfer_out_approved_date
                          ? ` • ${formatDate(transfer.transfer_out_approved_date)}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      التحويل الوارد
                    </p>
                    {renderStatusBadge(transferInStatus)}
                    {transfer.transfer_in_approved_by_name && (
                      <p className="text-[11px] text-gray-500 leading-4">
                        بواسطة {transfer.transfer_in_approved_by_name}
                        {transfer.transfer_in_approved_date
                          ? ` • ${formatDate(transfer.transfer_in_approved_date)}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Error */}
              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {actionError}
                </div>
              )}

              {/* Admin Notes (when pending) */}
              {canTakeAction && (
                <div className="rounded-xl border border-[#C4A8F0] shadow-sm overflow-hidden">
                  <div className="bg-[#f5f3ff] px-4 py-2 flex items-center gap-2">
                    <DocumentTextIcon className="h-4 w-4 text-[#8B5FD6]" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#7A52C2]">
                      ملاحظات المسؤول
                    </span>
                  </div>
                  <div className="p-3 sm:p-4 space-y-2">
                    <p className="text-xs text-gray-500">
                      يمكنك إضافة سبب الموافقة أو الرفض (اختياري).
                    </p>
                    <textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#8B5FD6] transition resize-none"
                      rows={2}
                      placeholder="اكتب ملاحظاتك هنا..."
                    />
                  </div>
                </div>
              )}

              {/* Extra Details Card */}
              <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    تفاصيل إضافية
                  </span>
                </div>
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium">
                        تاريخ التحويل
                      </p>
                      <p className="text-gray-800">
                        {formatDate(transfer.safe_transactions_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium">
                        تاريخ الإنشاء
                      </p>
                      <p className="text-gray-800">
                        {formatDate(transfer.safe_transactions_created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium">
                        منفذ بواسطة
                      </p>
                      <p className="text-gray-800">
                        {transfer.user_name || "غير محدد"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {transfer.safe_transactions_notes && (
                <div className="rounded-xl border border-amber-200 overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2 flex items-center gap-2">
                    <DocumentTextIcon className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      ملاحظات
                    </span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {transfer.safe_transactions_notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">لا توجد بيانات للعرض</div>
          )}
    </AppModalShell>
  );
};

export default SafeTransferDetailsModal;
