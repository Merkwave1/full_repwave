import React from 'react';
import {
  BuildingStorefrontIcon,
  HashtagIcon,
  TagIcon,
  UserIcon,
  PhoneIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSectionClass,
  modalSectionHeaderClass,
} from '../../../../common/AppModalShell.jsx';

function DetailCard({ icon: Icon, label, value, highlight = false }) {
  return (
    <div className={`${modalSectionClass} flex items-start gap-3`}>
      <div className="shrink-0 p-2.5 rounded-xl bg-[#EDE7FF] text-[#6B45B0] ring-1 ring-[#C4A8F0]/40">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        <p className={`font-semibold break-words ${highlight ? 'text-[#2D1B69] text-lg' : 'text-gray-900'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function WarehouseDetailsModal({ isOpen, onClose, warehouse }) {
  if (!isOpen || !warehouse) return null;

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="تفاصيل المخزن"
      subtitle={warehouse.warehouse_name}
      icon={BuildingStorefrontIcon}
      size="lg"
      gradient="brand"
      portal
      footer={
        <div className="flex justify-center">
          <button type="button" onClick={onClose} className={modalPrimaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={`${modalSectionClass} bg-gradient-to-l from-[#F5F0FF] to-white border-[#C4A8F0]/30`}>
          <div className={modalSectionHeaderClass}>نظرة عامة</div>
          <p className="text-xl font-bold text-[#2D1B69]">{warehouse.warehouse_name}</p>
          <p className="text-gray-600 mt-1 leading-relaxed">
            {warehouse.warehouse_address || 'لا يوجد عنوان مسجل.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailCard icon={HashtagIcon} label="معرف المخزن" value={warehouse.warehouse_id} />
          <DetailCard icon={TagIcon} label="كود المخزن" value={warehouse.warehouse_code} />
          <DetailCard icon={BuildingStorefrontIcon} label="نوع المخزن" value={warehouse.warehouse_type} />
          <DetailCard icon={UserIcon} label="الشخص المسؤول" value={warehouse.warehouse_contact_person} />
          <DetailCard icon={PhoneIcon} label="هاتف المخزن" value={warehouse.warehouse_phone} />
          <DetailCard
            icon={SignalIcon}
            label="الحالة"
            value={warehouse.warehouse_status}
            highlight
          />
        </div>
      </div>
    </AppModalShell>
  );
}

export default WarehouseDetailsModal;
