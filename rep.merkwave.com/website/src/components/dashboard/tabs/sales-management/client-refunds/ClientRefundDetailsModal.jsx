// src/components/dashboard/tabs/sales-management/client-refunds/ClientRefundDetailsModal.jsx
import React, { useMemo } from 'react';
import { XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';

const ClientRefundDetailsModal = ({ onClose, refund, clients = [], safes = [], paymentMethods = [] }) => {
  const clientMap = useMemo(() => {
    const map = new Map();
    (clients || []).forEach(c => map.set(String(c.clients_id || c.id), c.clients_company_name || c.company_name || c.name));
    return map;
  }, [clients]);
  const safeMap = useMemo(() => {
    const map = new Map();
    (safes || []).forEach(s => map.set(String(s.safes_id), s.safes_name));
    return map;
  }, [safes]);
  const methodMap = useMemo(() => {
    const map = new Map();
    (paymentMethods || []).forEach(m => map.set(String(m.payment_methods_id || m.id), m.payment_methods_name || m.name));
    return map;
  }, [paymentMethods]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString || '-';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fields = [
    { label: 'العميل', value: clientMap.get(String(refund.client_refunds_client_id || refund.client_id)) || refund.client_name || '-' },
    { label: 'الخزنة', value: safeMap.get(String(refund.client_refunds_safe_id || refund.safe_id)) || refund.safe_name || '-' },
    { label: 'طريقة الدفع', value: methodMap.get(String(refund.client_refunds_method_id || refund.payment_method_id)) || refund.payment_method_name || '-' },
    { label: 'التاريخ', value: formatDate(refund.client_refunds_date || refund.refund_date) },
    { label: 'المبلغ', value: formatCurrency(refund.client_refunds_amount || refund.amount) },
    { label: 'ملاحظات', value: refund.client_refunds_notes || refund.notes || 'لا توجد' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-100 to-blue-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <EyeIcon className="h-6 w-6 text-indigo-600" />
              تفاصيل مرتجع عميل
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all">
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6" dir="rtl">
          <div className="space-y-4">
            {fields.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-600 font-medium">{f.label}</span>
                <span className="text-gray-900">{f.value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-6">
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientRefundDetailsModal;
