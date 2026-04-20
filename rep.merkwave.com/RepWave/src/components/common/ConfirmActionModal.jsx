// src/components/common/ConfirmActionModal.jsx
import React from 'react';
import Modal from './Modal/Modal'; // Assuming your Modal component is in src/components/common/Modal/Modal

/**
 * A generic confirmation modal for user actions.
 * @param {Object} props - The component props.
 * @param {boolean} props.isOpen - Whether the modal is open.
 * @param {function(): void} props.onClose - Callback to close the modal.
 * @param {function(): void} props.onConfirm - Callback to execute the action when confirmed.
 * @param {string} props.message - The message to display in the modal.
 * @param {string} [props.confirmButtonText='تأكيد'] - Text for the confirm button.
 * @param {string} [props.cancelButtonText='إلغاء'] - Text for the cancel button.
 * @param {boolean} [props.isDestructive=false] - If true, styles the confirm button as destructive (red).
 */
export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmButtonText = 'تأكيد',
  cancelButtonText = 'إلغاء',
  isDestructive = false,
}) {
  if (!isOpen) return null;

  const confirmButtonClasses = `
    px-5 py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white
    ${isDestructive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
    focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out
  `;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تأكيد الإجراء">
      <div className="p-6 text-center" dir="rtl">
        <p className="text-lg text-gray-700 mb-6 whitespace-pre-line">
          {message}
        </p>
        <div className="flex justify-center space-x-4 space-x-reverse">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmButtonClasses}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
