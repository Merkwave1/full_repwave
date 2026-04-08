// src/components/dashboard/tabs/sales-management/client-payments/ClientPaymentDetailsModal.jsx
import React from 'react';
import { XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../../../../utils/currency';

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
  </div>
);

const ClientPaymentDetailsModal = ({ onClose, payment, clients = [], safes = [], paymentMethods = [] }) => {
  if (!payment) return null;

  const findLabel = (list, id, idKey, labelKey) => {
    const item = (list || []).find(i => (i[idKey] || i.id) == id);
    return item ? (item[labelKey] || item.name) : id;
  };

  const clientName = findLabel(clients, payment.client_payments_client_id || payment.client_id, 'clients_id', 'clients_company_name');
  const safeName = findLabel(safes, payment.client_payments_safe_id || payment.safe_id, 'safes_id', 'safes_name');
  const methodName = findLabel(paymentMethods, payment.client_payments_method_id || payment.payment_method_id, 'payment_methods_id', 'payment_methods_name');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BanknotesIcon className="h-6 w-6 text-emerald-600" />
              تفاصيل دفعة عميل
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all">
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6" dir="rtl">
          <div className="space-y-2">
            <Row label="العميل" value={clientName} />
            <Row label="الخزنة" value={safeName} />
            <Row label="طريقة الدفع" value={methodName} />
            <Row label="المبلغ" value={formatCurrency(payment.client_payments_amount || payment.amount || 0)} />
            <Row label="التاريخ" value={(payment.client_payments_date || payment.payment_date || '').slice(0, 10)} />
            <Row label="ملاحظات" value={payment.client_payments_notes || payment.notes} />
            <Row label="المعرف" value={payment.client_payments_id || payment.id} />
          </div>

          <div className="pt-6 flex justify-end">
            <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPaymentDetailsModal;
