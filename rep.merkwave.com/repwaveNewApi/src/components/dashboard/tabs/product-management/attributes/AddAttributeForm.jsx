// src/components/dashboard/tabs/product-management/attributes/AddAttributeForm.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

function AddAttributeForm({ onAdd, onCancel }) {
  const [formData, setFormData] = useState({
    attribute_name: '',
    attribute_values: [],
    newValue: '',
  });

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

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
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">إضافة خاصية جديدة</h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          aria-label="إغلاق"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
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
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
            />
            <button
              type="button"
              onClick={handleAddValue}
              className="ml-2 px-4 py-2 bg-[#8B5FD6] text-white rounded-md hover:bg-[#8B5FD6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B5FD6] transition duration-150 ease-in-out text-sm"
            >
              إضافة
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.attribute_values.map((value, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#EDE7FF] text-[#2D1B69]"
              >
                {value}
                <button
                  type="button"
                  onClick={() => handleRemoveValue(value)}
                  className="ml-2 -mr-0.5 h-4 w-4 flex items-center justify-center rounded-full hover:bg-[#C4A8F0]/30 text-[#8B5FD6] hover:text-[#7A52C2]"
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
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B5FD6] transition duration-150 ease-in-out"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B5FD6] hover:bg-[#7A52C2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B5FD6] transition duration-150 ease-in-out"
          >
            إضافة خاصية
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}

export default AddAttributeForm;
