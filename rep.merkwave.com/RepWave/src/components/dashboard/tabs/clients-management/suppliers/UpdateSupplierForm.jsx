// src/components/dashboard/tabs/clients-management/suppliers/UpdateSupplierForm.jsx
import React, { useState, useEffect } from "react";

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
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div
      className="
      bg-white/90 backdrop-blur-md
      p-6 sm:p-8
      rounded-2xl
      shadow-[0_15px_40px_rgba(0,0,0,0.08)]
      max-w-xl mx-auto
      border border-[#8DD8F5]/15
    "
      dir="rtl"
    >
      {/* Header */}
      <div className="text-center mb-8 relative">
        <div className="absolute inset-x-0 -top-2 h-1 rounded-full bg-[#8DD8F5]" />

        {/* Strong Modal Header */}
        <div className="relative mb-8">
          {/* top accent bar */}

          <div className="flex items-center justify-between px-2 pt-5">
            {/* Title + Icon */}
            <div className="flex items-center gap-3">
              <div
                className="
        w-12 h-12
        rounded-xl
        bg-[#8DD8F5]/20
        flex items-center justify-center
        text-[#8DD8F5]
        shadow-sm
      "
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"
                  />
                </svg>
              </div>

              <h3
                className="
        text-2xl sm:text-3xl
        font-black
        text-[#1F2937]
        tracking-tight
      "
              >
                تعديل المورد
              </h3>
            </div>

            {/* Close button */}
            <button
              onClick={onCancel}
              className="
        w-10 h-10
        rounded-full
        flex items-center justify-center
        text-[#1F2937]/70
        hover:text-white
        hover:bg-[#8DD8F5]
        transition-all
      "
              title="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <span className="w-20 h-1 rounded-full bg-[#8DD8F5]/70" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Input base style */}
        {[
          {
            id: "supplier_name",
            label: "اسم الشركة / المورد",
            type: "text",
            value: formData.supplier_name,
            required: true,
            maxLength: 255,
          },
          {
            id: "supplier_contact_person",
            label: "الشخص المسؤول",
            type: "text",
            value: formData.supplier_contact_person,
            maxLength: 255,
          },
          {
            id: "supplier_phone",
            label: "الهاتف",
            type: "tel",
            value: formData.supplier_phone,
            maxLength: 20,
          },
          {
            id: "supplier_email",
            label: "البريد الإلكتروني",
            type: "email",
            value: formData.supplier_email,
            maxLength: 255,
          },
        ].map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label
              htmlFor={field.id}
              className="text-sm font-semibold text-[#1F2937]/80"
            >
              {field.label}
            </label>

            <input
              type={field.type}
              id={field.id}
              name={field.id}
              value={field.value}
              onChange={handleChange}
              required={field.required}
              maxLength={field.maxLength}
              className="
              w-full px-4 py-3
              rounded-xl
              bg-gray-50
              border border-transparent
              text-[#1F2937]
              focus:bg-white
              focus:border-[#8DD8F5]
              focus:ring-4 focus:ring-[#8DD8F5]/25
              outline-none
              transition-all
            "
            />
          </div>
        ))}

        {/* Address */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#1F2937]/80">
            العنوان
          </label>
          <textarea
            name="supplier_address"
            value={formData.supplier_address}
            onChange={handleChange}
            rows="2"
            maxLength={500}
            className="
            w-full px-4 py-3
            rounded-xl
            bg-gray-50
            border border-transparent
            focus:bg-white
            focus:border-[#8DD8F5]
            focus:ring-4 focus:ring-[#8DD8F5]/25
            outline-none
            transition-all
          "
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#1F2937]/80">
            ملاحظات
          </label>
          <textarea
            name="supplier_notes"
            value={formData.supplier_notes}
            onChange={handleChange}
            rows="3"
            maxLength={500}
            className="
            w-full px-4 py-3
            rounded-xl
            bg-gray-50
            border border-transparent
            focus:bg-white
            focus:border-[#8DD8F5]
            focus:ring-4 focus:ring-[#8DD8F5]/25
            outline-none
            transition-all
          "
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 sm:pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="
            px-6 py-2.5
            rounded-xl
            border border-gray-200
            text-sm font-semibold
            text-[#1F2937]
            bg-white
            hover:bg-gray-50
            focus:ring-2 focus:ring-[#8DD8F5]/30
            transition
          "
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="
            px-6 py-2.5
            rounded-xl
            text-sm font-semibold
            text-[#1F2937]
            bg-[#8DD8F5]
            hover:bg-[#7ccfee]
            focus:ring-2 focus:ring-[#8DD8F5]/40
            shadow-lg
            transition
            transform hover:scale-[1.02]
          "
          >
            تحديث مورد
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateSupplierForm;
