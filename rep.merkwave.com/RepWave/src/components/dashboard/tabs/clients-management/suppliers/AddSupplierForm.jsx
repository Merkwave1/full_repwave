// src/components/dashboard/tabs/clients-management/suppliers/AddSupplierForm.jsx
import React, { useState } from 'react';

function AddSupplierForm({ onAdd, onCancel }) {
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_contact_person: '',
    supplier_phone: '',
    supplier_email: '',
    supplier_address: '',
    supplier_notes: '',
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
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة مورد جديد</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700">
            اسم الشركة / المورد
          </label>
          <input
            type="text"
            id="supplier_name"
            name="supplier_name"
            value={formData.supplier_name}
            onChange={handleChange}
            required
            maxLength={255}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="supplier_contact_person" className="block text-sm font-medium text-gray-700">
            الشخص المسؤول
          </label>
          <input
            type="text"
            id="supplier_contact_person"
            name="supplier_contact_person"
            value={formData.supplier_contact_person}
            onChange={handleChange}
            maxLength={255}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="supplier_address" className="block text-sm font-medium text-gray-700">
            العنوان
          </label>
          <textarea
            id="supplier_address"
            name="supplier_address"
            value={formData.supplier_address}
            onChange={handleChange}
            rows="2"
            maxLength={500}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
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
            rows="3"
            maxLength={500}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
        </div>

        <div className="flex justify-end space-x-4 space-x-reverse mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            إضافة مورد
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddSupplierForm;
