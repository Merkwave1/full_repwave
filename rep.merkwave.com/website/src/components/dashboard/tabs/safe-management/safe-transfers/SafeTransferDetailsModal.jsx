// src/components/dashboard/tabs/safe-management/safe-transfers/SafeTransferDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowsRightLeftIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { getSafeTransferDetails } from '../../../../../apis/safe_transfers';
import { updateTransactionStatus } from '../../../../../apis/safe_transactions';
import Loader from '../../../../common/Loader/Loader';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDateTime } from '../../../../../utils/dateUtils';

const STATUS_META = {
  pending: {
    label: 'في انتظار الموافقة',
    className: 'bg-amber-100 text-amber-700 border border-amber-200',
    icon: ClockIcon,
  },
  approved: {
    label: 'تمت الموافقة',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    icon: CheckCircleIcon,
  },
  rejected: {
    label: 'تم رفضها',
    className: 'bg-rose-100 text-rose-700 border border-rose-200',
    icon: XCircleIcon,
  },
};

const SafeTransferDetailsModal = ({ transferId, onClose, onActionComplete = () => {} }) => {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
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
        setError(err.message || 'خطأ في تحميل تفاصيل التحويل');
      } finally {
        setLoading(false);
      }
    };

    if (transferId) {
      loadTransferDetails();
    }
  }, [transferId]);

  const overallStatus = (transfer?.transfer_status || transfer?.safe_transactions_status || '').toLowerCase();
  const transferOutStatus = (transfer?.transfer_out_status || transfer?.safe_transactions_status || '').toLowerCase();
  const transferInStatus = (transfer?.transfer_in_status || transfer?.pair_transaction_status || '').toLowerCase();
  const statusInfo = STATUS_META[overallStatus] || STATUS_META.approved;
  const StatusIcon = statusInfo.icon;
  const canTakeAction = overallStatus === 'pending';
  const primaryTransactionId = transfer?.transfer_out_id
    ?? (transfer?.safe_transactions_type === 'transfer_out' ? transfer?.safe_transactions_id : transfer?.pair_transaction_id)
    ?? transfer?.safe_transactions_id
    ?? null;

  const renderStatusBadge = (statusKey) => {
    const normalized = (statusKey || '').toLowerCase();
    const meta = STATUS_META[normalized] || STATUS_META.approved;
    const IconComponent = meta.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
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
      await updateTransactionStatus(primaryTransactionId, nextStatus, trimmedNote);
      setActionLoading(false);
      setPendingDecision(null);
      setDecisionNote('');
      onActionComplete(nextStatus);
    } catch (err) {
      setActionLoading(false);
      setPendingDecision(null);
      setActionError(err?.message || 'تعذر تحديث حالة التحويل، يرجى المحاولة مرة أخرى.');
    }
  };

  const formatDate = (dateString) => formatLocalDateTime(dateString);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600" />
              تفاصيل التحويل
            </h3>
            <div className="flex items-center gap-3">
              {transfer && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.className}`}>
                  {StatusIcon ? <StatusIcon className="h-4 w-4" /> : null}
                  <span>{statusInfo.label}</span>
                </span>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                type="button"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]" dir="rtl">
          {loading ? (
            <div className="p-6">
              <Loader />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            </div>
          ) : transfer ? (
            <div className="p-6 space-y-6">
              {/* Transfer Overview */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ArrowsRightLeftIcon className="h-5 w-5 text-blue-600" />
                  نظرة عامة على التحويل
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">رقم التحويل:</span>
                      <p className="text-lg font-semibold text-gray-800">{transfer.safe_transactions_id}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">الخزنة المصدر:</span>
                      <p className="text-lg font-semibold text-red-600">
                        {transfer.source_safe_name || 'غير محدد'}
                        <span className="text-sm text-gray-500 mr-2">
                          ({transfer.source_safe_type === 'company' ? 'خزنة الشركة' : 'خزنة مندوب'})
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">الخزنة الوجهة:</span>
                      <p className="text-lg font-semibold text-green-600">
                        {transfer.destination_safe_name || 'غير محدد'}
                        <span className="text-sm text-gray-500 mr-2">
                          ({transfer.destination_safe_type === 'company' ? 'خزنة الشركة' : 'خزنة مندوب'})
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {formatMoney(transfer.safe_transactions_amount)}
                      </div>
                      <div className="text-sm text-gray-600">مبلغ التحويل</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Overview */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                  حالة التحويل
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 tracking-wide">الحالة العامة</span>
                    {renderStatusBadge(overallStatus)}
                    {transfer.safe_transactions_admin_notes && !canTakeAction ? (
                      <p className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-md p-2 mt-2 whitespace-pre-wrap">
                        {transfer.safe_transactions_admin_notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 tracking-wide">التحويل الصادر</span>
                    <div className="space-y-2">
                      {renderStatusBadge(transferOutStatus)}
                      {transfer.transfer_out_approved_by_name ? (
                        <div className="text-[11px] text-gray-500 leading-4">
                          بواسطة {transfer.transfer_out_approved_by_name}
                          {transfer.transfer_out_approved_date ? ` • ${formatDate(transfer.transfer_out_approved_date)}` : ''}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 tracking-wide">التحويل الوارد</span>
                    <div className="space-y-2">
                      {renderStatusBadge(transferInStatus)}
                      {transfer.transfer_in_approved_by_name ? (
                        <div className="text-[11px] text-gray-500 leading-4">
                          بواسطة {transfer.transfer_in_approved_by_name}
                          {transfer.transfer_in_approved_date ? ` • ${formatDate(transfer.transfer_in_approved_date)}` : ''}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {actionError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {actionError}
                </div>
              ) : null}

              {canTakeAction ? (
                <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                    <h4 className="text-lg font-semibold text-gray-800">ملاحظات المسؤول</h4>
                  </div>
                  <p className="text-sm text-gray-600">يمكنك إضافة سبب الموافقة أو الرفض.</p>
                  <textarea
                    value={decisionNote}
                    onChange={e => setDecisionNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 transition shadow-sm text-sm p-3 resize-none"
                    rows={3}
                    placeholder="اكتب ملاحظاتك هنا (اختياري)"
                  />
                </div>
              ) : null}

              {/* Transfer Details */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                  تفاصيل إضافية
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">تاريخ التحويل:</span>
                        <p className="text-sm text-gray-800">{formatDate(transfer.safe_transactions_date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">منفذ بواسطة:</span>
                        <p className="text-sm text-gray-800">{transfer.user_name || 'غير محدد'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">تاريخ الإنشاء:</span>
                        <p className="text-sm text-gray-800">{formatDate(transfer.safe_transactions_created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {transfer.safe_transactions_notes && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-yellow-600" />
                    ملاحظات
                  </h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{transfer.safe_transactions_notes}</p>
                </div>
              )}

              {/* Transaction Type Badge */}
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {transfer.safe_transactions_type === 'transfer_out' ? 'تحويل صادر' : 
                   transfer.safe_transactions_type === 'transfer_in' ? 'تحويل وارد' : 
                   transfer.safe_transactions_type}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              لا توجد بيانات للعرض
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {canTakeAction ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDecision('rejected')}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionLoading && pendingDecision === 'rejected' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الرفض...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <XCircleIcon className="h-4 w-4" />
                      رفض الطلب
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDecision('approved')}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionLoading && pendingDecision === 'approved' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الموافقة...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4" />
                      الموافقة على التحويل
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                {overallStatus === 'approved'
                  ? 'تمت الموافقة على هذا التحويل.'
                  : overallStatus === 'rejected'
                    ? 'تم رفض هذا التحويل.'
                    : null}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md shadow-sm transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeTransferDetailsModal;
