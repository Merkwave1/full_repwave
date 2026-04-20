// src/components/dashboard/tabs/safe-management/safes/SafeDetailsModal.jsx
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  EyeIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  UserIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import Loader from "../../../../common/Loader/Loader";
import { getSafeDetails } from "../../../../../apis/safes";
import {
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_COLORS,
} from "../../../../../constants/paymentMethods";
import AddSafeTransactionForm from "../safe-transactions/AddSafeTransactionForm";
import useCurrency from "../../../../../hooks/useCurrency";
import { formatLocalDateTime } from "../../../../../utils/dateUtils";

const SafeDetailsModal = ({ safeId, onClose }) => {
  const [safe, setSafe] = useState(null);
  const { formatCurrency: formatMoney } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  const fetchSafeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSafeDetails(safeId);
      setSafe(response.data);
    } catch (error) {
      console.error("Error fetching safe details:", error);
      setError(error.message || "حدث خطأ أثناء جلب تفاصيل الخزنة");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive) => {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          isActive === 1
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {isActive === 1 ? "نشط" : "غير نشط"}
      </span>
    );
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 my-auto">
          <Loader />
          <p className="text-center mt-4 text-gray-600">
            جاري تحميل تفاصيل الخزنة...
          </p>
        </div>
      </div>,
      document.body,
    );
  }

  if (error) {
    return createPortal(
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl max-w-md w-full mx-2 sm:mx-4 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <XMarkIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                خطأ في تحميل البيانات
              </h3>
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
      </div>,
      document.body,
    );
  }

  if (!safe) {
    return null;
  }

  const modal = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-2 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-2 truncate">
              <EyeIcon className="h-6 w-6 text-blue-600" />
              تفاصيل خزنة: {safe.safes_name}
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
        <div
          className="overflow-y-auto max-h-[calc(95vh-110px)] sm:max-h-[calc(90vh-140px)]"
          dir="rtl"
        >
          <div className="p-3 sm:p-6 space-y-6">
            {/* Safe Status & Balance */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <ArchiveBoxIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">
                      {formatMoney(safe.safes_balance)}
                    </h4>
                    <p className="text-gray-600">الرصيد الحالي</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(safe.safes_is_active)}
                  <span className="text-sm text-gray-500">
                    #{safe.safes_id}
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-5 w-5 text-green-600" />
                معلومات الخزنة الأساسية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    اسم الخزنة
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {safe.safes_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    رقم الخزنة
                  </label>
                  <p className="text-gray-900 font-mono">#{safe.safes_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    الحالة
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(safe.safes_is_active)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    طريقة الدفع
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl">
                      {PAYMENT_METHOD_ICONS[safe.payment_method_type] || "💳"}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                        PAYMENT_METHOD_COLORS[safe.payment_method_type] ||
                        "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {safe.payment_method_name || "غير محدد"}
                    </span>
                  </div>
                </div>
                {safe.safes_description && (
                  <div className="md:col-span-2 lg:col-span-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      الوصف
                    </label>
                    <div className="bg-white p-3 rounded-md border border-gray-200">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {safe.safes_description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned User Information */}
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-orange-600" />
                معلومات المندوب المسؤول
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    اسم المندوب
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {safe.rep_user_name || "غير محدد"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    رقم المندوب
                  </label>
                  <p className="text-gray-900 font-mono">
                    #{safe.safes_rep_user_id || "غير محدد"}
                  </p>
                </div>
                {safe.rep_user_role && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      الدور
                    </label>
                    <p className="text-gray-900">{safe.rep_user_role}</p>
                  </div>
                )}
                {safe.rep_user_phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      رقم الهاتف
                    </label>
                    <p className="text-gray-900">{safe.rep_user_phone}</p>
                  </div>
                )}
                {safe.rep_user_email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      البريد الإلكتروني
                    </label>
                    <p className="text-gray-900">{safe.rep_user_email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Balance Information */}
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-purple-600" />
                معلومات الرصيد
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    الرصيد الحالي
                  </label>
                  <p
                    className={`text-2xl font-bold ${
                      parseFloat(safe.safes_balance || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatMoney(safe.safes_balance)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    حالة الرصيد
                  </label>
                  <p
                    className={`text-lg font-semibold ${
                      parseFloat(safe.safes_balance || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {parseFloat(safe.safes_balance || 0) >= 0 ? "موجب" : "سالب"}
                  </p>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-600" />
                معلومات النظام
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    تاريخ الإنشاء
                  </label>
                  <p className="text-gray-900">
                    {formatLocalDateTime(safe.safes_created_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    آخر تحديث
                  </label>
                  <p className="text-gray-900">
                    {formatLocalDateTime(safe.safes_updated_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    رقم النسخة
                  </label>
                  <p className="text-gray-900 font-mono">v1.0</p>
                </div>
              </div>
            </div>

            {/* Recent Activity Summary */}
            {safe.recent_transactions_count !== undefined && (
              <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-600" />
                  ملخص النشاط الحديث
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      عدد المعاملات الإجمالي
                    </label>
                    <p className="text-2xl font-bold text-indigo-600">
                      {safe.total_transactions_count || 0}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      المعاملات هذا الشهر
                    </label>
                    <p className="text-2xl font-bold text-indigo-600">
                      {safe.recent_transactions_count || 0}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      آخر معاملة
                    </label>
                    <p className="text-gray-900">
                      {safe.last_transaction_date
                        ? formatLocalDateTime(safe.last_transaction_date)
                        : "لا توجد معاملات"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between">
            <button
              onClick={() => setShowAddTransaction(true)}
              className="w-full sm:w-auto px-4 py-3 sm:px-6 sm:py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center justify-center gap-2 text-base sm:text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              إضافة معاملة
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 sm:px-6 sm:py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-base sm:text-sm"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <AddSafeTransactionForm
          safeId={safeId}
          onClose={() => setShowAddTransaction(false)}
          onSubmit={() => {
            setShowAddTransaction(false);
            fetchSafeDetails(); // Refresh safe details
          }}
        />
      )}
    </div>
  );
  return createPortal(modal, document.body);
};

export default SafeDetailsModal;
