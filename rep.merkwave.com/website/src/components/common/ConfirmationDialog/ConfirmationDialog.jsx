import React from 'react';
import Modal from '../Modal/Modal.jsx';

/**
 * ConfirmationDialog
 * Props:
 * - isOpen: boolean
 * - title: string
 * - message: string (can be JSX)
 * - onConfirm: function
 * - onCancel: function
 * - confirmText: string
 * - cancelText: string
 * - danger: boolean (if true, show red confirm button)
 */
export default function ConfirmationDialog({ isOpen, title = 'تأكيد', message = '', onConfirm, onCancel, confirmText = 'تأكيد', cancelText = 'إلغاء', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="small">
      <div className="text-gray-700">{message}</div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
        >
          {cancelText}
        </button>

        <button
          onClick={onConfirm}
          className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${danger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
