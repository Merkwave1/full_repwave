// src/components/dashboard/tabs/safe-management/safe-transactions/TransactionDetailsModal.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  PhotoIcon,
  CalendarIcon,
  BanknotesIcon,
  DocumentTextIcon,
  UserIcon,
  ArchiveBoxIcon,
  TagIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import ConfirmActionModal from '../../../../common/ConfirmActionModal';
import { getSafeTransactionDetails, updateTransactionStatus } from '../../../../../apis/safe_transactions';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDateTime } from '../../../../../utils/dateUtils';

const TransactionDetailsModal = ({ transactionId, onClose, onStatusUpdate }) => {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'approve' or 'reject'

  const fetchTransactionDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSafeTransactionDetails(transactionId);
      setTransaction(response);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      setError(error.message || 'حدث خطأ أثناء جلب تفاصيل المعاملة');
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails();
    }
  }, [transactionId, fetchTransactionDetails]);

  const handleStatusUpdate = async (status) => {
    try {
      setUpdating(true);
      await updateTransactionStatus(transactionId, status);
      
      // Update local state
      setTransaction(prev => ({
        ...prev,
        status: status,
        approved_by_name: 'Current Admin', // This should come from your auth context
        approved_date: new Date().toISOString()
      }));
      
      // Call parent callback to refresh the transactions list
      if (onStatusUpdate) {
        onStatusUpdate();
      }
      
      // Close the confirmation modal
      setConfirmAction(null);
      
    } catch (error) {
      console.error('Error updating transaction status:', error);
      setError(error.message || 'حدث خطأ أثناء تحديث حالة المعاملة');
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveClick = () => {
    setConfirmAction('approve');
  };

  const handleRejectClick = () => {
    setConfirmAction('reject');
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'approve') {
      handleStatusUpdate('approved');
    } else if (confirmAction === 'reject') {
      handleStatusUpdate('rejected');
    }
  };

  const handleCancelConfirmation = () => {
    setConfirmAction(null);
  };

  const isOutgoingTransaction = useCallback((type, amount) => {
    const outgoingTypes = ['expense', 'withdrawal', 'transfer_out', 'supplier_payment', 'payment'];
    return outgoingTypes.includes(type) || parseFloat(amount) < 0;
  }, []);

  const formatTransactionAmount = useCallback((transaction) => {
    const amount = parseFloat(transaction?.amount || 0);
    const type = transaction?.type;
    const isOutgoing = isOutgoingTransaction(type, amount);
    
    if (isOutgoing) {
      return {
        color: 'text-red-600',
        sign: '-',
        value: Math.abs(amount)
      };
    } else {
      return {
        color: 'text-green-600', 
        sign: '+',
        value: Math.abs(amount)
      };
    }
  }, [isOutgoingTransaction]);

  const getTransactionTypeDisplay = (type) => {
    const types = {
      'deposit': 'إيداع',
      'withdrawal': 'سحب',
      'transfer_in': 'تحويل وارد',
      'transfer_out': 'تحويل صادر',
      'payment': 'دفعة',
      'receipt': 'إيصال',
      'supplier_payment': 'دفعة مورد',
      'purchase': 'مشتريات',
      'sale': 'مبيعات',
      'expense': 'مصروف',
      'other': 'أخرى'
    };
    return types[type] || type;
  };

  const getSafeTypeLabel = (type) => {
    switch (type) {
      case 'company':
        return 'خزنة الشركة';
      case 'rep':
        return 'خزنة مندوب';
      case 'store_keeper':
        return 'خزنة أمين مخزن';
      default:
        return type || '—';
    }
  };

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  }, []);

  const getStatusText = useCallback((status) => {
    switch (status) {
      case 'approved': return 'موافق عليه';
      case 'rejected': return 'مرفوض';
      default: return 'في الانتظار';
    }
  }, []);

  const amountData = useMemo(
    () => formatTransactionAmount(transaction),
    [transaction, formatTransactionAmount]
  );
  const directionDetails = transaction?.direction_details;
  const summaryCards = useMemo(() => ([
    {
      label: 'إجمالي المبلغ',
      value: transaction ? `${amountData.sign}${formatMoney(amountData.value, { withSymbol: false })} ${symbol}` : '-',
      icon: BanknotesIcon,
      valueClass: amountData.color,
      helper: getTransactionTypeDisplay(transaction?.type),
    },
    {
      label: 'الحالة الحالية',
      value: getStatusText(transaction?.status),
      icon: ShieldCheckIcon,
      badgeClass: getStatusColor(transaction?.status),
    },
    {
      label: 'تاريخ الإنشاء',
      value: formatLocalDateTime(transaction?.date),
      icon: CalendarIcon,
    },
  ]), [transaction, amountData, symbol, getStatusText, getStatusColor, formatMoney]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <Loader />
          <p className="text-center mt-4 text-gray-600">جاري تحميل تفاصيل المعاملة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="text-center">
              <XMarkIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">تفاصيل المعاملة #{transaction?.id}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {summaryCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div key={index} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start gap-3">
                    <div className="bg-blue-50 text-blue-600 rounded-full p-3">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                      <p className={`text-lg font-bold text-gray-900 ${card.valueClass || ''}`}>{card.value || '-'}</p>
                      {card.helper && <p className="text-xs text-gray-400 mt-1">{card.helper}</p>}
                      {card.badgeClass && (
                        <span className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-semibold ${card.badgeClass}`}>
                          {card.value}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {directionDetails && (
              <div className="mb-6 bg-gradient-to-l from-blue-50 via-white to-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-blue-700 mb-4">
                  <InformationCircleIcon className="h-5 w-5" />
                  <h3 className="text-base font-semibold">مسار التحويل</h3>
                </div>
                <div className="flex flex-col md:flex-row items-stretch gap-4">
                  <div className="flex-1 bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-red-600 font-semibold mb-1">صادر من</p>
                    <p className="text-base font-bold text-gray-900">{directionDetails.source_safe_name || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{getSafeTypeLabel(directionDetails.source_safe_type)}</p>
                    {directionDetails.source_rep_name && directionDetails.source_safe_type !== 'company' && (
                      <p className="text-xs text-gray-400 mt-2">المسؤول: {directionDetails.source_rep_name}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-center md:px-4">
                    <ArrowRightIcon className="h-6 w-6 text-blue-500 transform rotate-180" />
                  </div>
                  <div className="flex-1 bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-green-600 font-semibold mb-1">وارد إلى</p>
                    <p className="text-base font-bold text-gray-900">{directionDetails.destination_safe_name || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{getSafeTypeLabel(directionDetails.destination_safe_type)}</p>
                    {directionDetails.destination_rep_name && directionDetails.destination_safe_type !== 'company' && (
                      <p className="text-xs text-gray-400 mt-2">المسؤول: {directionDetails.destination_rep_name}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b pb-3">
                  <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="text-base font-semibold text-gray-900">معلومات المعاملة</h3>
                </div>

                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">التاريخ</p>
                    <p className="text-sm font-semibold text-gray-900">{formatLocalDateTime(transaction?.date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BanknotesIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">نوع المعاملة</p>
                    <p className="text-sm font-semibold text-gray-900">{getTransactionTypeDisplay(transaction?.type)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BanknotesIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">المبلغ</p>
                    <p className={`text-base font-bold ${amountData.color}`}>
                      {amountData.sign}{formatMoney(amountData.value, { withSymbol: false })} {symbol}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">الوصف</p>
                    <p className="text-sm font-semibold text-gray-900 leading-6">{transaction?.description || 'لا يوجد وصف'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <TagIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">المرجع</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{transaction?.reference || '-'}</p>
                    {transaction?.related_transaction_id && (
                      <p className="text-[11px] text-gray-400 mt-1">مرتبط بالعملية رقم {transaction.related_transaction_id}</p>
                    )}
                  </div>
                </div>

                {transaction?.account_code && (
                  <div className="flex items-start gap-3">
                    <TagIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">الحساب</p>
                      <p className="text-sm font-semibold text-gray-900">{transaction.account_code} - {transaction.account_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{transaction.account_type}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b pb-3">
                  <ArchiveBoxIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="text-base font-semibold text-gray-900">معلومات الخزنة والمستخدمين</h3>
                </div>

                <div className="flex items-start gap-3">
                  <ArchiveBoxIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">الخزنة الحالية</p>
                    <p className="text-sm font-semibold text-gray-900">{transaction?.safe_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{getSafeTypeLabel(transaction?.safe_type)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">وصف الخزنة</p>
                    <p className="text-sm font-semibold text-gray-900 leading-6">{transaction?.safe_description || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <UserIcon className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">تم الإنشاء بواسطة</p>
                    <p className="text-sm font-semibold text-gray-900">{transaction?.rep_name || transaction?.created_by?.name || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">{transaction?.rep_email || transaction?.created_by?.email || ''}</p>
                  </div>
                </div>

                {transaction?.approved_by_name && (
                  <div className="flex items-start gap-3">
                    <CheckIcon className="h-5 w-5 text-green-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">تم اعتمادها بواسطة</p>
                      <p className="text-sm font-semibold text-gray-900">{transaction?.approved_by_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatLocalDateTime(transaction?.approved_date)}</p>
                    </div>
                  </div>
                )}

                {transaction?.related_transaction && !directionDetails && (
                  <div className="flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">عملية مرتبطة</p>
                      <p className="text-sm font-semibold text-gray-900">{transaction.related_transaction.safe_name || '—'}</p>
                      <p className="text-xs text-gray-400 mt-1">{getTransactionTypeDisplay(transaction.related_transaction.type)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Image */}
            {transaction?.receipt_image && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">صورة الإيصال</h3>
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={transaction.receipt_image_url}
                    alt="Receipt"
                    className="max-w-xs rounded-lg shadow-md select-none"
                    draggable={false}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 select-none">للحفظ: زر يمين على الصورة</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {transaction?.status === 'pending' && (
              <div className="flex gap-4 justify-center pt-6 border-t">
                <button
                  onClick={handleApproveClick}
                  disabled={updating}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {updating && confirmAction === 'approve' ? (
                    <Loader />
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      الموافقة
                    </>
                  )}
                </button>
                <button
                  onClick={handleRejectClick}
                  disabled={updating}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {updating && confirmAction === 'reject' ? (
                    <Loader />
                  ) : (
                    <>
                      <XCircleIcon className="h-5 w-5" />
                      الرفض
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
  {/* Removed enlarge modal per request */}

      {/* Confirmation Modal */}
      <ConfirmActionModal
        isOpen={confirmAction !== null}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirmAction}
        message={
          confirmAction === 'approve'
            ? `هل أنت متأكد من الموافقة على هذه المعاملة؟\n\nالمعاملة رقم: ${transaction?.id}\nالمبلغ: ${amountData.sign}${formatMoney(amountData.value, { withSymbol: false })} ${symbol}`
            : confirmAction === 'reject'
            ? `هل أنت متأكد من رفض هذه المعاملة؟\n\nالمعاملة رقم: ${transaction?.id}\nالمبلغ: ${amountData.sign}${formatMoney(amountData.value, { withSymbol: false })} ${symbol}`
            : ''
        }
        confirmButtonText={confirmAction === 'approve' ? 'نعم، الموافقة' : 'نعم، الرفض'}
        cancelButtonText="إلغاء"
        isDestructive={confirmAction === 'reject'}
      />
    </>
  );
};

export default TransactionDetailsModal;
