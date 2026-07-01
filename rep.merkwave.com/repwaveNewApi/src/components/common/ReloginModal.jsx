// src/components/common/ReloginModal.jsx
import React from 'react';
import AppModalShell, { modalPrimaryBtnClass } from './AppModalShell.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ReloginModal = () => {
  const { isReloginModalOpen, hideReloginModal, handleRelogin } = useAuth();

  return (
    <AppModalShell
      open={isReloginModalOpen}
      onClose={hideReloginModal}
      title="انتهت صلاحية الجلسة"
      subtitle="يرجى تسجيل الدخول مرة أخرى للمتابعة"
      icon={ExclamationTriangleIcon}
      gradient="danger"
      size="sm"
      closeOnBackdrop={false}
      footer={
        <div className="flex justify-center">
          <button type="button" onClick={handleRelogin} className={modalPrimaryBtnClass}>
            تسجيل الدخول مجدداً
          </button>
        </div>
      }
    >
      <div className="text-center space-y-3" dir="rtl">
        <div className="flex justify-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-[#8B5FD6]" />
        </div>
        <p className="text-gray-600 text-sm">
          لقد انتهت صلاحية جلسة المستخدم الخاصة بك. يرجى تسجيل الدخول مرة أخرى للمتابعة.
        </p>
      </div>
    </AppModalShell>
  );
};

export default ReloginModal;
