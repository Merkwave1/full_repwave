// src/components/dashboard/tabs/safe-management/safe-transfers/AddSafeTransferForm.jsx
import React, { useState, useEffect } from 'react';
import { ArrowsRightLeftIcon, XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { addSafeTransfer } from '../../../../../apis/safe_transfers';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import { getSafes } from '../../../../../apis/safes';
import useCurrency from '../../../../../hooks/useCurrency';

const AddSafeTransferForm = ({ onClose, onSubmit }) => {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  const [formData, setFormData] = useState({
    source_safe_id: '',
    destination_safe_id: '',
    transfer_amount: '',
    transfer_notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [safes, setSafes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSafes = async () => {
      try {
        const response = await getSafes();
        setSafes(response.safes || []);
      } catch (error) {
        console.error('Error loading safes:', error);
        setErrors({ safes: 'فشل في تحميل الخزائن' });
      } finally {
        setLoading(false);
      }
    };
    
    loadSafes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.source_safe_id) {
      newErrors.source_safe_id = 'يجب اختيار الخزنة المصدر';
    }
    
    if (!formData.destination_safe_id) {
      newErrors.destination_safe_id = 'يجب اختيار الخزنة الوجهة';
    }
    
    if (formData.source_safe_id === formData.destination_safe_id) {
      newErrors.destination_safe_id = 'لا يمكن أن تكون الخزنة المصدر والوجهة نفسها';
    }
    
    if (!formData.transfer_amount || parseFloat(formData.transfer_amount) <= 0) {
      newErrors.transfer_amount = 'يجب إدخال مبلغ صحيح أكبر من صفر';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Get user role from localStorage
      let userRole = null;
      const userDataString = localStorage.getItem('userData');
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          userRole = userData.users_role;
        } catch (e) {
          console.error('Failed to parse userData:', e);
        }
      }

      const transferData = {
        source_safe_id: parseInt(formData.source_safe_id),
        destination_safe_id: parseInt(formData.destination_safe_id),
        transfer_amount: parseFloat(formData.transfer_amount),
        transfer_notes: formData.transfer_notes || null,
        user_role: userRole // Send user role to backend
      };

      await addSafeTransfer(transferData);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error('Error adding safe transfer:', error);
      setErrors({
        submit: error.message || 'حدث خطأ أثناء إضافة التحويل'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceSafe = safes.find(safe => safe.safes_id === parseInt(formData.source_safe_id));
  const destinationSafe = safes.find(safe => safe.safes_id === parseInt(formData.destination_safe_id));

  const formatBalance = (value) => {
    const formatted = formatMoney(value || 0, { withSymbol: false });
    return symbol ? `${formatted} ${symbol}` : formatted;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600" />
              تحويل بين الخزائن
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

            {errors.safes && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {errors.safes}
              </div>
            )}

            {/* Safe Selection */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ArrowsRightLeftIcon className="h-5 w-5 text-blue-600" />
                اختيار الخزائن
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Safe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الخزنة المصدر *
                  </label>
                  <select
                    name="source_safe_id"
                    value={formData.source_safe_id}
                    onChange={handleChange}
                    className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.source_safe_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || loading}
                    dir="rtl"
                  >
                    <option value="">اختر الخزنة المصدر</option>
                    {safes.map((safe) => (
                      <option key={safe.safes_id} value={safe.safes_id}>
                        {safe.safes_name} - {safe.safes_type === 'company' ? 'خزنة الشركة' : 'خزنة مندوب'} 
                        (رصيد: {formatBalance(safe.safes_balance)})
                      </option>
                    ))}
                  </select>
                  {errors.source_safe_id && <p className="mt-1 text-sm text-red-600">{errors.source_safe_id}</p>}
                  {sourceSafe && (
                    <div className="mt-2 text-sm text-gray-600">
                      الرصيد الحالي: <span className="font-semibold text-green-600">{formatBalance(sourceSafe.safes_balance)}</span>
                    </div>
                  )}
                </div>

                {/* Destination Safe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الخزنة الوجهة *
                  </label>
                  <select
                    name="destination_safe_id"
                    value={formData.destination_safe_id}
                    onChange={handleChange}
                    className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.destination_safe_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || loading}
                    dir="rtl"
                  >
                    <option value="">اختر الخزنة الوجهة</option>
                    {safes.filter(safe => safe.safes_id !== parseInt(formData.source_safe_id)).map((safe) => (
                      <option key={safe.safes_id} value={safe.safes_id}>
                        {safe.safes_name} - {safe.safes_type === 'company' ? 'خزنة الشركة' : 'خزنة مندوب'}
                        (رصيد: {formatBalance(safe.safes_balance)})
                      </option>
                    ))}
                  </select>
                  {errors.destination_safe_id && <p className="mt-1 text-sm text-red-600">{errors.destination_safe_id}</p>}
                  {destinationSafe && (
                    <div className="mt-2 text-sm text-gray-600">
                      الرصيد الحالي: <span className="font-semibold text-blue-600">{formatBalance(destinationSafe.safes_balance)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer Amount */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-green-600" />
                مبلغ التحويل
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ *
                </label>
                <div className="relative">
                  <NumberInput
                    value={formData.transfer_amount}
                    onChange={(v) => handleChange({ target: { name: 'transfer_amount', value: v } })}
                    className={`w-full ${errors.transfer_amount ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {symbol}
                  </div>
                </div>
                {errors.transfer_amount && <p className="mt-1 text-sm text-red-600">{errors.transfer_amount}</p>}
                
                {/* Balance validation */}
                {sourceSafe && formData.transfer_amount && parseFloat(formData.transfer_amount) > parseFloat(sourceSafe.safes_balance || 0) && (
                  <div className="mt-2 text-sm text-red-600">
                    ⚠️ المبلغ المطلوب أكبر من الرصيد المتاح في الخزنة المصدر
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات
              </label>
              <textarea
                name="transfer_notes"
                value={formData.transfer_notes}
                onChange={handleChange}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="أدخل أي ملاحظات إضافية حول التحويل..."
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={isSubmitting || loading || (sourceSafe && formData.transfer_amount && parseFloat(formData.transfer_amount) > parseFloat(sourceSafe.safes_balance || 0))}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري التحويل...
                  </>
                ) : (
                  <>
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    تأكيد التحويل
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="bg-gray-500 text-white py-3 px-6 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSafeTransferForm;
