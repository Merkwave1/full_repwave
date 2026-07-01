// src/components/dashboard/tabs/product-management/units/UnitDetailsModal.jsx
import React from 'react';
import { ScaleIcon } from '@heroicons/react/24/outline';
import AppModalShell, { modalPrimaryBtnClass, modalSectionClass } from '../../../../common/AppModalShell.jsx';

function UnitDetailsModal({ isOpen, onClose, unit }) {
  if (!isOpen || !unit) return null;

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="تفاصيل الوحدة"
      subtitle={unit.base_units_name}
      icon={ScaleIcon}
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
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="col-span-full border-b border-[#EDE7FF] pb-2 mb-2">
            <p className="font-semibold text-[#2D1B69] text-lg">{unit.base_units_name}</p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[#EDE7FF]">
            <span className="font-medium text-gray-700">معرف الوحدة:</span>
            <span className="text-gray-900">{unit.base_units_id}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#EDE7FF]">
            <span className="font-medium text-gray-700">اسم الوحدة:</span>
            <span className="text-gray-900">{unit.base_units_name}</span>
          </div>
        </div>
      </div>
    </AppModalShell>
  );
}

export default UnitDetailsModal;
