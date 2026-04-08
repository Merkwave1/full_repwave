// src/components/dashboard/tabs/safe-management/safes/AddSafeForm.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import { addSafe } from '../../../../../apis/safes';
import { getAllUsers } from '../../../../../apis/users';
import { getPaymentMethods } from '../../../../../apis/payment_methods';
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_COLORS } from '../../../../../constants/paymentMethods';
import { SAFE_COLORS, DEFAULT_SAFE_COLOR } from '../../../../../constants/safeColors';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';
import useCurrency from '../../../../../hooks/useCurrency';

const AddSafeForm = ({ onClose, onSubmit }) => {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_balance: '0.00',
    type: 'rep', // 'company' or 'rep' or 'store_keeper'
    rep_user_id: '',
    payment_method_id: 1, // Default to Cash
    is_active: true,
    color: DEFAULT_SAFE_COLOR // Default color
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  useEffect(() => {
    loadUsers();
    loadPaymentMethods();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getAllUsers();
      setUsers(response || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await getPaymentMethods();
      setPaymentMethods(response?.payment_methods || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم الخزنة مطلوب';
    }

    if (!formData.type) {
      newErrors.type = 'نوع الخزنة مطلوب';
    }

    if (!formData.payment_method_id) {
      newErrors.payment_method_id = 'طريقة الدفع مطلوبة';
    }

    if ((formData.type === 'rep' || formData.type === 'store_keeper') && !formData.rep_user_id) {
      newErrors.rep_user_id = 'المستخدم المسؤول مطلوب للخزنة';
    }

    if (!formData.initial_balance || parseFloat(formData.initial_balance) < 0) {
      newErrors.initial_balance = 'الرصيد الأولي يجب أن يكون صفر أو أكبر';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const safeData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        initial_balance: parseFloat(formData.initial_balance),
        type: formData.type,
        rep_user_id: (formData.type === 'rep' || formData.type === 'store_keeper') ? formData.rep_user_id : null,
        payment_method_id: formData.payment_method_id,
        is_active: formData.is_active ? 1 : 0,
        color: formData.color
      };

      await addSafe(safeData);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error('Error adding safe:', error);
      setErrors({
        submit: error.message || 'حدث خطأ أثناء إضافة الخزنة'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // users list is used directly when preparing options per selected type

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <PlusIcon className="h-6 w-6 text-blue-600" />
              إضافة خزنة جديدة
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]" dir="rtl">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {errors.submit}
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ArchiveBoxIcon className="h-5 w-5 text-blue-600" />
                معلومات الخزنة الأساسية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Safe Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الخزنة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="أدخل اسم الخزنة..."
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وصف الخزنة
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="وصف اختياري للخزنة..."
                  />
                </div>

                {/* Safe Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع الخزنة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      handleInputChange('type', e.target.value);
                      // Clear rep selection when switching to company type
                        if (e.target.value === 'company') {
                          handleInputChange('rep_user_id', '');
                        }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rep">خزنة مندوب</option>
                    <option value="store_keeper">خزنة أمين المخزن</option>
                    <option value="company">خزنة الشركة</option>
                  </select>
                  {errors.type && (
                    <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    طريقة الدفع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.payment_method_id}
                    onChange={(e) => handleInputChange('payment_method_id', parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingPaymentMethods}
                  >
                    {loadingPaymentMethods ? (
                      <option>جاري التحميل...</option>
                    ) : (
                      paymentMethods.map((method) => (
                        <option key={method.payment_methods_id} value={method.payment_methods_id}>
                          {PAYMENT_METHOD_ICONS[method.payment_methods_type] || '💳'} {method.payment_methods_name}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.payment_method_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.payment_method_id}</p>
                  )}
                </div>

                {/* Color Picker */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    لون الخزنة
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {SAFE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleInputChange('color', color.value)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          formData.color === color.value
                            ? `${color.borderClass} ring-2 ring-offset-2 ring-blue-500`
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        title={color.label}
                      >
                        <div className={`w-full h-8 rounded ${color.bgClass} ${color.borderClass} border`}></div>
                        <span className={`text-xs mt-1 block text-center ${
                          formData.color === color.value ? 'font-bold text-blue-600' : 'text-gray-600'
                        }`}>
                          {color.label}
                        </span>
                        {formData.color === color.value && (
                          <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Initial Balance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الرصيد الأولي ({symbol}) <span className="text-red-500">*</span>
                  </label>
                  <NumberInput
                    value={formData.initial_balance}
                    onChange={(val) => handleInputChange('initial_balance', val)}
                    className="w-full"
                    placeholder="0.00"
                  />
                  {errors.initial_balance && (
                    <p className="text-red-500 text-sm mt-1">{errors.initial_balance}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    حالة الخزنة
                  </label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={true}>نشط</option>
                    <option value={false}>غير نشط</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assignment Information - show for rep and store_keeper safes */}
            {(formData.type === 'rep' || formData.type === 'store_keeper') && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">تعيين المسؤول</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.type === 'rep' ? 'مندوب المبيعات المسؤول' : 'أمين المخزن المسؤول'} <span className="text-red-500">*</span>
                  </label>
                  {loadingUsers ? (
                    <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-center">
                      جاري تحميل المستخدمين...
                    </div>
                  ) : (
                    <SearchableSelect
                      options={
                        // Filter users by role: show reps for rep type, store_keepers for store_keeper type
                        users
                          .filter(u => {
                            if (formData.type === 'rep') return u.users_role === 'rep';
                            if (formData.type === 'store_keeper') return u.users_role === 'store_keeper';
                            return false;
                          })
                          .map(u => ({ value: u.users_id, label: `${u.users_name} (${u.users_role})` }))
                      }
                      value={formData.rep_user_id}
                      onChange={(value) => handleInputChange('rep_user_id', value)}
                      placeholder={formData.type === 'rep' ? 'اختر مندوب المبيعات...' : 'اختر أمين المخزن...'}
                      searchPlaceholder={formData.type === 'rep' ? 'ابحث عن مندوب...' : 'ابحث عن أمين مخزن...'}
                      className="w-full"
                    />
                  )}
                  {errors.rep_user_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.rep_user_id}</p>
                  )}
                </div>
              </div>
            )}

            {/* Company Safe Info */}
            {formData.type === 'company' && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">خزنة الشركة</h4>
                <p className="text-gray-600 text-sm">
                  هذه خزنة خاصة بالشركة الرئيسية ولا تحتاج إلى تعيين مندوب مبيعات محدد.
                </p>
              </div>
            )}

            {/* Information Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <h3 className="text-sm font-medium text-yellow-800">ملاحظة مهمة</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      • سيتم إنشاء معاملة أولية في حالة وجود رصيد ابتدائي<br/>
                      • {(formData.type === 'rep' || formData.type === 'store_keeper') ? (formData.type === 'rep' ? 'المستخدم المختار (مندوب) سيكون مسؤولاً عن هذه الخزنة' : 'المستخدم المختار (أمين المخزن) سيكون مسؤولاً عن هذه الخزنة') : 'هذه خزنة تابعة للشركة الرئيسية'}<br/>
                      • يمكن تعديل هذه المعلومات لاحقاً من خلال قسم التعديل
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              إلغاء
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || loadingUsers}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة الخزنة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSafeForm;
