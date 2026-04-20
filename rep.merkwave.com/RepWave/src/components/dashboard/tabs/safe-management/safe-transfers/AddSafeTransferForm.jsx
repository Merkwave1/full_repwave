// src/components/dashboard/tabs/safe-management/safe-transfers/AddSafeTransferForm.jsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowsRightLeftIcon,
  XMarkIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { addSafeTransfer } from "../../../../../apis/safe_transfers";
import NumberInput from "../../../../common/NumberInput/NumberInput";
import { getSafes } from "../../../../../apis/safes";
import useCurrency from "../../../../../hooks/useCurrency";

const AddSafeTransferForm = ({ onClose, onSubmit }) => {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  const [formData, setFormData] = useState({
    source_safe_id: "",
    destination_safe_id: "",
    transfer_amount: "",
    transfer_notes: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [safes, setSafes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSafes = async () => {
      try {
        const response = await getSafes();
        setSafes(response.safes || []);
      } catch (error) {
        console.error("Error loading safes:", error);
        setErrors({ safes: "فشل في تحميل الخزائن" });
      } finally {
        setLoading(false);
      }
    };

    loadSafes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.source_safe_id) {
      newErrors.source_safe_id = "يجب اختيار الخزنة المصدر";
    }

    if (!formData.destination_safe_id) {
      newErrors.destination_safe_id = "يجب اختيار الخزنة الوجهة";
    }

    if (formData.source_safe_id === formData.destination_safe_id) {
      newErrors.destination_safe_id =
        "لا يمكن أن تكون الخزنة المصدر والوجهة نفسها";
    }

    if (
      !formData.transfer_amount ||
      parseFloat(formData.transfer_amount) <= 0
    ) {
      newErrors.transfer_amount = "يجب إدخال مبلغ صحيح أكبر من صفر";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Get user role from localStorage
      let userRole = null;
      const userDataString = localStorage.getItem("userData");
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          userRole = userData.users_role;
        } catch (e) {
          console.error("Failed to parse userData:", e);
        }
      }

      const transferData = {
        source_safe_id: parseInt(formData.source_safe_id),
        destination_safe_id: parseInt(formData.destination_safe_id),
        transfer_amount: parseFloat(formData.transfer_amount),
        transfer_notes: formData.transfer_notes || null,
        user_role: userRole, // Send user role to backend
      };

      await addSafeTransfer(transferData);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error("Error adding safe transfer:", error);
      setErrors({
        submit: error.message || "حدث خطأ أثناء إضافة التحويل",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceSafe = safes.find(
    (safe) => safe.safes_id === parseInt(formData.source_safe_id),
  );
  const destinationSafe = safes.find(
    (safe) => safe.safes_id === parseInt(formData.destination_safe_id),
  );

  const formatBalance = (value) => {
    const formatted = formatMoney(value || 0, { withSymbol: false });
    return symbol ? `${formatted} ${symbol}` : formatted;
  };

  const isOverBudget =
    sourceSafe &&
    formData.transfer_amount &&
    parseFloat(formData.transfer_amount) >
      parseFloat(sourceSafe.safes_balance || 0);

  const modal = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Header */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-500 rounded-t-2xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-white/20 rounded-xl shrink-0">
                <ArrowsRightLeftIcon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  تحويل بين الخزائن
                </h3>
                <p className="text-blue-100 text-xs mt-0.5 hidden sm:block">
                  نقل رصيد من خزنة إلى أخرى
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} dir="rtl">
          <div className="p-3 sm:p-5 space-y-3">
            {/* Errors */}
            {(errors.submit || errors.safes) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {errors.submit || errors.safes}
              </div>
            )}

            {/* Safe Selection Card */}
            <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 flex items-center gap-2">
                <ArrowsRightLeftIcon className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  اختيار الخزائن
                </span>
              </div>
              <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source Safe */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    الخزنة المصدر <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="source_safe_id"
                    value={formData.source_safe_id}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 transition-all ${
                      errors.source_safe_id
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200"
                    }`}
                    disabled={isSubmitting || loading}
                    dir="rtl"
                  >
                    <option value="">— اختر الخزنة المصدر —</option>
                    {safes.map((safe) => (
                      <option key={safe.safes_id} value={safe.safes_id}>
                        {safe.safes_name} (
                        {safe.safes_type === "company" ? "شركة" : "مندوب"}) —{" "}
                        {formatBalance(safe.safes_balance)}
                      </option>
                    ))}
                  </select>
                  {errors.source_safe_id && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.source_safe_id}
                    </p>
                  )}
                  {sourceSafe && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      الرصيد:{" "}
                      <span className="font-semibold text-green-600">
                        {formatBalance(sourceSafe.safes_balance)}
                      </span>
                    </p>
                  )}
                </div>

                {/* Destination Safe */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    الخزنة الوجهة <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="destination_safe_id"
                    value={formData.destination_safe_id}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 transition-all ${
                      errors.destination_safe_id
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200"
                    }`}
                    disabled={isSubmitting || loading}
                    dir="rtl"
                  >
                    <option value="">— اختر الخزنة الوجهة —</option>
                    {safes
                      .filter(
                        (safe) =>
                          safe.safes_id !== parseInt(formData.source_safe_id),
                      )
                      .map((safe) => (
                        <option key={safe.safes_id} value={safe.safes_id}>
                          {safe.safes_name} (
                          {safe.safes_type === "company" ? "شركة" : "مندوب"}) —{" "}
                          {formatBalance(safe.safes_balance)}
                        </option>
                      ))}
                  </select>
                  {errors.destination_safe_id && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.destination_safe_id}
                    </p>
                  )}
                  {destinationSafe && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      الرصيد:{" "}
                      <span className="font-semibold text-blue-600">
                        {formatBalance(destinationSafe.safes_balance)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Amount Card */}
            <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-green-50 px-4 py-2 flex items-center gap-2">
                <BanknotesIcon className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  مبلغ التحويل
                </span>
              </div>
              <div className="p-3 sm:p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  المبلغ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <NumberInput
                    value={formData.transfer_amount}
                    onChange={(v) =>
                      handleChange({
                        target: { name: "transfer_amount", value: v },
                      })
                    }
                    className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none border focus:ring-2 focus:ring-green-400 transition-all ${
                      errors.transfer_amount
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200"
                    }`}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  {symbol && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                      {symbol}
                    </div>
                  )}
                </div>
                {errors.transfer_amount && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.transfer_amount}
                  </p>
                )}
                {isOverBudget && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    ⚠️ المبلغ أكبر من الرصيد المتاح في الخزنة المصدر
                  </p>
                )}
              </div>
            </div>

            {/* Notes Card */}
            <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  ملاحظات
                </span>
              </div>
              <div className="p-3 sm:p-4">
                <textarea
                  name="transfer_notes"
                  value={formData.transfer_notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all resize-none"
                  placeholder="ملاحظات إضافية حول التحويل..."
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Live Preview Strip */}
            {(sourceSafe || destinationSafe || formData.transfer_amount) && (
              <div className="rounded-xl bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
                  معاينة التحويل
                </p>
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-medium text-gray-700">
                    {sourceSafe?.safes_name || "—"}
                  </span>
                  <ArrowsRightLeftIcon className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-medium text-gray-700">
                    {destinationSafe?.safes_name || "—"}
                  </span>
                  {formData.transfer_amount && (
                    <span className="mr-auto font-bold text-blue-700">
                      {formatBalance(formData.transfer_amount)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-3 sm:px-5 py-3 flex flex-col-reverse sm:flex-row gap-2 bg-gray-50 rounded-b-2xl">
            <button
              type="submit"
              disabled={isSubmitting || loading || isOverBudget}
              className="flex-1 bg-gradient-to-l from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  جاري التحويل...
                </>
              ) : (
                <>
                  <ArrowsRightLeftIcon className="h-4 w-4" />
                  تأكيد التحويل
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
};

export default AddSafeTransferForm;
