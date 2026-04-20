// src/components/dashboard/tabs/inventory-management/packaging_types/UpdatePackagingTypeForm.jsx
import React, { useState, useEffect } from "react";
import NumberInput from "../../../../common/NumberInput/NumberInput.jsx";

function UpdatePackagingTypeForm({
  packagingType,
  onUpdate,
  onCancel,
  baseUnits,
}) {
  const [formData, setFormData] = useState({
    packaging_types_id: "",
    packaging_types_name: "",
    packaging_types_description: "",
    packaging_types_default_conversion_factor: "",
    packaging_types_compatible_base_unit_id: "",
  });

  useEffect(() => {
    if (packagingType) {
      setFormData({
        packaging_types_id: packagingType.packaging_types_id || "",
        packaging_types_name: packagingType.packaging_types_name || "",
        packaging_types_description:
          packagingType.packaging_types_description || "",
        packaging_types_default_conversion_factor:
          packagingType.packaging_types_default_conversion_factor || "",
        packaging_types_compatible_base_unit_id:
          packagingType.packaging_types_compatible_base_unit_id || "",
      });
    }
  }, [packagingType]);

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
      bg-white
      p-4 sm:p-6 md:p-10
      rounded-2xl sm:rounded-3xl
      shadow-xl
      max-w-xl
      mx-auto
      border border-gray-100
    "
      dir="rtl"
    >
      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#1F2937] mb-5 sm:mb-8 text-center tracking-wide">
        تعديل نوع التعبئة
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Name */}
        <div>
          <label
            htmlFor="packaging_types_name"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            اسم نوع التعبئة
          </label>

          <input
            type="text"
            id="packaging_types_name"
            name="packaging_types_name"
            value={formData.packaging_types_name}
            onChange={handleChange}
            required
            maxLength={100}
            className="
            w-full px-4 py-2.5 rounded-xl
            bg-gray-50 border border-gray-200
            text-[#1F2937]
            focus:border-[#8DD8F5]
            focus:ring-2 focus:ring-[#8DD8F5]/40
            outline-none transition
          "
          />
        </div>

        {/* Conversion Factor */}
        <div>
          <label
            htmlFor="packaging_types_default_conversion_factor"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            معامل التحويل الافتراضي
          </label>

          <NumberInput
            id="packaging_types_default_conversion_factor"
            name="packaging_types_default_conversion_factor"
            value={formData.packaging_types_default_conversion_factor}
            onChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                packaging_types_default_conversion_factor: val,
              }))
            }
            placeholder="0"
            className="mt-1 rounded-xl"
            required
          />
        </div>

        {/* Compatible Unit */}
        <div>
          <label
            htmlFor="packaging_types_compatible_base_unit_id"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            وحدة القياس المتوافقة
          </label>

          <select
            id="packaging_types_compatible_base_unit_id"
            name="packaging_types_compatible_base_unit_id"
            value={formData.packaging_types_compatible_base_unit_id}
            onChange={handleChange}
            required
            className="
            w-full px-4 py-2.5 rounded-xl
            bg-gray-50 border border-gray-200
            text-[#1F2937]
            focus:border-[#8DD8F5]
            focus:ring-2 focus:ring-[#8DD8F5]/40
            outline-none transition
          "
          >
            <option value="">اختر وحدة</option>
            {baseUnits.map((unit) => (
              <option key={unit.base_units_id} value={unit.base_units_id}>
                {unit.base_units_name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="packaging_types_description"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            الوصف
          </label>

          <textarea
            id="packaging_types_description"
            name="packaging_types_description"
            value={formData.packaging_types_description}
            onChange={handleChange}
            rows="3"
            maxLength={500}
            className="
            w-full px-4 py-2.5 rounded-xl
            bg-gray-50 border border-gray-200
            text-[#1F2937]
            focus:border-[#8DD8F5]
            focus:ring-2 focus:ring-[#8DD8F5]/40
            outline-none transition
            resize-none
          "
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="
            px-5 py-2.5 rounded-xl
            border border-gray-300
            text-gray-700
            hover:bg-gray-100
            transition
          "
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="
            px-6 py-2.5 rounded-xl
            font-semibold
            text-[#1F2937]
            bg-[#8DD8F5]
            hover:brightness-110
            shadow-lg shadow-[#8DD8F5]/40
            transition-all
          "
          >
            تحديث نوع التعبئة
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdatePackagingTypeForm;
