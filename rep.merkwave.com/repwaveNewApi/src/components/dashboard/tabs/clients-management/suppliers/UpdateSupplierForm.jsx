// src/components/dashboard/tabs/clients-management/suppliers/UpdateSupplierForm.jsx
import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon,
  UserIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  MODAL_GRADIENTS,
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalInputClass,
} from "../../../../../constants/brandColors.js";

const EG_PHONE_RE = /^01[0125][0-9]{8}$/;

function UpdateSupplierForm({ supplier, onUpdate, onCancel }) {
  const [formData, setFormData] = useState({
    supplier_id: "",
    supplier_name: "",
    supplier_contact_person: "",
    supplier_phone: "",
    supplier_email: "",
    supplier_address: "",
    supplier_notes: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplier_id: supplier.supplier_id || "",
        supplier_name: supplier.supplier_name || "",
        supplier_contact_person: supplier.supplier_contact_person || "",
        supplier_phone: supplier.supplier_phone || "",
        supplier_email: supplier.supplier_email || "",
        supplier_address: supplier.supplier_address || "",
        supplier_notes: supplier.supplier_notes || "",
      });
    }
  }, [supplier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.supplier_name.trim()) newErrors.supplier_name = "اسم المورد مطلوب.";
    if (
      formData.supplier_phone &&
      !EG_PHONE_RE.test(formData.supplier_phone.replace(/\s|-/g, ""))
    ) {
      newErrors.supplier_phone =
        "رقم الهاتف غير صحيح. يجب أن يكون 11 رقماً ويبدأ بـ 010/011/012/015";
    }
    if (
      formData.supplier_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supplier_email)
    ) {
      newErrors.supplier_email = "صيغة البريد الإلكتروني غير صحيحة.";
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onUpdate(formData);
  };

  const inputClass = (fieldId) =>
    `${modalInputClass} ${errors[fieldId] ? "border-red-400 bg-red-50" : ""}`;

  return (
    <div
      className="bg-[#FAFAFE] rounded-2xl shadow-[0_25px_60px_-10px_rgba(139,95,214,0.35)] max-w-3xl w-full overflow-hidden border border-[#EDE7FF]"
      dir="rtl"
    >
      <div
        className="px-5 py-4 flex items-center justify-between relative overflow-hidden"
        style={{ background: MODAL_GRADIENTS.brand }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.45) 0%, transparent 55%)",
          }}
        />
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 ring-1 ring-white/20">
            <BuildingStorefrontIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">تعديل المورد</h3>
            <p className="text-xs text-white/70 hidden sm:block">
              {supplier?.supplier_name || "تحديث بيانات المورد"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="relative z-10 bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <div className="bg-white rounded-xl border border-[#EDE7FF]/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#EDE7FF] bg-[#FAFAFE]">
            <UserIcon className="h-4 w-4 text-[#8B5FD6]" />
            <span className="text-sm font-semibold text-[#2D1B69]">البيانات الأساسية</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700">
                اسم الشركة / المورد <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="supplier_name"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleChange}
                required
                maxLength={255}
                className={inputClass("supplier_name")}
              />
              {errors.supplier_name && (
                <p className="text-xs text-red-500 mt-1">{errors.supplier_name}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="supplier_contact_person"
                  className="block text-sm font-medium text-gray-700"
                >
                  الشخص المسؤول
                </label>
                <input
                  type="text"
                  id="supplier_contact_person"
                  name="supplier_contact_person"
                  value={formData.supplier_contact_person}
                  onChange={handleChange}
                  maxLength={255}
                  className={inputClass("supplier_contact_person")}
                />
              </div>
              <div>
                <label htmlFor="supplier_phone" className="block text-sm font-medium text-gray-700">
                  الهاتف
                </label>
                <input
                  type="tel"
                  id="supplier_phone"
                  name="supplier_phone"
                  value={formData.supplier_phone}
                  onChange={handleChange}
                  maxLength={20}
                  placeholder="مثال: 01012345678"
                  className={inputClass("supplier_phone")}
                />
                {errors.supplier_phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.supplier_phone}</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="supplier_email" className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                id="supplier_email"
                name="supplier_email"
                value={formData.supplier_email}
                onChange={handleChange}
                maxLength={255}
                className={inputClass("supplier_email")}
              />
              {errors.supplier_email && (
                <p className="text-xs text-red-500 mt-1">{errors.supplier_email}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EDE7FF]/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#EDE7FF] bg-[#FAFAFE]">
            <MapPinIcon className="h-4 w-4 text-[#8B5FD6]" />
            <span className="text-sm font-semibold text-[#2D1B69]">العنوان والملاحظات</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="supplier_address" className="block text-sm font-medium text-gray-700">
                العنوان
              </label>
              <textarea
                id="supplier_address"
                name="supplier_address"
                value={formData.supplier_address}
                onChange={handleChange}
                rows={2}
                maxLength={500}
                className={modalInputClass}
              />
            </div>
            <div>
              <label htmlFor="supplier_notes" className="block text-sm font-medium text-gray-700">
                ملاحظات
              </label>
              <textarea
                id="supplier_notes"
                name="supplier_notes"
                value={formData.supplier_notes}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                className={modalInputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
            إلغاء
          </button>
          <button type="submit" className={modalPrimaryBtnClass}>
            تحديث مورد
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateSupplierForm;
