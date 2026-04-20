// src/components/dashboard/tabs/product-management/categories/UpdateCategoryForm.js
import React, { useState, useEffect } from "react";

function UpdateCategoryForm({ category, onUpdate, onCancel }) {
  const [formData, setFormData] = useState({
    categories_id: "",
    categories_name: "",
    categories_description: "",
  });

  useEffect(() => {
    if (category) {
      setFormData({
        categories_id: category.categories_id || "",
        categories_name: category.categories_name || "",
        categories_description: category.categories_description || "",
      });
    }
  }, [category]);

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
    p-4 sm:p-6 md:p-8
    rounded-2xl
    shadow-xl
    max-w-2xl
    mx-auto
    border border-gray-100
  "
      dir="rtl"
    >
      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#1F2937] mb-5 sm:mb-8 text-center tracking-wide">
        تعديل الفئة
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Name */}
        <div>
          <label
            htmlFor="categories_name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            اسم الفئة
          </label>

          <input
            type="text"
            id="categories_name"
            name="categories_name"
            value={formData.categories_name}
            onChange={handleChange}
            required
            maxLength={100}
            className="
          w-full px-4 py-2.5 rounded-lg
          bg-gray-50
          border border-gray-200
          text-[#1F2937]
          focus:border-[#8DD8F5]
          focus:ring-2 focus:ring-[#8DD8F5]/40
          outline-none transition
        "
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="categories_description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            الوصف
          </label>

          <textarea
            id="categories_description"
            name="categories_description"
            value={formData.categories_description}
            onChange={handleChange}
            rows="3"
            maxLength={500}
            className="
          w-full px-4 py-2.5 rounded-lg
          bg-gray-50
          border border-gray-200
          text-[#1F2937]
          focus:border-[#8DD8F5]
          focus:ring-2 focus:ring-[#8DD8F5]/40
          outline-none transition
          resize-none
        "
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-6 sm:mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="
          px-5 py-2.5 rounded-lg
          text-gray-700
          border border-gray-300
          hover:bg-gray-100
          transition
        "
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="
          px-6 py-2.5 rounded-lg
          font-semibold
          text-[#1F2937]
          bg-[#8DD8F5]
          hover:brightness-110
          shadow-md shadow-[#8DD8F5]/40
          transition-all
        "
          >
            تحديث الفئة
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateCategoryForm;
