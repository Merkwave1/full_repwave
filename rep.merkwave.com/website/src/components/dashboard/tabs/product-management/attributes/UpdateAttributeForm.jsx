import React, { useState, useEffect } from 'react';

function UpdateAttributeForm({ attribute, onUpdate, onCancel }) {
  const [formData, setFormData] = useState({
    attribute_id: '',
    attribute_name: '',
    // This will now hold the full value objects, e.g., { attribute_value_id: 1, value: 'Red' }
    attribute_values: [], 
    newValue: '', // Temporary state for the new value input
  });

  useEffect(() => {
    if (attribute) {
      setFormData({
        attribute_id: attribute.attribute_id || '',
        attribute_name: attribute.attribute_name || '',
        // Keep the original value objects, but ensure they have a 'value' property for consistency
        attribute_values: Array.isArray(attribute.values)
          ? attribute.values.map(val => ({ 
              attribute_value_id: val.attribute_value_id, 
              value: val.attribute_value_value 
            }))
          : [],
        newValue: '',
      });
    }
  }, [attribute]);

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
    const newTrimmedValue = formData.newValue.trim();
    // Check if the value already exists in the array of objects
    const valueExists = formData.attribute_values.some(v => v.value === newTrimmedValue);

    if (newTrimmedValue !== '' && !valueExists) {
      setFormData((prevData) => ({
        ...prevData,
        // Add a new value object. It won't have an attribute_value_id yet.
        attribute_values: [...prevData.attribute_values, { value: newTrimmedValue }],
        newValue: '', // Clear input after adding
      }));
    }
  };

  const handleRemoveValue = (valueToRemove) => {
    setFormData((prevData) => ({
      ...prevData,
      // Filter based on the value property of the objects
      attribute_values: prevData.attribute_values.filter(v => v.value !== valueToRemove),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // The formData.attribute_values is now an array of objects, which is what the backend expects.
    onUpdate({
      attribute_id: formData.attribute_id,
      attribute_name: formData.attribute_name,
      attribute_values: formData.attribute_values,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">تعديل الخاصية</h3>
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
            {/* We now map over an array of objects, so we display item.value */}
            {formData.attribute_values.map((item, index) => (
              <span
                key={item.attribute_value_id || `new-${index}`} 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {item.value}
                <button
                  type="button"
                  onClick={() => handleRemoveValue(item.value)}
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
            تحديث الخاصية
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateAttributeForm;
