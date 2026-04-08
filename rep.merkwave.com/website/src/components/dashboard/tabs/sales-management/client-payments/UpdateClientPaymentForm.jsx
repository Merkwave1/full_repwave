// src/components/dashboard/tabs/sales-management/client-payments/UpdateClientPaymentForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { XMarkIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import { updateClientPayment } from '../../../../../apis/client_payments';
import useCurrency from '../../../../../hooks/useCurrency';

const UpdateClientPaymentForm = ({ onClose, onSubmit, safes = [], clients = [], paymentMethods = [], payment }) => {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState({
    client_id: '',
    safe_id: '',
    payment_method_id: '',
    amount: '',
    payment_date: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setFormData({
        client_id: payment.client_payments_client_id || payment.client_id || '',
        safe_id: payment.client_payments_safe_id || payment.safe_id || '',
        payment_method_id: payment.client_payments_method_id || payment.payment_method_id || '',
        amount: payment.client_payments_amount || payment.amount || '',
        payment_date: (payment.client_payments_date || payment.payment_date || '').slice(0, 10),
        notes: payment.client_payments_notes || payment.notes || ''
      });
    }
  }, [payment]);

  const clientOptions = useMemo(() => (clients || []).map(c => ({ value: c.clients_id || c.id, label: c.clients_company_name || c.company_name || c.name })), [clients]);
  const safeOptions = useMemo(() => (safes || []).map(s => ({ value: s.safes_id, label: `${s.safes_name}` })), [safes]);
  const methodOptions = useMemo(() => (paymentMethods || []).map(m => ({ value: m.payment_methods_id || m.id, label: m.payment_methods_name || m.name })), [paymentMethods]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateClientPayment(payment.client_payments_id || payment.id, {
        client_id: formData.client_id,
        safe_id: formData.safe_id,
        payment_method_id: formData.payment_method_id,
        amount: formData.amount,
        payment_date: formData.payment_date,
        notes: formData.notes || undefined,
      });
      onSubmit();
      onClose();
    } catch {
      // surface error via global message in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-100 to-blue-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <PencilSquareIcon className="h-6 w-6 text-indigo-600" />
              تعديل دفعة عميل
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all">
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6" dir="rtl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العميل</label>
                <SearchableSelect options={clientOptions} value={formData.client_id} onChange={(v) => handleChange('client_id', v)} placeholder="اختر العميل..." className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الخزنة</label>
                <SearchableSelect options={safeOptions} value={formData.safe_id} onChange={(v) => handleChange('safe_id', v)} placeholder="اختر الخزنة..." className="w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
                <SearchableSelect options={methodOptions} value={formData.payment_method_id} onChange={(v) => handleChange('payment_method_id', v)} placeholder="اختر الطريقة..." className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ ({symbol})</label>
                <NumberInput value={formData.amount} onChange={(v) => handleChange('amount', v)} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
                <input type="date" value={formData.payment_date} onChange={(e) => handleChange('payment_date', e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <input type="text" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="اختياري" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateClientPaymentForm;
