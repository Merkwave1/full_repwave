// src/components/dashboard/tabs/users/UserDetailsModal.js
import React from 'react';
import Modal from '../../../common/Modal/Modal'; // Assuming you have a reusable Modal component

function UserDetailsModal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل المستخدم" dir="rtl">
      <div className="p-4 text-right">
        <div className="mb-4">
          {user.users_image ? (
            <img
              src={user.users_image}
              alt={user.users_name}
              className="w-32 h-32 object-cover rounded-full mx-auto mb-4 shadow-md"
              onError={(e) => e.target.src = 'https://placehold.co/128x128/cccccc/ffffff?text=No+Img'}
            />
          ) : (
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto flex items-center justify-center text-gray-500 mb-4 shadow-md">
              لا توجد صورة
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="col-span-full border-b pb-2 mb-2">
            <p className="font-semibold text-gray-800 text-lg">{user.users_name}</p>
            <p className="text-gray-600">{user.users_email || 'لا يوجد بريد إلكتروني.'}</p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الدور:</span>
            <span className="text-gray-900">{user.users_role || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الهاتف:</span>
            <span className="text-gray-900">{user.users_phone || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الرقم القومي:</span>
            <span className="text-gray-900">{user.users_national_id || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الحالة:</span>
            <span className="text-gray-900">{user.users_status === 1 ? 'نشط' : 'غير نشط'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">معرف المستخدم:</span>
            <span className="text-gray-900">{user.users_id}</span>
          </div>
          {/* Add more fields if your user data provides them */}
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

export default UserDetailsModal;
