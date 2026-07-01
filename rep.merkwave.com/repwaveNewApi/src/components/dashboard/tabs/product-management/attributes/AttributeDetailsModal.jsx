// src/components/dashboard/tabs/product-management/attributes/AttributeDetailsModal.jsx
import React from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import AppModalShell, { modalPrimaryBtnClass, modalSectionClass } from "../../../../common/AppModalShell.jsx";

function AttributeDetailsModal({ isOpen, onClose, attribute }) {
  if (!isOpen || !attribute) return null;

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="تفاصيل الخاصية"
      subtitle={attribute.attribute_name}
      icon={AdjustmentsHorizontalIcon}
      size="lg"
      footer={
        <div className="flex justify-center">
          <button type="button" onClick={onClose} className={modalPrimaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={`${modalSectionClass} p-4`}>
          <p className="text-xl font-semibold text-[#2D1B69]">{attribute.attribute_name}</p>
          <div className="mt-2 h-1 w-14 bg-[#C4A8F0] rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className={`${modalSectionClass} p-4`}>
            <p className="text-gray-500 text-xs mb-1">معرف الخاصية</p>
            <p className="text-lg font-semibold text-[#2D1B69]">{attribute.attribute_id}</p>
          </div>
          <div className={`${modalSectionClass} p-4`}>
            <p className="text-gray-500 text-xs mb-1">اسم الخاصية</p>
            <p className="text-lg font-semibold text-[#2D1B69]">{attribute.attribute_name}</p>
          </div>
        </div>

        <div className={`${modalSectionClass} p-4`}>
          <p className="text-sm font-medium text-gray-600 mb-3">القيم</p>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(attribute.attribute_values) && attribute.attribute_values.length > 0 ? (
              attribute.attribute_values.map((value, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium text-[#2D1B69] bg-[#EDE7FF] border border-[#C4A8F0]/40"
                >
                  {value}
                </span>
              ))
            ) : (
              <span className="text-gray-400">لا توجد قيم لهذه الخاصية.</span>
            )}
          </div>
        </div>
      </div>
    </AppModalShell>
  );
}

export default AttributeDetailsModal;
