// src/components/dashboard/tabs/purchases-management/supplier-payments/SupplierPaymentDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, EyeIcon, BanknotesIcon, UserIcon, CalendarIcon, ClipboardDocumentListIcon, CreditCardIcon, ArchiveBoxIcon, PrinterIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import { getSupplierPaymentDetails } from '../../../../../apis/supplier_payments';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDateTime } from '../../../../../utils/dateUtils';

const SupplierPaymentDetailsModal = ({ paymentId, onClose, onPrint }) => {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { formatCurrency: formatMoney } = useCurrency();

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await getSupplierPaymentDetails(paymentId);
        const details = payload?.payment_details || payload;
        setPayment(details);
      } catch (error) {
        console.error('Error fetching payment details:', error);
        setError(error.message || 'حدث خطأ أثناء جلب تفاصيل الدفعة');
      } finally {
        setLoading(false);
      }
    };
    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId]);

  // (fetchPaymentDetails is defined inside useEffect to satisfy exhaustive-deps)

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'قيد الانتظار' },
      approved: { color: 'bg-green-100 text-green-800', text: 'موافق' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'ملغي' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status || 'غير محدد' };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      advance: { color: 'bg-blue-100 text-blue-800', text: 'دفعة مقدمة' },
      partial: { color: 'bg-orange-100 text-orange-800', text: 'دفعة جزئية' },
      full: { color: 'bg-green-100 text-green-800', text: 'دفعة كاملة' },
      other: { color: 'bg-purple-100 text-purple-800', text: 'أخرى' }
    };
    const config = typeConfig[type] || { color: 'bg-gray-100 text-gray-800', text: type || 'غير محدد' };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <Loader />
          <p className="text-center mt-4 text-gray-600">جاري تحميل تفاصيل الدفعة...</p>
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
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <XMarkIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <EyeIcon className="h-6 w-6 text-blue-600" />
              تفاصيل دفعة المورد #{payment.supplier_payments_id}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]" dir="rtl">
          <div className="p-6 space-y-6">
            {/* Payment Status & Amount */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <BanknotesIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">
                      {formatMoney(payment.supplier_payments_amount)}
                    </h4>
                    <p className="text-gray-600">مبلغ الدفعة</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(payment.supplier_payments_status)}
                  {payment.supplier_payments_type && getTypeBadge(payment.supplier_payments_type)}
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-green-600" />
                معلومات المورد
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">اسم المورد</label>
                  <p className="text-lg font-semibold text-gray-900">{payment.supplier_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">رقم الهاتف</label>
                  <p className="text-gray-900">{payment.supplier_phone || 'غير متوفر'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">العنوان</label>
                  <p className="text-gray-900">{payment.supplier_address || 'غير متوفر'}</p>
                </div>
                {payment.supplier_email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">البريد الإلكتروني</label>
                    <p className="text-gray-900">{payment.supplier_email}</p>
                  </div>
                )}
                {payment.supplier_balance !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">الرصيد الحالي</label>
                    <p className={`text-lg font-semibold ${parseFloat(payment.supplier_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMoney(payment.supplier_balance)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5 text-orange-600" />
                تفاصيل الدفعة
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">طريقة الدفع</label>
                  <p className="text-gray-900 font-medium">{payment.payment_method_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">الخزنة</label>
                  <p className="text-gray-900 font-medium">{payment.safe_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">تاريخ الدفعة</label>
                  <p className="text-gray-900 font-medium">
                    {formatLocalDateTime(payment.supplier_payments_date)}
                  </p>
                </div>
                {payment.supplier_payments_transaction_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">رقم المعاملة</label>
                    <p className="text-gray-900 font-mono">{payment.supplier_payments_transaction_id}</p>
                  </div>
                )}
                {payment.purchase_order_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">أمر الشراء المرتبط</label>
                    <p className="text-blue-600 font-medium">#{payment.purchase_order_id}</p>
                  </div>
                )}
              </div>
              
              {payment.supplier_payments_notes && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">الملاحظات</label>
                  <div className="bg-white p-3 rounded-md border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-wrap">{payment.supplier_payments_notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* System Information */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-5 w-5 text-gray-600" />
                معلومات النظام
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">رقم الدفعة</label>
                  <p className="text-gray-900 font-mono">#{payment.supplier_payments_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">تاريخ الإنشاء</label>
                  <p className="text-gray-900">
                    {formatLocalDateTime(payment.supplier_payments_created_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">المُنشئ</label>
                  <p className="text-gray-900 font-medium">{payment.rep_user_name}</p>
                </div>
                {payment.supplier_payments_updated_at && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">آخر تحديث</label>
                      <p className="text-gray-900">
                        {formatLocalDateTime(payment.supplier_payments_updated_at)}
                      </p>
                    </div>
                    {payment.updated_by_user_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600">محدث بواسطة</label>
                        <p className="text-gray-900 font-medium">{payment.updated_by_user_name}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Safe Transaction Information (if available) */}
            {payment.safe_transactions_id && (
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ArchiveBoxIcon className="h-5 w-5 text-purple-600" />
                  معلومات معاملة الخزنة
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">رقم المعاملة</label>
                    <p className="text-gray-900 font-mono">#{payment.safe_transactions_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">نوع المعاملة</label>
                    <p className="text-gray-900 font-medium">دفعة مورد</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">الرصيد قبل المعاملة</label>
                    <p className="text-gray-900 font-medium">
                      {payment.safe_balance_before ? formatMoney(payment.safe_balance_before) : 'غير متوفر'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">الرصيد بعد المعاملة</label>
                    <p className="text-gray-900 font-medium">
                      {payment.safe_balance_after ? formatMoney(payment.safe_balance_after) : 'غير متوفر'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Order Information (if linked) */}
            {payment.purchase_order_id && payment.purchase_order_total && (
              <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-600" />
                  معلومات أمر الشراء المرتبط
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">رقم الأمر</label>
                    <p className="text-gray-900 font-mono">#{payment.purchase_order_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">إجمالي الأمر</label>
                    <p className="text-gray-900 font-semibold">
                      {formatMoney(payment.purchase_order_total)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">نسبة الدفع</label>
                    <p className="text-gray-900 font-semibold">
                      {((parseFloat(payment.supplier_payments_amount) / parseFloat(payment.purchase_order_total)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => onPrint?.(payment)}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              طباعة
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierPaymentDetailsModal;
