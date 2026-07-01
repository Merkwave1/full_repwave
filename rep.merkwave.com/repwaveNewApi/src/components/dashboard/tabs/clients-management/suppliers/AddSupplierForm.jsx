import React, { useState } from 'react';
import { TruckIcon } from '@heroicons/react/24/outline';
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalInputClass,
  modalSectionClass,
} from '../../../../common/AppModalShell.jsx';

const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <AppModalShell
      open
      onClose={onCancel}
      title="إضافة مورد جديد"
      subtitle="تسجيل مورد جديد في النظام"
      icon={TruckIcon}
      size="lg"
      portal
      footer={
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
            إلغاء
          </button>
          <button type="submit" form="add-supplier-form" className={modalPrimaryBtnClass}>
            إضافة مورد
          </button>
        </div>
      }
    >
      <form id="add-supplier-form" onSubmit={handleSubmit}>
        <div className={`${modalSectionClass} p-4 sm:p-5 space-y-4`}>
          <div>
            <label htmlFor="supplier_name" className={labelClass}>
              اسم الشركة / المورد <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="supplier_name"
              name="supplier_name"
              value={formData.supplier_name}
              onChange={handleChange}
              required
              maxLength={255}
              className={modalInputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="supplier_contact_person" className={labelClass}>
                الشخص المسؤول
              </label>
              <input
                type="text"
                id="supplier_contact_person"
                name="supplier_contact_person"
                value={formData.supplier_contact_person}
                onChange={handleChange}
                maxLength={255}
                className={modalInputClass}
              />
            </div>
            <div>
              <label htmlFor="supplier_phone" className={labelClass}>
                الهاتف
              </label>
              <input
                type="tel"
                id="supplier_phone"
                name="supplier_phone"
                value={formData.supplier_phone}
                onChange={handleChange}
                maxLength={20}
                className={modalInputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="supplier_email" className={labelClass}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              id="supplier_email"
              name="supplier_email"
              value={formData.supplier_email}
              onChange={handleChange}
              maxLength={255}
              className={modalInputClass}
            />
          </div>

          <div>
            <label htmlFor="supplier_address" className={labelClass}>
              العنوان
            </label>
            <textarea
              id="supplier_address"
              name="supplier_address"
              value={formData.supplier_address}
              onChange={handleChange}
              rows="2"
              maxLength={500}
              className={`${modalInputClass} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="supplier_notes" className={labelClass}>
              ملاحظات
            </label>
            <textarea
              id="supplier_notes"
              name="supplier_notes"
              value={formData.supplier_notes}
              onChange={handleChange}
              rows="3"
              maxLength={500}
              className={`${modalInputClass} resize-none`}
            />
          </div>
        </div>
      </form>
    </AppModalShell>
  );
}

export default AddSupplierForm;
