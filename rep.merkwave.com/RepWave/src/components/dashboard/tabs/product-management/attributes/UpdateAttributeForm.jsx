import React, { useState, useEffect } from "react";

function UpdateAttributeForm({ attribute, onUpdate, onCancel }) {
  const [formData, setFormData] = useState({
    attribute_id: "",
    attribute_name: "",
    // This will now hold the full value objects, e.g., { attribute_value_id: 1, value: 'Red' }
    attribute_values: [],
    newValue: "", // Temporary state for the new value input
  });

  useEffect(() => {
    if (attribute) {
      setFormData({
        attribute_id: attribute.attribute_id || "",
        attribute_name: attribute.attribute_name || "",
        // Keep the original value objects, but ensure they have a 'value' property for consistency
        attribute_values: Array.isArray(attribute.values)
          ? attribute.values.map((val) => ({
              attribute_value_id: val.attribute_value_id,
              value: val.attribute_value_value,
            }))
          : [],
        newValue: "",
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
    const valueExists = formData.attribute_values.some(
      (v) => v.value === newTrimmedValue,
    );

    if (newTrimmedValue !== "" && !valueExists) {
      setFormData((prevData) => ({
        ...prevData,
        // Add a new value object. It won't have an attribute_value_id yet.
        attribute_values: [
          ...prevData.attribute_values,
          { value: newTrimmedValue },
        ],
        newValue: "", // Clear input after adding
      }));
    }
  };

  const handleRemoveValue = (valueToRemove) => {
    setFormData((prevData) => ({
      ...prevData,
      // Filter based on the value property of the objects
      attribute_values: prevData.attribute_values.filter(
        (v) => v.value !== valueToRemove,
      ),
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
        تعديل الخاصية
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Attribute Name */}
        <div>
          <label
            htmlFor="attribute_name"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
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

        {/* Add Value */}
        <div>
          <label
            htmlFor="attribute_value"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            قيم الخاصية
          </label>

          <div className="flex items-center gap-3 mt-1">
            <input
              type="text"
              id="newValue"
              name="newValue"
              value={formData.newValue}
              onChange={handleNewValueChange}
              maxLength={100}
              placeholder="أضف قيمة جديدة"
              className="
              flex-1 px-4 py-2.5 rounded-xl
              bg-gray-50 border border-gray-200
              text-[#1F2937]
              focus:border-[#8DD8F5]
              focus:ring-2 focus:ring-[#8DD8F5]/40
              outline-none transition
            "
            />

            <button
              type="button"
              onClick={handleAddValue}
              className="
              px-5 py-2.5 rounded-xl
              font-semibold
              text-[#1F2937]
              bg-[#8DD8F5]
              hover:brightness-110
              shadow-md shadow-[#8DD8F5]/40
              transition-all
            "
            >
              إضافة
            </button>
          </div>

          {/* Values Chips */}
          <div className="mt-4 flex flex-wrap gap-3">
            {formData.attribute_values.map((item, index) => (
              <span
                key={item.attribute_value_id || `new-${index}`}
                className="
                inline-flex items-center gap-2
                px-4 py-1.5 rounded-full
                text-sm font-medium
                bg-[#8DD8F5]/25
                text-[#1F2937]
                border border-[#8DD8F5]/40
                shadow-sm
              "
              >
                {item.value}
                <button
                  type="button"
                  onClick={() => handleRemoveValue(item.value)}
                  className="
                  w-5 h-5 rounded-full
                  flex items-center justify-center
                  text-[#1F2937]/70
                  hover:bg-[#8DD8F5]/40
                  transition
                "
                >
                  ×
                </button>
              </span>
            ))}
          </div>
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
            تحديث الخاصية
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateAttributeForm;
