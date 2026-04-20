// src/components/dashboard/tabs/users/UserDetailsModal.js
import React from "react";
import Modal from "../../../common/Modal/Modal"; // Assuming you have a reusable Modal component

function UserDetailsModal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل المستخدم" dir="rtl">
      <div className="p-2 sm:p-3 md:p-4 text-right">
        <div className="mb-3 sm:mb-4">
          {user.users_image ? (
            <img
              src={user.users_image}
              alt={user.users_name}
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-cover rounded-full mx-auto mb-3 sm:mb-4 shadow-md ring-4 ring-[#8DD8F5]/20"
              onError={(e) =>
                (e.target.src =
                  "https://placehold.co/128x128/cccccc/ffffff?text=No+Img")
              }
            />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gray-200 rounded-full mx-auto flex items-center justify-center text-gray-500 mb-3 sm:mb-4 shadow-md text-xs sm:text-sm">
              لا توجد صورة
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 text-xs sm:text-sm">
          <div className="col-span-full border-b pb-2 mb-1 sm:mb-2">
            <p className="font-semibold text-gray-800 text-base sm:text-lg">
              {user.users_name}
            </p>
            <p className="text-gray-600 text-xs sm:text-sm mt-0.5">
              {user.users_email || "لا يوجد بريد إلكتروني."}
            </p>
          </div>

          <div className="flex justify-between items-center py-1.5 sm:py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الدور:</span>
            <span className="text-gray-900">{user.users_role || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 sm:py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الهاتف:</span>
            <span className="text-gray-900">{user.users_phone || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 sm:py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الرقم القومي:</span>
            <span className="text-gray-900">
              {user.users_national_id || "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 sm:py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">الحالة:</span>
            <span className="text-gray-900">
              {user.users_status === 1 ? "نشط" : "غير نشط"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 sm:py-1 border-b border-gray-200">
            <span className="font-medium text-gray-700">معرف المستخدم:</span>
            <span className="text-gray-900">{user.users_id}</span>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-[#8DD8F5] text-black rounded-lg hover:bg-[#1F2937] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md text-sm sm:text-base"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default UserDetailsModal;
