import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExclamationTriangleIcon, CubeIcon } from "@heroicons/react/24/outline";
import NumberInput from "../../../../common/NumberInput/NumberInput.jsx";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalInputClass,
  modalSectionClass,
  modalSectionHeaderClass,
} from "../../../../common/AppModalShell.jsx";

function AddPackagingTypeForm({ onAdd, onCancel, baseUnits = [] }) {
  const [formData, setFormData] = useState({
    packaging_types_name: "",
    packaging_types_description: "",
    packaging_types_default_conversion_factor: "",
    packaging_types_compatible_base_unit_id: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  if (!baseUnits?.length) {
    return (
      <AppModalShell
        portal
        open
        onClose={onCancel}
        title="لا توجد وحدات أساسية"
        subtitle="أنشئ وحدة قياس أولاً"
        icon={ExclamationTriangleIcon}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
              إغلاق
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/product-management/units")}
              className={modalPrimaryBtnClass}
            >
              الذهاب للوحدات
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 text-center py-2">
          يجب إنشاء وحدة أساسية قبل إضافة نوع تعبئة جديد.
        </p>
      </AppModalShell>
    );
  }

  return (
    <AppModalShell
      portal
      open
      onClose={onCancel}
      title="إضافة نوع تعبئة"
      subtitle="حدد الاسم، معامل التحويل، والوحدة المتوافقة"
      icon={CubeIcon}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
            إلغاء
          </button>
          <button type="submit" form="add-packaging-type-form" className={modalPrimaryBtnClass}>
            حفظ نوع التعبئة
          </button>
        </div>
      }
    >
      <form id="add-packaging-type-form" onSubmit={handleSubmit} className="space-y-4">
        <div className={modalSectionClass}>
          <div className={modalSectionHeaderClass}>بيانات نوع التعبئة</div>
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <label htmlFor="packaging_types_name" className="block text-sm font-medium text-gray-700 mb-1">
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
                className={modalInputClass}
              />
            </div>

            <div>
              <label
                htmlFor="packaging_types_default_conversion_factor"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                معامل التحويل (كم وحدة أساسية = 1 تعبئة)
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
                placeholder="1"
                className="w-full"
                required
              />
            </div>

            <div>
              <label
                htmlFor="packaging_types_compatible_base_unit_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                وحدة القياس المتوافقة
              </label>
              <select
                id="packaging_types_compatible_base_unit_id"
                name="packaging_types_compatible_base_unit_id"
                value={formData.packaging_types_compatible_base_unit_id}
                onChange={handleChange}
                required
                className={modalInputClass}
              >
                <option value="">اختر وحدة</option>
                {baseUnits.map((unit) => (
                  <option key={unit.base_units_id} value={unit.base_units_id}>
                    {unit.base_units_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="packaging_types_description" className="block text-sm font-medium text-gray-700 mb-1">
                الوصف (اختياري)
              </label>
              <textarea
                id="packaging_types_description"
                name="packaging_types_description"
                value={formData.packaging_types_description}
                onChange={handleChange}
                rows={3}
                className={modalInputClass}
              />
            </div>
          </div>
        </div>
      </form>
    </AppModalShell>
  );
}

export default AddPackagingTypeForm;
