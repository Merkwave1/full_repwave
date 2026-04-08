// src/components/dashboard/tabs/purchases-management/supplier-payments/UpdateSupplierPaymentForm.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import { updateSupplierPayment } from '../../../../../apis/supplier_payments';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDateTime } from '../../../../../utils/dateUtils';

const UpdateSupplierPaymentForm = ({ 
  payment,
  onClose, 
  onSubmit, 
  paymentMethods = [], 
  safes = [],
  purchaseOrders = [] 
}) => {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  
  const [formData, setFormData] = useState({
    method_id: '',
    amount: '',
    date: '',
    safe_id: '',
    transaction_id: '',
    notes: '',
    purchase_order_id: '',
    type: '',
    status: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState([]);

  useEffect(() => {
    if (payment) {
      setFormData({
        method_id: payment.supplier_payments_method_id || '',
        amount: payment.supplier_payments_amount || '',
        date: payment.supplier_payments_date ? payment.supplier_payments_date.split(' ')[0] : '',
        safe_id: payment.supplier_payments_safe_id || '',
        transaction_id: payment.supplier_payments_transaction_id || '',
        notes: payment.supplier_payments_notes || '',
        purchase_order_id: payment.supplier_payments_purchase_order_id || '',
        type: payment.supplier_payments_type || '',
        status: payment.supplier_payments_status || ''
      });

      // Filter purchase orders for this supplier
      const filtered = purchaseOrders.filter(po => 
        po.purchase_orders_supplier_id === payment.supplier_payments_supplier_id
      );
      setFilteredPurchaseOrders(filtered);
    }
  }, [payment, purchaseOrders]);

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

    if (!formData.method_id) {
      newErrors.method_id = 'طريقة الدفع مطلوبة';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'مبلغ صحيح مطلوب';
    }

    if (!formData.date) {
      newErrors.date = 'تاريخ الدفعة مطلوب';
    }

    if (!formData.safe_id) {
      newErrors.safe_id = 'الخزنة مطلوبة';
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
      // Only send fields that have values (partial update)
      const updateData = {};
      
      if (formData.method_id) updateData.method_id = formData.method_id;
      if (formData.amount) updateData.amount = formData.amount;
      if (formData.date) updateData.date = formData.date;
      if (formData.safe_id) updateData.safe_id = formData.safe_id;
      if (formData.transaction_id !== undefined) updateData.transaction_id = formData.transaction_id;
      if (formData.notes !== undefined) updateData.notes = formData.notes;
      if (formData.purchase_order_id !== undefined) updateData.purchase_order_id = formData.purchase_order_id || null;
      if (formData.type) updateData.type = formData.type;
      if (formData.status) updateData.status = formData.status;

      await updateSupplierPayment(payment.supplier_payments_id, updateData);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error('Error updating supplier payment:', error);
      setErrors({
        submit: error.message || 'حدث خطأ أثناء تحديث الدفعة'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare payment method options
  const paymentMethodOptions = paymentMethods.map(method => ({
    value: method.payment_methods_id,
    label: method.payment_methods_name
  }));

  // Prepare safe options
  const safeOptions = safes.map(safe => ({
    value: safe.safes_id,
    label: safe.safes_name
  }));

  // Prepare purchase order options
  const purchaseOrderOptions = filteredPurchaseOrders.map(po => ({
    value: po.purchase_orders_id,
    label: `أمر #${po.purchase_orders_id} - ${formatMoney(po.purchase_orders_total_amount)}`
  }));

  if (!payment) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <PencilIcon className="h-6 w-6 text-blue-600" />
              تعديل دفعة المورد #{payment.supplier_payments_id}
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

            {/* Supplier Information (Read-only) */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">معلومات المورد</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">اسم المورد:</span>
                  <p className="text-gray-900">{payment.supplier_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">رقم الدفعة:</span>
                  <p className="text-gray-900">#{payment.supplier_payments_id}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">تاريخ الإنشاء:</span>
                  <p className="text-gray-900">{formatLocalDateTime(payment.supplier_payments_created_at)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">المُنشئ:</span>
                  <p className="text-gray-900">{payment.rep_user_name}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">معلومات الدفعة</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    طريقة الدفع <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={paymentMethodOptions}
                    value={formData.method_id}
                    onChange={(value) => handleInputChange('method_id', value)}
                    placeholder="اختر طريقة الدفع..."
                    className="w-full"
                  />
                  {errors.method_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.method_id}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المبلغ ({symbol}) <span className="text-red-500">*</span>
                  </label>
                  <NumberInput
                    value={formData.amount}
                    onChange={(v) => handleInputChange('amount', v)}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تاريخ الدفعة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                  )}
                </div>

                {/* Safe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الخزنة <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={safeOptions}
                    value={formData.safe_id}
                    onChange={(value) => handleInputChange('safe_id', value)}
                    placeholder="اختر الخزنة..."
                    className="w-full"
                  />
                  {errors.safe_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.safe_id}</p>
                  )}
                </div>

                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع الدفعة
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">اختر النوع...</option>
                    <option value="advance">دفعة مقدمة</option>
                    <option value="partial">دفعة جزئية</option>
                    <option value="full">دفعة كاملة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الحالة
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">اختر الحالة...</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="approved">موافق</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optional Information */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">معلومات إضافية</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم المعاملة
                  </label>
                  <input
                    type="text"
                    value={formData.transaction_id}
                    onChange={(e) => handleInputChange('transaction_id', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="رقم المعاملة (اختياري)"
                  />
                </div>

                {/* Purchase Order */}
                {filteredPurchaseOrders.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      أمر الشراء المرتبط
                    </label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'لا يوجد' },
                        ...purchaseOrderOptions
                      ]}
                      value={formData.purchase_order_id}
                      onChange={(value) => handleInputChange('purchase_order_id', value)}
                      placeholder="اختر أمر الشراء (اختياري)..."
                      className="w-full"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ملاحظات إضافية..."
                  />
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
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'جاري التحديث...' : 'تحديث الدفعة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateSupplierPaymentForm;
