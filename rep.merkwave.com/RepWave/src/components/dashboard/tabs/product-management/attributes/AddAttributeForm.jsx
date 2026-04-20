// src/components/dashboard/tabs/product-management/attributes/AddAttributeForm.jsx
import React, { useState } from 'react';

function AddAttributeForm({ onAdd, onCancel }) {
  const [formData, setFormData] = useState({
    attribute_name: '',
    attribute_values: [], // Array to hold attribute values
    newValue: '', // Temporary state for the new value input
  });

  const handleNameChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      attribute_name: e.target.value,
    }));
  };

  const handleNewValueChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      newValue: e.target.value,
    }));
  };

  const handleAddValue = () => {
    if (formData.newValue.trim() !== '' && !formData.attribute_values.includes(formData.newValue.trim())) {
      setFormData((prevData) => ({
        ...prevData,
        attribute_values: [...prevData.attribute_values, prevData.newValue.trim()],
        newValue: '', // Clear input after adding
      }));
    }
  };

  const handleRemoveValue = (valueToRemove) => {
    setFormData((prevData) => ({
      ...prevData,
      attribute_values: prevData.attribute_values.filter(value => value !== valueToRemove),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      attribute_name: formData.attribute_name,
      attribute_values: formData.attribute_values,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة خاصية جديدة</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="attribute_name" className="block text-sm font-medium text-gray-700">
            اسم الخاصية
          </label>
          <input
            type="text"
            id="attribute_name"
            name="attribute_name"
            value={formData.attribute_name}
            onChange={handleNameChange}
            required
            maxLength={100}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="attribute_value" className="block text-sm font-medium text-gray-700">
            قيم الخاصية
          </label>
          <div className="flex items-center mt-1">
            <input
              type="text"
              id="newValue"
              name="newValue"
              value={formData.newValue}
              onChange={handleNewValueChange}
              maxLength={100}
              placeholder="أضف قيمة جديدة"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={handleAddValue}
              className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out text-sm"
            >
              إضافة
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.attribute_values.map((value, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {value}
                <button
                  type="button"
                  onClick={() => handleRemoveValue(value)}
                  className="ml-2 -mr-0.5 h-4 w-4 flex items-center justify-center rounded-full hover:bg-blue-200 text-blue-500 hover:text-blue-700"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
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
            إضافة خاصية
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddAttributeForm;
