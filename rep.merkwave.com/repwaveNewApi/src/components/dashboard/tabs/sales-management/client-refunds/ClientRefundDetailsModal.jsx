// src/components/dashboard/tabs/sales-management/client-refunds/ClientRefundDetailsModal.jsx
import React, { useMemo } from 'react';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import AppModalShell, { modalSecondaryBtnClass } from '../../../../common/AppModalShell.jsx';

const ClientRefundDetailsModal = ({
  onClose,
  refund,
  clients = [],
  safes = [],
  paymentMethods = [],
}) => {
  const clientMap = useMemo(() => {
    const map = new Map();
    (clients || []).forEach((c) =>
      map.set(
        String(c.clients_id || c.id),
        c.clients_company_name || c.company_name || c.name,
      ),
    );
    return map;
  }, [clients]);
  const safeMap = useMemo(() => {
    const map = new Map();
    (safes || []).forEach((s) => map.set(String(s.safes_id), s.safes_name));
    return map;
  }, [safes]);
  const methodMap = useMemo(() => {
    const map = new Map();
    (paymentMethods || []).forEach((m) =>
      map.set(
        String(m.payment_methods_id || m.id),
        m.payment_methods_name || m.name,
      ),
    );
    return map;
  }, [paymentMethods]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString || '-';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const clientName =
    clientMap.get(String(refund.client_refunds_client_id || refund.client_id)) ||
    refund.client_name ||
    '-';

  const fields = [
    { label: 'العميل', value: clientName },
    {
      label: 'الخزنة',
      value:
        safeMap.get(String(refund.client_refunds_safe_id || refund.safe_id)) ||
        refund.safe_name ||
        '-',
    },
    {
      label: 'طريقة الدفع',
      value:
        methodMap.get(
          String(refund.client_refunds_method_id || refund.payment_method_id),
        ) ||
        refund.payment_method_name ||
        '-',
    },
    {
      label: 'التاريخ',
      value: formatDate(refund.client_refunds_date || refund.refund_date),
    },
    {
      label: 'المبلغ',
      value: formatCurrency(refund.client_refunds_amount || refund.amount),
    },
    {
      label: 'ملاحظات',
      value: refund.client_refunds_notes || refund.notes || 'لا توجد',
    },
  ];

  if (!refund) return null;

  return (
    <AppModalShell
      open
      onClose={onClose}
      title="تفاصيل استرداد عميل"
      subtitle={clientName !== '-' ? String(clientName) : undefined}
      icon={ArrowUturnLeftIcon}
      size="md"
      gradient="amber"
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
      <div className="space-y-4">
        {fields.map((f, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-600 font-medium">{f.label}</span>
            <span className="text-gray-900">{f.value}</span>
          </div>
        ))}
      </div>
    </AppModalShell>
  );
};

export default ClientRefundDetailsModal;
