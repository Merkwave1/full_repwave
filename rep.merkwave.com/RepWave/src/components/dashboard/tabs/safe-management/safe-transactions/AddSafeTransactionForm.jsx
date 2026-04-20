// src/components/dashboard/tabs/safe-management/safe-transactions/AddSafeTransactionForm.jsx
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  PlusIcon,
  XMarkIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArchiveBoxIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  DocumentTextIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import PaymentMethodSelector from "../../../../common/PaymentMethodSelector/PaymentMethodSelector";
import NumberInput from "../../../../common/NumberInput/NumberInput";
import { addSafeTransaction } from "../../../../../apis/safe_transactions";
import useCurrency from "../../../../../hooks/useCurrency";

const AddSafeTransactionForm = ({ safeId, safes, onClose, onSubmit }) => {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  const [formData, setFormData] = useState({
    safe_id: safeId || "", // Allow selection if safeId not provided
    type: "deposit",
    amount: "",
    payment_method_id: "",
    description: "",
    reference: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simplified: only provide Deposit and Withdrawal for quick entry
  const transactionTypes = [
    { value: "deposit", label: "إيداع", icon: "⬆️", color: "text-green-600" },
    { value: "withdrawal", label: "سحب", icon: "⬇️", color: "text-red-600" },
  ];

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

  const handlePaymentMethodChange = (paymentMethodId) => {
    setFormData((prev) => ({
      ...prev,
      payment_method_id: paymentMethodId,
    }));

    if (errors.payment_method_id) {
      setErrors((prev) => ({
        ...prev,
        payment_method_id: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!safeId && !formData.safe_id) {
      newErrors.safe_id = "الخزنة مطلوبة";
    }

    if (!formData.type.trim()) {
      newErrors.type = "نوع المعاملة مطلوب";
    }

    if (!formData.amount.trim()) {
      newErrors.amount = "المبلغ مطلوب";
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "يجب أن يكون المبلغ رقم موجب";
    }

    if (!formData.payment_method_id) {
      newErrors.payment_method_id = "طريقة الدفع مطلوبة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const transactionData = {
        safe_id: safeId || formData.safe_id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        payment_method_id: parseInt(formData.payment_method_id),
        description: formData.description,
        reference: formData.reference,
      };

      await addSafeTransaction(transactionData);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error("Error adding safe transaction:", error);
      setErrors({
        submit: error.message || "حدث خطأ أثناء إضافة المعاملة",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTransactionType = transactionTypes.find(
    (type) => type.value === formData.type,
  );

  const isDeposit = formData.type === "deposit";

  const modal = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full my-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* ── Premium Header ── */}
        <div
          className={`px-5 py-4 flex items-center justify-between ${
            isDeposit
              ? "bg-gradient-to-l from-emerald-600 to-green-500"
              : "bg-gradient-to-l from-red-600 to-rose-500"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              {isDeposit ? (
                <ArrowUpCircleIcon className="h-6 w-6 text-white" />
              ) : (
                <ArrowDownCircleIcon className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                إضافة معاملة جديدة
              </h3>
              <p className="text-xs text-white/70 mt-0.5 hidden sm:block">
                أدخل تفاصيل المعاملة ثم اضغط تأكيد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          {/* ── Transaction Type Pill Toggle ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <BanknotesIcon className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">
                نوع المعاملة
              </span>
            </div>
            <div className="p-4">
              <div className="flex gap-3">
                {transactionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      handleChange({
                        target: { name: "type", value: type.value },
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      formData.type === type.value
                        ? type.value === "deposit"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                          : "border-red-500 bg-red-50 text-red-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {type.value === "deposit" ? (
                      <ArrowUpCircleIcon className="h-5 w-5" />
                    ) : (
                      <ArrowDownCircleIcon className="h-5 w-5" />
                    )}
                    {type.label}
                  </button>
                ))}
              </div>
              {errors.type && (
                <p className="mt-2 text-xs text-red-600">{errors.type}</p>
              )}
            </div>
          </div>

          {/* ── Safe Selection ── */}
          {!safeId && safes && safes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <ArchiveBoxIcon className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-semibold text-gray-700">
                  اختيار الخزنة
                </span>
              </div>
              <div className="p-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  الخزنة <span className="text-red-500">*</span>
                </label>
                <select
                  name="safe_id"
                  value={formData.safe_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.safe_id ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isSubmitting}
                  dir="rtl"
                >
                  <option value="">اختر الخزنة</option>
                  {safes.map((safe) => (
                    <option key={safe.safes_id} value={safe.safes_id}>
                      {safe.safes_name} —{" "}
                      {safe.safes_type === "company"
                        ? "خزنة الشركة"
                        : "خزنة مندوب"}
                    </option>
                  ))}
                </select>
                {errors.safe_id && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.safe_id}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Amount & Payment Method ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <CreditCardIcon className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">
                معلومات الدفع
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  المبلغ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <NumberInput
                    value={formData.amount}
                    onChange={(v) =>
                      handleChange({ target: { name: "amount", value: v } })
                    }
                    className={`w-full ${errors.amount ? "border-red-500" : ""}`}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                    {symbol}
                  </div>
                </div>
                {errors.amount && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.amount}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  طريقة الدفع <span className="text-red-500">*</span>
                </label>
                <PaymentMethodSelector
                  value={formData.payment_method_id}
                  onChange={handlePaymentMethodChange}
                  error={errors.payment_method_id}
                  disabled={isSubmitting}
                  required
                />
                {errors.payment_method_id && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.payment_method_id}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Notes & Reference ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <DocumentTextIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">
                معلومات إضافية
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  الوصف
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="وصف المعاملة..."
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <span className="flex items-center gap-1">
                    <TagIcon className="h-3.5 w-3.5" />
                    المرجع
                  </span>
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="رقم الفاتورة، المرجع..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* ── Live Preview ── */}
          {selectedTransactionType && formData.amount && (
            <div
              className={`rounded-xl border p-4 flex items-center justify-between ${
                isDeposit
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {isDeposit ? (
                  <ArrowUpCircleIcon className="h-6 w-6 text-emerald-600" />
                ) : (
                  <ArrowDownCircleIcon className="h-6 w-6 text-red-600" />
                )}
                <span
                  className={`font-semibold text-sm ${isDeposit ? "text-emerald-700" : "text-red-700"}`}
                >
                  {selectedTransactionType.label}
                </span>
              </div>
              <span
                className={`text-2xl font-extrabold ${isDeposit ? "text-emerald-700" : "text-red-700"}`}
              >
                {isDeposit ? "+" : "-"}
                {formatMoney(Math.abs(parseFloat(formData.amount || 0) || 0))}
              </span>
            </div>
          )}

          {/* ── Footer Actions ── */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDeposit
                  ? "bg-gradient-to-l from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600"
                  : "bg-gradient-to-l from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600"
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" /> تأكيد المعاملة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default AddSafeTransactionForm;
