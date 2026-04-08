// src/components/dashboard/tabs/product-management/categories/CategoryDetailsModal.js
import React from 'react';
import Modal from '../../../../common/Modal/Modal'; // Assuming you have a reusable Modal component

function CategoryDetailsModal({ isOpen, onClose, category }) {
  if (!isOpen || !category) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل الفئة" dir="rtl">
      <div className="p-4 text-right">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="col-span-full border-b pb-2 mb-2">
            <p className="font-semibold text-gray-800 text-lg">{category.categories_name}</p>
            {/* Description field, made scrollable if long */}
            <p className="text-gray-600 max-h-24 overflow-y-auto custom-scrollbar">
              {category.categories_description || 'لا يوجد وصف.'}
            </p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">معرف الفئة:</span>
            <span className="text-gray-900">{category.categories_id}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">اسم الفئة:</span>
            <span className="text-gray-900">{category.categories_name}</span>
          </div>
          {/* Add more fields if your backend API for single category retrieval provides them */}
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

export default CategoryDetailsModal;
