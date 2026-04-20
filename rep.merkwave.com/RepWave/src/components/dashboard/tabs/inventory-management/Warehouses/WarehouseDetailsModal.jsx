// src/components/dashboard/tabs/product-management/WarehouseDetailsModal.js
import React from 'react';
import Modal from '../../../../common/Modal/Modal'; // Assuming you have a reusable Modal component

function WarehouseDetailsModal({ isOpen, onClose, warehouse }) {
  if (!isOpen || !warehouse) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل المخزن" dir="rtl">
      <div className="p-4 text-right">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="col-span-full border-b pb-2 mb-2">
            <p className="font-semibold text-gray-800 text-lg">{warehouse.warehouse_name}</p>
            {/* Description field, made scrollable if long */}
            <p className="text-gray-600 max-h-24 overflow-y-auto custom-scrollbar">
              {warehouse.warehouse_address || 'لا يوجد عنوان.'}
            </p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">معرف المخزن:</span>
            <span className="text-gray-900">{warehouse.warehouse_id}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">اسم المخزن:</span>
            <span className="text-gray-900">{warehouse.warehouse_name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">نوع المخزن:</span>
            <span className="text-gray-900">{warehouse.warehouse_type}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">كود المخزن:</span>
            <span className="text-gray-900">{warehouse.warehouse_code}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الشخص المسؤول:</span>
            <span className="text-gray-900">{warehouse.warehouse_contact_person || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">هاتف المخزن:</span>
            <span className="text-gray-900">{warehouse.warehouse_phone || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الحالة:</span>
            <span className="text-gray-900">{warehouse.warehouse_status}</span>
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

export default WarehouseDetailsModal;
