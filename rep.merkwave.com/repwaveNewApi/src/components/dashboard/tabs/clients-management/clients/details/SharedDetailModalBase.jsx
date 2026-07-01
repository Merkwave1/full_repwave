import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import AppModalShell from '../../../../../common/AppModalShell.jsx';

export default function SharedDetailModalBase({
  title,
  client,
  open,
  onClose,
  children,
  customHeaderButton,
}) {
  return (
    <AppModalShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={client?.clients_company_name || undefined}
      icon={DocumentTextIcon}
      size="2xl"
      gradient="purple"
      printClassName="detail-modal-print"
      headerActions={
        customHeaderButton || (
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white/20 hover:bg-white/30 text-white"
          >
            طباعة
          </button>
        )
      }
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            إغلاق
          </button>
        </div>
      }
    >
      <style>{`@media print { body * { visibility: hidden; } .detail-modal-print, .detail-modal-print * { visibility: visible; } .detail-modal-print { position:absolute; inset:0; height:auto; overflow:visible; box-shadow:none !important; border-radius:0 !important; } .no-print { display:none !important } }`}</style>
      <div className="space-y-4 text-xs md:text-sm">{children}</div>
    </AppModalShell>
  );
}
