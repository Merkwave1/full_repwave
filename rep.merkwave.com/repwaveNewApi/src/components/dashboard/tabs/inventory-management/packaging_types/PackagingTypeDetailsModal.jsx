// src/components/dashboard/tabs/inventory-management/packaging_types/PackagingTypeDetailsModal.jsx
import React from 'react';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import AppModalShell, { modalPrimaryBtnClass, modalSectionClass } from '../../../../common/AppModalShell.jsx';

function PackagingTypeDetailsModal({ isOpen, onClose, packagingType }) {
  if (!isOpen || !packagingType) return null;

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="تفاصيل نوع التعبئة"
      subtitle={packagingType.packaging_types_name}
      icon={ArchiveBoxIcon}
      size="lg"
      footer={
        <div className="flex justify-center">
          <button type="button" onClick={onClose} className={modalPrimaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      <div className={`${modalSectionClass} p-4 text-right`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="col-span-full border-b border-[#EDE7FF] pb-2 mb-2">
            <p className="font-semibold text-[#2D1B69] text-lg">{packagingType.packaging_types_name}</p>
            <p className="text-gray-600 max-h-24 overflow-y-auto custom-scrollbar">
              {packagingType.packaging_types_description || 'لا يوجد وصف.'}
            </p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[#EDE7FF]">
            <span className="font-medium text-gray-700">معرف نوع التعبئة:</span>
            <span className="text-gray-900">{packagingType.packaging_types_id}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#EDE7FF]">
            <span className="font-medium text-gray-700">اسم نوع التعبئة:</span>
            <span className="text-gray-900">{packagingType.packaging_types_name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#EDE7FF]">
            <span className="font-medium text-gray-700">معامل التحويل الافتراضي:</span>
            <span className="text-gray-900">{packagingType.packaging_types_default_conversion_factor || '–'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#EDE7FF]">
            <span className="font-medium text-gray-700">الوحدة المتوافقة:</span>
            <span className="text-gray-900">{packagingType.compatible_base_unit_name || '–'}</span>
          </div>
        </div>
      </div>
    </AppModalShell>
  );
}

export default PackagingTypeDetailsModal;
