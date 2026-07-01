// src/components/dashboard/tabs/inventory-management/Warehouses/UpdateWarehouseForm.jsx
import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { MODAL_GRADIENTS } from '../../../../../constants/brandColors.js';
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";

const inputClass =
  "mt-1 block w-full px-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6]/30 focus:border-[#8B5FD6] sm:text-sm bg-white";

function UpdateWarehouseForm({
  warehouse,
  onUpdate,
  onCancel,
  allUsers = [],
  salesReps = [],
}) {
  const [formData, setFormData] = useState({
    warehouse_id: "",
    warehouse_name: "",
    warehouse_type: "",
    warehouse_code: "",
    warehouse_address: "",
    warehouse_contact_person: "",
    warehouse_phone: "",
    warehouse_status: "",
    warehouse_representative_user_id: "",
  });

  useEffect(() => {
    if (warehouse) {
      setFormData({
        warehouse_id: warehouse.warehouse_id || "",
        warehouse_name: warehouse.warehouse_name || "",
        warehouse_type: warehouse.warehouse_type || "Main",
        warehouse_code: warehouse.warehouse_code || "",
        warehouse_address: warehouse.warehouse_address || "",
        warehouse_contact_person: warehouse.warehouse_contact_person || "",
        warehouse_phone: warehouse.warehouse_phone || "",
        warehouse_status: warehouse.warehouse_status || "Active",
        warehouse_representative_user_id:
          warehouse.warehouse_representative_user_id != null
            ? String(warehouse.warehouse_representative_user_id)
            : "",
      });
    }
  }, [warehouse]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "warehouse_type") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
        warehouse_representative_user_id:
          value === "Van" ? "" : prevData.warehouse_representative_user_id,
      }));
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleRepresentativeChange = (value) => {
    setFormData((prevData) => ({
      ...prevData,
      warehouse_representative_user_id: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.warehouse_name) {
      alert("يرجى ملء اسم المخزن.");
      return;
    }
    if (
      formData.warehouse_type === "Van" &&
      !formData.warehouse_representative_user_id
    ) {
      alert("يجب اختيار مندوب مبيعات للمخزن من نوع فان");
      return;
    }
    onUpdate(formData);
  };

  return (
    <div
      className="bg-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
      dir="rtl"
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: MODAL_GRADIENTS.brand }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <BuildingStorefrontIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              تعديل المخزن
            </h3>
            <p className="text-xs text-white/70 hidden sm:block">
              {warehouse?.warehouse_name || "تحديث بيانات المخزن"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <BuildingStorefrontIcon className="h-4 w-4 text-[#8B5FD6]" />
            <span className="text-sm font-semibold text-gray-800">
              البيانات الأساسية
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="warehouse_name" className="block text-sm font-medium text-gray-700">
                اسم المخزن <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="warehouse_name"
                name="warehouse_name"
                value={formData.warehouse_name}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="warehouse_type" className="block text-sm font-medium text-gray-700">
                  نوع المخزن
                </label>
                <select
                  id="warehouse_type"
                  name="warehouse_type"
                  value={formData.warehouse_type}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="Main">رئيسي</option>
                  <option value="Van">فان</option>
                </select>
              </div>
              <div>
                <label htmlFor="warehouse_code" className="block text-sm font-medium text-gray-700">
                  كود المخزن
                </label>
                <input
                  type="text"
                  id="warehouse_code"
                  name="warehouse_code"
                  value={formData.warehouse_code}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="warehouse_status" className="block text-sm font-medium text-gray-700">
                حالة المخزن
              </label>
              <select
                id="warehouse_status"
                name="warehouse_status"
                value={formData.warehouse_status}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="Active">نشط</option>
                <option value="Inactive">غير نشط</option>
                <option value="Under Maintenance">تحت الصيانة</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <MapPinIcon className="h-4 w-4 text-[#8B5FD6]" />
            <span className="text-sm font-semibold text-gray-800">
              الموقع والمسؤول
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="warehouse_address" className="block text-sm font-medium text-gray-700">
                عنوان المخزن <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="warehouse_address"
                name="warehouse_address"
                value={formData.warehouse_address}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="warehouse_representative_user_id" className="block text-sm font-medium text-gray-700">
                الشخص المسؤول
                {formData.warehouse_type === "Van" && (
                  <span className="text-red-500 mr-1">*</span>
                )}
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "اختر المسؤول" },
                  ...(formData.warehouse_type === "Van" ? salesReps : allUsers).map(
                    (user) => ({
                      value: String(user.users_id),
                      label: `${user.users_name}${formData.warehouse_type === "Van" ? " (مندوب)" : ""}`,
                    }),
                  ),
                ]}
                value={formData.warehouse_representative_user_id}
                onChange={handleRepresentativeChange}
                placeholder={
                  formData.warehouse_type === "Van"
                    ? "اختر مندوب مبيعات"
                    : "اختر المسؤول"
                }
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <PhoneIcon className="h-4 w-4 text-[#8B5FD6]" />
            <span className="text-sm font-semibold text-gray-800">
              جهة الاتصال
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="warehouse_contact_person" className="block text-sm font-medium text-gray-700">
                اسم جهة الاتصال <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="warehouse_contact_person"
                name="warehouse_contact_person"
                value={formData.warehouse_contact_person}
                onChange={handleChange}
                placeholder="اسم أو منصب جهة الاتصال"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="warehouse_phone" className="block text-sm font-medium text-gray-700">
                هاتف المخزن <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="warehouse_phone"
                name="warehouse_phone"
                value={formData.warehouse_phone}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#8B5FD6] hover:bg-[#7A52C2] transition-colors shadow-sm"
          >
            تحديث المخزن
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateWarehouseForm;
