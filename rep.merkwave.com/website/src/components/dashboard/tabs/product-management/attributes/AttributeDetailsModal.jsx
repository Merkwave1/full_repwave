// src/components/dashboard/tabs/product-management/attributes/AttributeDetailsModal.jsx
import React from 'react';
import Modal from '../../../../common/Modal/Modal'; // Assuming you have a reusable Modal component

function AttributeDetailsModal({ isOpen, onClose, attribute }) {
  if (!isOpen || !attribute) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل الخاصية" dir="rtl">
      <div className="p-4 text-right">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="col-span-full border-b pb-2 mb-2">
            <p className="font-semibold text-gray-800 text-lg">{attribute.attribute_name}</p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">معرف الخاصية:</span>
            <span className="text-gray-900">{attribute.attribute_id}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">اسم الخاصية:</span>
            <span className="text-gray-900">{attribute.attribute_name}</span>
          </div>
          <div className="col-span-full py-1">
            <span className="font-medium text-gray-700 block mb-2">القيم:</span>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(attribute.attribute_values) && attribute.attribute_values.length > 0 ? (
                attribute.attribute_values.map((value, index) => (
                  <span key={index} className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    {value}
                  </span>
                ))
              ) : (
                <span className="text-gray-600">لا توجد قيم لهذه الخاصية.</span>
              )}
            </div>
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

export default AttributeDetailsModal;
