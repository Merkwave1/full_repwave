// src/components/common/ReloginModal.jsx
import React from 'react';
import Modal from './Modal/Modal.jsx';
import Button from './Button/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ReloginModal = () => {
  const { isReloginModalOpen, hideReloginModal, handleRelogin } = useAuth();

  return (
    <Modal 
      isOpen={isReloginModalOpen} 
      onClose={hideReloginModal}
      title="انتهت صلاحية الجلسة"
      showCloseButton={false}
    >
      <div className="text-center space-y-4" dir="rtl">
        <div className="flex justify-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-orange-500" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            انتهت صلاحية جلسة المستخدم
          </h3>
          <p className="text-gray-600">
            لقد انتهت صلاحية جلسة المستخدم الخاصة بك. يرجى تسجيل الدخول مرة أخرى للمتابعة.
          </p>
        </div>

        <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-4">
          <Button
            onClick={handleRelogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            تسجيل الدخول مجدداً
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReloginModal;
