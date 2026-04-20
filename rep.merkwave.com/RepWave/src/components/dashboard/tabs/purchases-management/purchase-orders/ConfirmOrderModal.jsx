// src/components/dashboard/tabs/purchases-management/purchase-orders/ConfirmOrderModal.jsx
import React from 'react';
import Modal from '../../../../common/Modal/Modal'; // Assuming you have a generic Modal component
import Button from '../../../../common/Button/Button'; // Assuming you have a generic Button component

function ConfirmOrderModal({ isOpen, onClose, onConfirm, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تأكيد أمر الشراء">
      <div dir="rtl">
  <p className="mb-4 text-sm text-gray-700 whitespace-pre-line">{message}</p>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
          <Button
            type="button"
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            تأكيد
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmOrderModal;
