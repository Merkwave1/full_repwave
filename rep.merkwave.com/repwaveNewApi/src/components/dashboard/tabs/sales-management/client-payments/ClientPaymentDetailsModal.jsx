// src/components/dashboard/tabs/sales-management/client-payments/ClientPaymentDetailsModal.jsx
import React from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import AppModalShell, { modalSecondaryBtnClass } from '../../../../common/AppModalShell.jsx';
import { formatCurrency } from '../../../../../utils/currency';

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
  </div>
);

const ClientPaymentDetailsModal = ({
  onClose,
  payment,
  clients = [],
  safes = [],
  paymentMethods = [],
}) => {
  if (!payment) return null;

  const findLabel = (list, id, idKey, labelKey) => {
    const item = (list || []).find((i) => (i[idKey] || i.id) == id);
    return item ? item[labelKey] || item.name : id;
  };

  const clientName = findLabel(
    clients,
    payment.client_payments_client_id || payment.client_id,
    'clients_id',
    'clients_company_name',
  );
  const safeName = findLabel(
    safes,
    payment.client_payments_safe_id || payment.safe_id,
    'safes_id',
    'safes_name',
  );
  const methodName = findLabel(
    paymentMethods,
    payment.client_payments_method_id || payment.payment_method_id,
    'payment_methods_id',
    'payment_methods_name',
  );

  return (
    <AppModalShell
      open
      onClose={onClose}
      title="تفاصيل دفعة عميل"
      subtitle={clientName ? String(clientName) : undefined}
      icon={BanknotesIcon}
      size="md"
      gradient="green"
      zIndex="z-[9999]"
      portal
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <Row label="العميل" value={clientName} />
        <Row label="الخزنة" value={safeName} />
        <Row label="طريقة الدفع" value={methodName} />
        <Row
          label="المبلغ"
          value={formatCurrency(payment.client_payments_amount || payment.amount || 0)}
        />
        <Row
          label="التاريخ"
          value={(payment.client_payments_date || payment.payment_date || '').slice(0, 10)}
        />
        <Row label="ملاحظات" value={payment.client_payments_notes || payment.notes} />
        <Row label="المعرف" value={payment.client_payments_id || payment.id} />
      </div>
    </AppModalShell>
  );
};

export default ClientPaymentDetailsModal;
