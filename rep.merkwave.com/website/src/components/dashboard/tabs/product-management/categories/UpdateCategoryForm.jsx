// src/components/dashboard/tabs/product-management/categories/UpdateCategoryForm.js
import React, { useState, useEffect } from 'react';

function UpdateCategoryForm({ category, onUpdate, onCancel }) {
  const [formData, setFormData] = useState({
    categories_id: '',
    categories_name : '',
    categories_description: '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        categories_id: category.categories_id || '',
        categories_name : category.categories_name  || '',
        categories_description: category.categories_description || '',
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
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">تعديل الفئة</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="categories_name " className="block text-sm font-medium text-gray-700">
            اسم الفئة
          </label>
          <input
            type="text"
            id="categories_name"
            name="categories_name"
            value={formData.categories_name }
            onChange={handleChange}
            required
            maxLength={100}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="categories_description" className="block text-sm font-medium text-gray-700">
            الوصف
          </label>
          <textarea
            id="categories_description"
            name="categories_description"
            value={formData.categories_description}
            onChange={handleChange}
            rows="3"
            maxLength={500}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          ></textarea>
        </div>

        <div className="flex justify-end space-x-4 space-x-reverse mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            تحديث الفئة
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateCategoryForm;
