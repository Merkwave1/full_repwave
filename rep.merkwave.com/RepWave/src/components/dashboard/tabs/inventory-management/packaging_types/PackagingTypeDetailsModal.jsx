// src/components/dashboard/tabs/inventory-management/packaging_types/PackagingTypeDetailsModal.jsx
import React from 'react';
import Modal from '../../../../common/Modal/Modal'; // Assuming you have a reusable Modal component

function PackagingTypeDetailsModal({ isOpen, onClose, packagingType }) {
  if (!isOpen || !packagingType) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل نوع التعبئة" dir="rtl">
      <div className="p-4 text-right">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="col-span-full border-b pb-2 mb-2">
            <p className="font-semibold text-gray-800 text-lg">{packagingType.packaging_types_name}</p>
            <p className="text-gray-600 max-h-24 overflow-y-auto custom-scrollbar">
              {packagingType.packaging_types_description || 'لا يوجد وصف.'}
            </p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">معرف نوع التعبئة:</span>
            <span className="text-gray-900">{packagingType.packaging_types_id}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">اسم نوع التعبئة:</span>
            <span className="text-gray-900">{packagingType.packaging_types_name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">معامل التحويل الافتراضي:</span>
            <span className="text-gray-900">{packagingType.packaging_types_default_conversion_factor || '–'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الوحدة المتوافقة:</span>
            <span className="text-gray-900">{packagingType.compatible_base_unit_name || '–'}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default PackagingTypeDetailsModal;
