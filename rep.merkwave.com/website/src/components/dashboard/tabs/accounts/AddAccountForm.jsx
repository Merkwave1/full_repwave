import React, { useState } from 'react';
import { XMarkIcon, IdentificationIcon, HashtagIcon, TagIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import accountsApi from '../../../../apis/accounts.js';
import { useOutletContext } from 'react-router-dom';

export default function AddAccountForm({ onClose, onSubmit }) {
  const { setGlobalMessage } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'مصروفات',
    sortid: '0'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await accountsApi.add(formData);
      if (response.status === 'success') {
        setGlobalMessage({ type: 'success', message: 'تم إضافة الحساب بنجاح' });
        onSubmit();
      } else {
        setGlobalMessage({ type: 'error', message: response.message || 'فشل في إضافة الحساب' });
      }
    } catch (error) {
      setGlobalMessage({ type: 'error', message: 'حدث خطأ أثناء الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <IdentificationIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">إضافة حساب جديد</h3>
              <p className="text-sm text-gray-500">أدخل بيانات الحساب المالي الجديد</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 transition-colors hover:text-gray-600 hover:bg-gray-100 rounded-xl">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">كود الحساب</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <HashtagIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="code"
                required
                value={formData.code}
                onChange={handleChange}
                className="w-full py-2.5 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                placeholder="مثال: 101"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">اسم الحساب</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <IdentificationIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full py-2.5 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                placeholder="مثال: مصروفات كهرباء"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">نوع الحساب</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <TagIcon className="w-5 h-5 text-gray-400" />
              </div>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full py-2.5 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
              >
                <option value="مصروفات">مصروفات</option>
                <option value="مصروفات ادارية">مصروفات ادارية</option>
                <option value="إيرادات">إيرادات</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">الترتيب</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ArrowsUpDownIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="sortid"
                value={formData.sortid}
                onChange={handleChange}
                className="w-full py-2.5 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'إضافة الحساب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
