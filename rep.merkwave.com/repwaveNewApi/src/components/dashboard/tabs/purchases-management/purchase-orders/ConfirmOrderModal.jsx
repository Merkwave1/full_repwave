// src/components/dashboard/tabs/purchases-management/purchase-orders/ConfirmOrderModal.jsx
import React from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import AppModalShell, { modalPrimaryBtnClass, modalSecondaryBtnClass } from '../../../../common/AppModalShell.jsx';

function ConfirmOrderModal({ isOpen, onClose, onConfirm, message, title = "تأكيد أمر الشراء" }) {
  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      portal
      zIndex="z-[10000]"
      title={title}
      icon={ClipboardDocumentCheckIcon}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            إلغاء
          </button>
          <button type="button" onClick={onConfirm} className={modalPrimaryBtnClass}>
            تأكيد
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-700 whitespace-pre-line" dir="rtl">{message}</p>
    </AppModalShell>
  );
}

export default ConfirmOrderModal;
