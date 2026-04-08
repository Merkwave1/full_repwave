// src/components/dashboard/tabs/product-management/UpdateWarehouseForm.js
import React, { useState, useEffect } from 'react';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';

function UpdateWarehouseForm({ warehouse, onUpdate, onCancel, allUsers = [], salesReps = [] }) {
  const [formData, setFormData] = useState({
    warehouse_id: '', 
    warehouse_name: '', 
    warehouse_type: '', 
    warehouse_code: '',
    warehouse_address: '', 
    warehouse_contact_person: '', 
    warehouse_phone: '', 
    warehouse_status: '',
    warehouse_representative_user_id: '',
  });

  useEffect(() => {
    if (warehouse) {
      setFormData({
        warehouse_id: warehouse.warehouse_id || '', 
        warehouse_name: warehouse.warehouse_name || '',
        warehouse_type: warehouse.warehouse_type || 'Main', 
        warehouse_code: warehouse.warehouse_code || '',
        warehouse_address: warehouse.warehouse_address || '', 
        warehouse_contact_person: warehouse.warehouse_contact_person || '',
        warehouse_phone: warehouse.warehouse_phone || '', 
        warehouse_status: warehouse.warehouse_status || 'Active',
        warehouse_representative_user_id: warehouse.warehouse_representative_user_id != null ? String(warehouse.warehouse_representative_user_id) : '',
      });
    }
  }, [warehouse]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If changing warehouse type to/from Van, reset representative if needed
    if (name === 'warehouse_type') {
      setFormData((prevData) => ({ 
        ...prevData, 
        [name]: value,
        warehouse_representative_user_id: value === 'Van' ? '' : prevData.warehouse_representative_user_id
      }));
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleRepresentativeChange = (value) => {
    setFormData((prevData) => ({ ...prevData, warehouse_representative_user_id: value }));
  };

  const handleSubmit = (e) => { 
    e.preventDefault(); 
    // Required fields for any warehouse on update
    if (!formData.warehouse_name || !formData.warehouse_address || !formData.warehouse_representative_user_id || !formData.warehouse_phone) {
      alert('يرجى ملء الحقول الإلزامية: اسم المخزن، عنوان المخزن، الشخص المسؤول، ورقم هاتف المخزن.');
      return;
    }

    // Validation for Van type representative (kept for clarity)
    if (formData.warehouse_type === 'Van' && !formData.warehouse_representative_user_id) {
      alert('يجب اختيار مندوب مبيعات للمخزن من نوع فان');
      return;
    }

    onUpdate(formData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">تعديل المخزن</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="warehouse_name" className="block text-sm font-medium text-gray-700">اسم المخزن <span className="text-red-500">*</span></label>
          <input type="text" id="warehouse_name" name="warehouse_name" value={formData.warehouse_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="warehouse_type" className="block text-sm font-medium text-gray-700">نوع المخزن</label>
          <select id="warehouse_type" name="warehouse_type" value={formData.warehouse_type} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option value="Main">رئيسي</option>
            <option value="Van">فان</option>
          </select>
        </div>
        <div>
          <label htmlFor="warehouse_code" className="block text-sm font-medium text-gray-700">كود المخزن</label>
          <input type="text" id="warehouse_code" name="warehouse_code" value={formData.warehouse_code} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="warehouse_address" className="block text-sm font-medium text-gray-700">عنوان المخزن <span className="text-red-500">*</span></label>
          <input type="text" id="warehouse_address" name="warehouse_address" value={formData.warehouse_address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        
        {/* Representative User Selection */}
        <div>
          <label htmlFor="warehouse_representative_user_id" className="block text-sm font-medium text-gray-700">
            الشخص المسؤول
            {formData.warehouse_type === 'Van' && <span className="text-red-500 mr-1">*</span>}
            {formData.warehouse_type === 'Van' && <span className="text-sm text-gray-500">(مطلوب للمخازن من نوع فان)</span>}
          </label>
          <SearchableSelect
            options={[
              { value: '', label: 'اختر المسؤول' },
              ...(formData.warehouse_type === 'Van' ? salesReps : allUsers).map(user => ({
                value: String(user.users_id),
                label: `${user.users_name} ${formData.warehouse_type === 'Van' ? '(مندوب)' : ''}`
              }))
            ]}
            value={formData.warehouse_representative_user_id}
            onChange={handleRepresentativeChange}
            placeholder={formData.warehouse_type === 'Van' ? "اختر مندوب مبيعات" : "اختر المسؤول"}
          />
        </div>
        
        <div>
          <label htmlFor="warehouse_contact_person" className="block text-sm font-medium text-gray-700">اسم جهة الاتصال <span className="text-red-500">*</span></label>
          <input type="text" id="warehouse_contact_person" name="warehouse_contact_person" value={formData.warehouse_contact_person} onChange={handleChange} placeholder="اسم أو منصب جهة الاتصال" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="warehouse_phone" className="block text-sm font-medium text-gray-700">هاتف المخزن <span className="text-red-500">*</span></label>
          <input type="text" id="warehouse_phone" name="warehouse_phone" value={formData.warehouse_phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="warehouse_status" className="block text-sm font-medium text-gray-700">حالة المخزن</label>
          <select id="warehouse_status" name="warehouse_status" value={formData.warehouse_status} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option value="Active">نشط</option>
            <option value="Inactive">غير نشط</option>
            <option value="Under Maintenance">تحت الصيانة</option>
          </select>
        </div>
        <div className="flex justify-end space-x-4 space-x-reverse mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">إلغاء</button>
          <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out">تحديث المخزن</button>
        </div>
      </form>
    </div>
  );
}

export default UpdateWarehouseForm;
