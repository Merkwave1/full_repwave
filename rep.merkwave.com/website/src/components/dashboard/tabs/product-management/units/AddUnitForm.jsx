// src/components/dashboard/tabs/product-management/units/AddUnitForm.jsx
import React, { useState } from 'react';

function AddUnitForm({ onAdd, onCancel }) {
  const [formData, setFormData] = useState({
    base_units_name: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة وحدة جديدة</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="base_units_name" className="block text-sm font-medium text-gray-700">
            اسم الوحدة
          </label>
          <input
            type="text"
            id="base_units_name"
            name="base_units_name"
            value={formData.base_units_name}
            onChange={handleChange}
            required
            maxLength={100}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
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
            إضافة وحدة
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddUnitForm;
