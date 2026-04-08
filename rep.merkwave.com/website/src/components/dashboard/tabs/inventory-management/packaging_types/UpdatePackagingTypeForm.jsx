// src/components/dashboard/tabs/inventory-management/packaging_types/UpdatePackagingTypeForm.jsx
import React, { useState, useEffect } from 'react';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';

function UpdatePackagingTypeForm({ packagingType, onUpdate, onCancel, baseUnits }) {
  const [formData, setFormData] = useState({
    packaging_types_id: '',
    packaging_types_name: '',
    packaging_types_description: '',
    packaging_types_default_conversion_factor: '',
    packaging_types_compatible_base_unit_id: '',
  });

  useEffect(() => {
    if (packagingType) {
      setFormData({
        packaging_types_id: packagingType.packaging_types_id || '',
        packaging_types_name: packagingType.packaging_types_name || '',
        packaging_types_description: packagingType.packaging_types_description || '',
        packaging_types_default_conversion_factor: packagingType.packaging_types_default_conversion_factor || '',
        packaging_types_compatible_base_unit_id: packagingType.packaging_types_compatible_base_unit_id || '',
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
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">تعديل نوع التعبئة</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="packaging_types_name" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="packaging_types_default_conversion_factor" className="block text-sm font-medium text-gray-700">
            معامل التحويل الافتراضي
          </label>
          <NumberInput
            id="packaging_types_default_conversion_factor"
            name="packaging_types_default_conversion_factor"
            value={formData.packaging_types_default_conversion_factor}
            onChange={(val)=> setFormData(prev=>({ ...prev, packaging_types_default_conversion_factor: val }))}
            placeholder="0"
            className="mt-1"
            required
          />
        </div>

        <div>
          <label htmlFor="packaging_types_compatible_base_unit_id" className="block text-sm font-medium text-gray-700">
            وحدة القياس المتوافقة
          </label>
          <select
            id="packaging_types_compatible_base_unit_id"
            name="packaging_types_compatible_base_unit_id"
            value={formData.packaging_types_compatible_base_unit_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">اختر وحدة</option>
            {baseUnits.map(unit => (
              <option key={unit.base_units_id} value={unit.base_units_id}>
                {unit.base_units_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="packaging_types_description" className="block text-sm font-medium text-gray-700">
            الوصف
          </label>
          <textarea
            id="packaging_types_description"
            name="packaging_types_description"
            value={formData.packaging_types_description}
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
            تحديث نوع التعبئة
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdatePackagingTypeForm;
