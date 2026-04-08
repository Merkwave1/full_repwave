// src/components/dashboard/tabs/safe-management/safe-transactions/AddSafeTransactionForm.jsx
import React, { useState } from 'react';
import { PlusIcon, XMarkIcon, BanknotesIcon, CreditCardIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import PaymentMethodSelector from '../../../../common/PaymentMethodSelector/PaymentMethodSelector';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import { addSafeTransaction } from '../../../../../apis/safe_transactions';
import useCurrency from '../../../../../hooks/useCurrency';

const AddSafeTransactionForm = ({ safeId, safes, onClose, onSubmit }) => {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  const [formData, setFormData] = useState({
    safe_id: safeId || '', // Allow selection if safeId not provided
    type: 'deposit',
    amount: '',
    payment_method_id: '',
    description: '',
    reference: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simplified: only provide Deposit and Withdrawal for quick entry
  const transactionTypes = [
    { value: 'deposit', label: 'إيداع', icon: '⬆️', color: 'text-green-600' },
    { value: 'withdrawal', label: 'سحب', icon: '⬇️', color: 'text-red-600' }
  ];

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

  const handlePaymentMethodChange = (paymentMethodId) => {
    setFormData(prev => ({
      ...prev,
      payment_method_id: paymentMethodId
    }));
    
    if (errors.payment_method_id) {
      setErrors(prev => ({
        ...prev,
        payment_method_id: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!safeId && !formData.safe_id) {
      newErrors.safe_id = 'الخزنة مطلوبة';
    }

    if (!formData.type.trim()) {
      newErrors.type = 'نوع المعاملة مطلوب';
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'المبلغ مطلوب';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'يجب أن يكون المبلغ رقم موجب';
    }

    if (!formData.payment_method_id) {
      newErrors.payment_method_id = 'طريقة الدفع مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const transactionData = {
        safe_id: safeId || formData.safe_id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        payment_method_id: parseInt(formData.payment_method_id),
        description: formData.description,
        reference: formData.reference
      };

      await addSafeTransaction(transactionData);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error('Error adding safe transaction:', error);
      setErrors({
        submit: error.message || 'حدث خطأ أثناء إضافة المعاملة'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTransactionType = transactionTypes.find(type => type.value === formData.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <PlusIcon className="h-6 w-6 text-green-600" />
              إضافة معاملة جديدة
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

            {/* Transaction Type */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-blue-600" />
                نوع المعاملة
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {transactionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange({ target: { name: 'type', value: type.value } })}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl">{type.icon}</span>
                      <span className={formData.type === type.value ? 'text-blue-700' : 'text-gray-700'}>
                        {type.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {errors.type && <p className="mt-2 text-sm text-red-600">{errors.type}</p>}
            </div>

            {/* Safe Selection - Only show if safes array is provided and no safeId */}
            {!safeId && safes && safes.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ArchiveBoxIcon className="h-5 w-5 text-purple-600" />
                  اختيار الخزنة
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الخزنة *
                  </label>
                  <select
                    name="safe_id"
                    value={formData.safe_id}
                    onChange={handleChange}
                    className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.safe_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                    dir="rtl"
                  >
                    <option value="">اختر الخزنة</option>
                    {safes.map((safe) => (
                      <option key={safe.safes_id} value={safe.safes_id}>
                        {safe.safes_name} - {safe.safes_type === 'company' ? 'خزنة الشركة' : 'خزنة مندوب'}
                      </option>
                    ))}
                  </select>
                  {errors.safe_id && <p className="mt-1 text-sm text-red-600">{errors.safe_id}</p>}
                </div>
              </div>
            )}

            {/* Amount and Payment Method */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5 text-green-600" />
                معلومات الدفع
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المبلغ *
                  </label>
                  <div className="relative">
                    <NumberInput
                      value={formData.amount}
                      onChange={(v) => handleChange({ target: { name: 'amount', value: v } })}
                      className={`w-full ${errors.amount ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      {symbol}
                    </div>
                  </div>
                  {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    طريقة الدفع *
                  </label>
                  <PaymentMethodSelector
                    value={formData.payment_method_id}
                    onChange={handlePaymentMethodChange}
                    error={errors.payment_method_id}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                معلومات إضافية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="وصف المعاملة..."
                    disabled={isSubmitting}
                  />
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المرجع
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="رقم الفاتورة، المرجع..."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Transaction Preview */}
            {selectedTransactionType && formData.amount && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  معاينة المعاملة
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedTransactionType.icon}</span>
                    <span className={`font-medium ${selectedTransactionType.color}`}>
                      {selectedTransactionType.label}
                    </span>
                  </div>
                  <div className={`text-xl font-bold ${
                    formData.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.type === 'deposit' ? '+' : '-'}
                    {formatMoney(Math.abs(parseFloat(formData.amount || 0) || 0))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'إضافة المعاملة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSafeTransactionForm;
