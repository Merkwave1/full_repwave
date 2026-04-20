// src/components/dashboard/tabs/sales-management/client-refunds/AddClientRefundForm.jsx
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  ArrowUturnLeftIcon,
  UserCircleIcon,
  ArchiveBoxIcon,
  CreditCardIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";
import { addClientRefund } from "../../../../../apis/client_refunds";
import NumberInput from "../../../../common/NumberInput/NumberInput";
import useCurrency from "../../../../../hooks/useCurrency";

const AddClientRefundForm = ({
  onClose,
  onSubmit,
  safes = [],
  clients = [],
  paymentMethods = [],
  extraHeaderRight,
}) => {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState({
    client_id: "",
    safe_id: "",
    payment_method_id: "",
    amount: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientOptions = useMemo(
    () =>
      (clients || []).map((c) => ({
        value: c.clients_id || c.id,
        label: c.clients_company_name || c.company_name || c.name,
      })),
    [clients],
  );
  const safeOptions = useMemo(
    () =>
      (safes || []).map((s) => ({
        value: s.safes_id,
        label: `${s.safes_name}`,
      })),
    [safes],
  );
  const methodOptions = useMemo(
    () =>
      (paymentMethods || []).map((m) => ({
        value: m.payment_methods_id || m.id,
        label: m.payment_methods_name || m.name,
      })),
    [paymentMethods],
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData.client_id) e.client_id = "العميل مطلوب";
    if (!formData.safe_id) e.safe_id = "الخزنة مطلوبة";
    if (!formData.payment_method_id) e.payment_method_id = "طريقة الدفع مطلوبة";
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      e.amount = "مبلغ صحيح مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Format current local datetime as YYYY-MM-DD HH:mm:ss
  const nowDateTimeForApi = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await addClientRefund({
        client_id: formData.client_id,
        safe_id: formData.safe_id,
        payment_method_id: formData.payment_method_id,
        amount: formData.amount,
        // send current date-time
        refund_date: nowDateTimeForApi(),
        notes: formData.notes || undefined,
      });
      onSubmit();
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || "حدث خطأ أثناء إضافة المرتجع" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountNum = parseFloat(formData.amount || 0) || 0;

  const modal = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 rounded-2xl shadow-2xl max-w-xl w-full my-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* ── Premium Header ── */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-l from-red-600 to-rose-500">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 rounded-xl p-2 shrink-0">
              <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                إضافة مرتجع عميل
              </h3>
              <p className="text-xs text-white/70 hidden sm:block">
                أدخل بيانات المرتجع ثم اضغط حفظ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {extraHeaderRight}
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          {/* ── Client & Safe ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <UserCircleIcon className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                العميل والخزنة
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  العميل <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={clientOptions}
                  value={formData.client_id}
                  onChange={(v) => handleChange("client_id", v)}
                  placeholder="اختر العميل..."
                  className="w-full"
                />
                {errors.client_id && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.client_id}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <span className="flex items-center gap-1">
                    <ArchiveBoxIcon className="h-3.5 w-3.5" />
                    الخزنة
                  </span>{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={safeOptions}
                  value={formData.safe_id}
                  onChange={(v) => handleChange("safe_id", v)}
                  placeholder="اختر الخزنة..."
                  className="w-full"
                />
                {errors.safe_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.safe_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Payment Method & Amount ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <CreditCardIcon className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                طريقة الدفع والمبلغ
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  طريقة الدفع <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={methodOptions}
                  value={formData.payment_method_id}
                  onChange={(v) => handleChange("payment_method_id", v)}
                  placeholder="اختر الطريقة..."
                  className="w-full"
                />
                {errors.payment_method_id && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.payment_method_id}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  المبلغ ({symbol}) <span className="text-red-500">*</span>
                </label>
                <NumberInput
                  value={formData.amount}
                  onChange={(v) => handleChange("amount", v)}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <DocumentTextIcon className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                ملاحظات
              </span>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                placeholder="اختياري..."
              />
            </div>
          </div>

          {/* ── Live Preview ── */}
          {amountNum > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-red-700">
                إجمالي المرتجع
              </span>
              <span className="text-2xl font-extrabold text-red-700">
                -
                {amountNum.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {symbol}
              </span>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1 border-t border-gray-200">
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
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-2.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <ArrowUturnLeftIcon className="h-4 w-4" /> حفظ المرتجع
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

export default AddClientRefundForm;
