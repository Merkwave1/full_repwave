// src/components/common/ConfirmActionModal.jsx
import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AppModalShell, { modalPrimaryBtnClass, modalSecondaryBtnClass } from './AppModalShell.jsx';

export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmButtonText = 'تأكيد',
  cancelButtonText = 'إلغاء',
  isDestructive = false,
}) {
  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="تأكيد الإجراء"
      icon={ExclamationTriangleIcon}
      size="sm"
      gradient={isDestructive ? 'danger' : 'brand'}
      portal
      bodyClassName="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-white"
      footer={
        <div className="flex justify-center gap-3">
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${modalPrimaryBtnClass} ${isDestructive ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            {confirmButtonText}
          </button>
        </div>
      }
    >
      <p className="text-lg text-gray-700 text-center whitespace-pre-line leading-relaxed">
        {message}
      </p>
    </AppModalShell>
  );
}
