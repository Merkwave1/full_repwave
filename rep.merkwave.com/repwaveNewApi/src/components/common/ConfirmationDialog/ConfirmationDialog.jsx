import React from 'react';
import Modal from '../Modal/Modal.jsx';
import { modalPrimaryBtnClass, modalSecondaryBtnClass } from '../AppModalShell.jsx';

/**
 * ConfirmationDialog
 */
export default function ConfirmationDialog({
  isOpen,
  title = 'تأكيد',
  message = '',
  onConfirm,
  onCancel,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  danger = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="small"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${modalPrimaryBtnClass} ${danger ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <div className="text-[#2D1B69]/80 leading-relaxed">{message}</div>
    </Modal>
  );
}
