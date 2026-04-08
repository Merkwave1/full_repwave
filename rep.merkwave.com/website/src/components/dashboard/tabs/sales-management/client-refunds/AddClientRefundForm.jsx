// src/components/dashboard/tabs/sales-management/client-refunds/AddClientRefundForm.jsx
import React, { useMemo, useState } from 'react';
import { XMarkIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import { addClientRefund } from '../../../../../apis/client_refunds';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import useCurrency from '../../../../../hooks/useCurrency';

const AddClientRefundForm = ({ onClose, onSubmit, safes = [], clients = [], paymentMethods = [], extraHeaderRight }) => {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState({
    client_id: '',
    safe_id: '',
    payment_method_id: '',
    amount: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientOptions = useMemo(() => (clients || []).map(c => ({ value: c.clients_id || c.id, label: c.clients_company_name || c.company_name || c.name })), [clients]);
  const safeOptions = useMemo(() => (safes || []).map(s => ({ value: s.safes_id, label: `${s.safes_name}` })), [safes]);
  const methodOptions = useMemo(() => (paymentMethods || []).map(m => ({ value: m.payment_methods_id || m.id, label: m.payment_methods_name || m.name })), [paymentMethods]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData.client_id) e.client_id = 'العميل مطلوب';
    if (!formData.safe_id) e.safe_id = 'الخزنة مطلوبة';
    if (!formData.payment_method_id) e.payment_method_id = 'طريقة الدفع مطلوبة';
    if (!formData.amount || parseFloat(formData.amount) <= 0) e.amount = 'مبلغ صحيح مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Format current local datetime as YYYY-MM-DD HH:mm:ss
  const nowDateTimeForApi = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await addClientRefund({
        client_id: formData.client_id,
        safe_id: formData.safe_id,
        payment_method_id: formData.payment_method_id,
        amount: formData.amount,
        // send current date-time
        refund_date: nowDateTimeForApi(),
        notes: formData.notes || undefined,
      });
      onSubmit();
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || 'حدث خطأ أثناء إضافة المرتجع' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-100 to-blue-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ArrowUturnLeftIcon className="h-6 w-6 text-indigo-600" />
              إضافة مرتجع عميل
            </h3>
            <div className="flex items-center gap-3">
              {extraHeaderRight}
              <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all">
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6" dir="rtl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{errors.submit}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العميل <span className="text-red-500">*</span></label>
                <SearchableSelect options={clientOptions} value={formData.client_id} onChange={(v) => handleChange('client_id', v)} placeholder="اختر العميل..." className="w-full" />
                {errors.client_id && <p className="text-red-500 text-sm mt-1">{errors.client_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الخزنة <span className="text-red-500">*</span></label>
                <SearchableSelect options={safeOptions} value={formData.safe_id} onChange={(v) => handleChange('safe_id', v)} placeholder="اختر الخزنة..." className="w-full" />
                {errors.safe_id && <p className="text-red-500 text-sm mt-1">{errors.safe_id}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع <span className="text-red-500">*</span></label>
                <SearchableSelect options={methodOptions} value={formData.payment_method_id} onChange={(v) => handleChange('payment_method_id', v)} placeholder="اختر الطريقة..." className="w-full" />
                {errors.payment_method_id && <p className="text-red-500 text-sm mt-1">{errors.payment_method_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ ({symbol}) <span className="text-red-500">*</span></label>
                <NumberInput value={formData.amount} onChange={(v) => handleChange('amount', v)} placeholder="0.00" />
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
              <input type="text" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="اختياري" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ المرتجع'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClientRefundForm;
