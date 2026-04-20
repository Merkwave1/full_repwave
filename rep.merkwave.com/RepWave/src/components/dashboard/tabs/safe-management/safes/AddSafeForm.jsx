// src/components/dashboard/tabs/safe-management/safes/AddSafeForm.jsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  PlusIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";
import { addSafe } from "../../../../../apis/safes";
import { getAllUsers } from "../../../../../apis/users";
import { getPaymentMethods } from "../../../../../apis/payment_methods";
import {
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_COLORS,
} from "../../../../../constants/paymentMethods";
import {
  SAFE_COLORS,
  DEFAULT_SAFE_COLOR,
} from "../../../../../constants/safeColors";
import NumberInput from "../../../../common/NumberInput/NumberInput.jsx";
import useCurrency from "../../../../../hooks/useCurrency";

const AddSafeForm = ({ onClose, onSubmit }) => {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    initial_balance: "0.00",
    type: "rep", // 'company' or 'rep' or 'store_keeper'
    rep_user_id: "",
    payment_method_id: 1, // Default to Cash
    is_active: true,
    color: DEFAULT_SAFE_COLOR, // Default color
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  useEffect(() => {
    loadUsers();
    loadPaymentMethods();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getAllUsers();
      setUsers(response || []);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await getPaymentMethods();
      setPaymentMethods(response?.payment_methods || []);
    } catch (error) {
      console.error("Error loading payment methods:", error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear related errors
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "اسم الخزنة مطلوب";
    }

    if (!formData.type) {
      newErrors.type = "نوع الخزنة مطلوب";
    }

    if (!formData.payment_method_id) {
      newErrors.payment_method_id = "طريقة الدفع مطلوبة";
    }

    if (
      (formData.type === "rep" || formData.type === "store_keeper") &&
      !formData.rep_user_id
    ) {
      newErrors.rep_user_id = "المستخدم المسؤول مطلوب للخزنة";
    }

    if (!formData.initial_balance || parseFloat(formData.initial_balance) < 0) {
      newErrors.initial_balance = "الرصيد الأولي يجب أن يكون صفر أو أكبر";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const safeData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        initial_balance: parseFloat(formData.initial_balance),
        type: formData.type,
        rep_user_id:
          formData.type === "rep" || formData.type === "store_keeper"
            ? formData.rep_user_id
            : null,
        payment_method_id: formData.payment_method_id,
        is_active: formData.is_active ? 1 : 0,
        color: formData.color,
      };

      await addSafe(safeData);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error("Error adding safe:", error);
      setErrors({
        submit: error.message || "حدث خطأ أثناء إضافة الخزنة",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // users list is used directly when preparing options per selected type

  const modal = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full my-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-l from-blue-600 to-indigo-500">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <ArchiveBoxIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                إضافة خزنة جديدة
              </h3>
              <p className="text-xs text-white/70 hidden sm:block">
                أدخل بيانات الخزنة ثم اضغط إضافة
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

        {/* Content */}
        <div dir="rtl">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <ArchiveBoxIcon className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  معلومات الخزنة الأساسية
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Safe Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    اسم الخزنة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="أدخل اسم الخزنة..."
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    وصف الخزنة
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="وصف اختياري للخزنة..."
                  />
                </div>

                {/* Safe Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    نوع الخزنة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      handleInputChange("type", e.target.value);
                      if (e.target.value === "company") {
                        handleInputChange("rep_user_id", "");
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="rep">خزنة مندوب</option>
                    <option value="store_keeper">خزنة أمين المخزن</option>
                    <option value="company">خزنة الشركة</option>
                  </select>
                  {errors.type && (
                    <p className="text-red-500 text-xs mt-1">{errors.type}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    طريقة الدفع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.payment_method_id}
                    onChange={(e) =>
                      handleInputChange(
                        "payment_method_id",
                        parseInt(e.target.value),
                      )
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={loadingPaymentMethods}
                  >
                    {loadingPaymentMethods ? (
                      <option>جاري التحميل...</option>
                    ) : (
                      paymentMethods.map((method) => (
                        <option
                          key={method.payment_methods_id}
                          value={method.payment_methods_id}
                        >
                          {PAYMENT_METHOD_ICONS[method.payment_methods_type] ||
                            "💳"}{" "}
                          {method.payment_methods_name}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.payment_method_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.payment_method_id}
                    </p>
                  )}
                </div>

                {/* Color Picker */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    لون الخزنة
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {SAFE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleInputChange("color", color.value)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          formData.color === color.value
                            ? `${color.borderClass} ring-2 ring-offset-2 ring-blue-500`
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                        title={color.label}
                      >
                        <div
                          className={`w-full h-8 rounded ${color.bgClass} ${color.borderClass} border`}
                        ></div>
                        <span
                          className={`text-xs mt-1 block text-center ${
                            formData.color === color.value
                              ? "font-bold text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          {color.label}
                        </span>
                        {formData.color === color.value && (
                          <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Initial Balance */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    الرصيد الأولي ({symbol}){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <NumberInput
                    value={formData.initial_balance}
                    onChange={(val) =>
                      handleInputChange("initial_balance", val)
                    }
                    className="w-full"
                    placeholder="0.00"
                  />
                  {errors.initial_balance && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.initial_balance}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    حالة الخزنة
                  </label>
                  <select
                    value={formData.is_active}
                    onChange={(e) =>
                      handleInputChange("is_active", e.target.value === "true")
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value={true}>نشط</option>
                    <option value={false}>غير نشط</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assignment Information - show for rep and store_keeper safes */}
            {(formData.type === "rep" || formData.type === "store_keeper") && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    تعيين المسؤول
                  </span>
                </div>
                <div className="p-4">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {formData.type === "rep"
                      ? "مندوب المبيعات المسؤول"
                      : "أمين المخزن المسؤول"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {loadingUsers ? (
                    <div className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm text-center">
                      جاري تحميل المستخدمين...
                    </div>
                  ) : (
                    <SearchableSelect
                      options={users
                        .filter((u) => {
                          if (formData.type === "rep")
                            return u.users_role === "rep";
                          if (formData.type === "store_keeper")
                            return u.users_role === "store_keeper";
                          return false;
                        })
                        .map((u) => ({
                          value: u.users_id,
                          label: `${u.users_name} (${u.users_role})`,
                        }))}
                      value={formData.rep_user_id}
                      onChange={(value) =>
                        handleInputChange("rep_user_id", value)
                      }
                      placeholder={
                        formData.type === "rep"
                          ? "اختر مندوب المبيعات..."
                          : "اختر أمين المخزن..."
                      }
                      searchPlaceholder={
                        formData.type === "rep"
                          ? "ابحث عن مندوب..."
                          : "ابحث عن أمين مخزن..."
                      }
                      className="w-full"
                    />
                  )}
                  {errors.rep_user_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.rep_user_id}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Company Safe Info */}
            {formData.type === "company" && (
              <div className="bg-purple-50 rounded-xl border border-purple-200 px-4 py-3">
                <p className="text-purple-700 text-sm font-medium">
                  خزنة الشركة — لا تحتاج إلى تعيين مندوب مبيعات محدد.
                </p>
              </div>
            )}

            {/* Information Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 space-y-1">
              <p className="font-semibold text-amber-800">ملاحظة مهمة</p>
              <p>• سيتم إنشاء معاملة أولية في حالة وجود رصيد ابتدائي</p>
              <p>
                •{" "}
                {formData.type === "rep"
                  ? "المستخدم المختار (مندوب) سيكون مسؤولاً عن هذه الخزنة"
                  : formData.type === "store_keeper"
                    ? "المستخدم المختار (أمين المخزن) سيكون مسؤولاً عن هذه الخزنة"
                    : "هذه خزنة تابعة للشركة الرئيسية"}
              </p>
              <p>• يمكن تعديل هذه المعلومات لاحقاً من خلال قسم التعديل</p>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1 border-t border-gray-200">
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
                onClick={handleSubmit}
                disabled={isSubmitting || loadingUsers}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" /> إضافة الخزنة
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default AddSafeForm;
