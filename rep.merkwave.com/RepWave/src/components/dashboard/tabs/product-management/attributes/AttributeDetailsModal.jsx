// src/components/dashboard/tabs/product-management/attributes/AttributeDetailsModal.jsx
import React from "react";
import Modal from "../../../../common/Modal/Modal"; // Assuming you have a reusable Modal component

function AttributeDetailsModal({ isOpen, onClose, attribute }) {
  if (!isOpen || !attribute) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل الخاصية" dir="rtl">
      <div className="relative p-4 sm:p-6 md:p-10 text-right bg-gradient-to-br from-white to-gray-50 rounded-3xl overflow-hidden">
        {/* Decorative Accent Glow */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#8DD8F5]/20 blur-3xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-8">
          {/* Premium Header Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <p className="text-2xl font-semibold text-[#1F2937] tracking-wide">
              {attribute.attribute_name}
            </p>
            <div className="mt-3 h-1 w-16 bg-[#8DD8F5] rounded-full"></div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition">
              <p className="text-gray-500 text-xs mb-1">معرف الخاصية</p>
              <p className="text-lg font-semibold text-[#1F2937]">
                {attribute.attribute_id}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition">
              <p className="text-gray-500 text-xs mb-1">اسم الخاصية</p>
              <p className="text-lg font-semibold text-[#1F2937]">
                {attribute.attribute_name}
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-4">القيم</p>

            <div className="flex flex-wrap gap-3">
              {Array.isArray(attribute.attribute_values) &&
              attribute.attribute_values.length > 0 ? (
                attribute.attribute_values.map((value, index) => (
                  <span
                    key={index}
                    className="
                  px-4 py-2
                  rounded-xl
                  text-sm font-medium
                  text-[#1F2937]
                  bg-gradient-to-r from-[#8DD8F5]/40 to-[#8DD8F5]/20
                  border border-[#8DD8F5]/40
                  shadow-sm
                  hover:scale-105
                  hover:shadow-md
                  transition-all duration-200
                "
                  >
                    {value}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">لا توجد قيم لهذه الخاصية.</span>
              )}
            </div>
          </div>

          {/* Premium Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={onClose}
              className="
            px-10 py-3
            rounded-xl
            font-semibold
            text-[#1F2937]
            bg-[#8DD8F5]
            shadow-lg shadow-[#8DD8F5]/40
            hover:shadow-xl
            hover:-translate-y-0.5
            hover:brightness-105
            transition-all duration-200
          "
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default AttributeDetailsModal;
