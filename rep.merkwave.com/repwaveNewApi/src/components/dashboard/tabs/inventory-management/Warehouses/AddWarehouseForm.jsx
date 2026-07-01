import React, { useState } from 'react';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalInputClass,
  modalSectionClass,
} from '../../../../common/AppModalShell.jsx';

const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

function AddWarehouseForm({ onAdd, onCancel, allUsers = [], salesReps = [] }) {
  const [formData, setFormData] = useState({
    warehouse_name: '',
    warehouse_type: 'Main',
    warehouse_code: '',
    warehouse_address: '',
    warehouse_contact_person: '',
    warehouse_phone: '',
    warehouse_status: 'Active',
    warehouse_representative_user_id: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'warehouse_type') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        warehouse_representative_user_id:
          value === 'Van' ? '' : prev.warehouse_representative_user_id,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRepresentativeChange = (value) => {
    setFormData((prev) => ({ ...prev, warehouse_representative_user_id: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      !formData.warehouse_address ||
      !formData.warehouse_representative_user_id ||
      !formData.warehouse_phone
    ) {
      alert('يرجى ملء الحقول الإلزامية: عنوان المخزن، الشخص المسؤول، ورقم هاتف المخزن.');
      return;
    }
    if (formData.warehouse_type === 'Van' && !formData.warehouse_representative_user_id) {
      alert('يجب اختيار مندوب مبيعات للمخزن من نوع فان');
      return;
    }
    onAdd(formData);
  };

  const userOptions = formData.warehouse_type === 'Van' ? salesReps : allUsers;

  return (
    <AppModalShell
      open
      onClose={onCancel}
      title="إضافة مخزن جديد"
      subtitle="تسجيل مخزن رئيسي أو مخزن فان"
      icon={BuildingStorefrontIcon}
      size="lg"
      portal
      footer={
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
            إلغاء
          </button>
          <button type="submit" form="add-warehouse-form" className={modalPrimaryBtnClass}>
            إضافة مخزن
          </button>
        </div>
      }
    >
      <form id="add-warehouse-form" onSubmit={handleSubmit}>
        <div className={`${modalSectionClass} p-4 sm:p-5 space-y-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="warehouse_name" className={labelClass}>
                اسم المخزن <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="warehouse_name"
                name="warehouse_name"
                value={formData.warehouse_name}
                onChange={handleChange}
                required
                className={modalInputClass}
              />
            </div>
            <div>
              <label htmlFor="warehouse_type" className={labelClass}>
                نوع المخزن
              </label>
              <select
                id="warehouse_type"
                name="warehouse_type"
                value={formData.warehouse_type}
                onChange={handleChange}
                required
                className={modalInputClass}
              >
                <option value="Main">رئيسي</option>
                <option value="Van">فان</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="warehouse_address" className={labelClass}>
              عنوان المخزن <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="warehouse_address"
              name="warehouse_address"
              value={formData.warehouse_address}
              onChange={handleChange}
              required
              className={modalInputClass}
            />
          </div>

          <div>
            <label htmlFor="warehouse_representative_user_id" className={labelClass}>
              الشخص المسؤول <span className="text-red-500">*</span>
              {formData.warehouse_type === 'Van' && (
                <span className="text-xs font-normal text-gray-500 mr-1">
                  (مطلوب للمخازن من نوع فان)
                </span>
              )}
            </label>
            <SearchableSelect
              options={[
                { value: '', label: 'اختر المسؤول' },
                ...userOptions.map((user) => ({
                  value: String(user.users_id),
                  label: `${user.users_name}${formData.warehouse_type === 'Van' ? ' (مندوب)' : ''}`,
                })),
              ]}
              value={formData.warehouse_representative_user_id}
              onChange={handleRepresentativeChange}
              placeholder={
                formData.warehouse_type === 'Van' ? 'اختر مندوب مبيعات' : 'اختر المسؤول'
              }
              required
              aria-required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="warehouse_contact_person" className={labelClass}>
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
                className={modalInputClass}
              />
            </div>
            <div>
              <label htmlFor="warehouse_phone" className={labelClass}>
                هاتف المخزن <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="warehouse_phone"
                name="warehouse_phone"
                value={formData.warehouse_phone}
                onChange={handleChange}
                required
                className={modalInputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="warehouse_status" className={labelClass}>
              حالة المخزن
            </label>
            <select
              id="warehouse_status"
              name="warehouse_status"
              value={formData.warehouse_status}
              onChange={handleChange}
              required
              className={modalInputClass}
            >
              <option value="Active">نشط</option>
              <option value="Inactive">غير نشط</option>
              <option value="Under Maintenance">تحت الصيانة</option>
            </select>
          </div>
        </div>
      </form>
    </AppModalShell>
  );
}

export default AddWarehouseForm;
