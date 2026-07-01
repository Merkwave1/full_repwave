// src/components/dashboard/tabs/clients-management/suppliers/SupplierDetailsModal.jsx
import React from "react";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSectionClass,
  modalSectionHeaderClass,
} from "../../../../common/AppModalShell.jsx";
import {
  InformationCircleIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
  IdentificationIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";

const DetailItem = ({
  icon,
  label,
  value,
  valueClassName = "text-[#2D1B69]",
}) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#EDE7FF] hover:border-[#C4A8F0]/50 hover:shadow-sm transition">
    <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-[#EDE7FF] text-[#8B5FD6]">
      {React.cloneElement(icon, { className: "h-5 w-5" })}
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#8B5FD6]/80">
        {label}
      </span>
      <span
        className={`text-sm font-bold break-words leading-snug ${valueClassName}`}
      >
        {value ?? "غير متوفر"}
      </span>
    </div>
  </div>
);

function SupplierDetailsModal({ isOpen, onClose, supplier }) {
  if (!isOpen || !supplier) return null;

  const stats = [
    {
      label: "المعرف",
      value: supplier.supplier_id,
      icon: <IdentificationIcon />,
    },
    {
      label: "الحساب",
      value: parseFloat(supplier.supplier_balance || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      icon: <ClipboardDocumentListIcon />,
    },
  ];

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="تفاصيل المورد"
      subtitle={supplier.supplier_name || "مورد بدون اسم"}
      icon={BuildingStorefrontIcon}
      size="3xl"
      gradient="purple"
      footer={
        <div className="flex justify-center">
          <button type="button" onClick={onClose} className={modalPrimaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        <aside className="lg:w-64 w-full border-b lg:border-b-0 lg:border-l border-[#EDE7FF] bg-[#EDE7FF]/30 p-3 sm:p-4 flex-shrink-0 overflow-y-auto rounded-xl">
          <h4 className="text-sm font-bold text-[#2D1B69] mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4 text-[#8B5FD6]" />
            ملخص سريع
          </h4>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="p-4 rounded-xl bg-white border border-[#EDE7FF] hover:border-[#8B5FD6]/30 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-[#8B5FD6]">
                  {React.cloneElement(s.icon, { className: "h-4 w-4" })}
                  {s.label}
                </div>
                <div className="text-sm font-bold text-[#2D1B69] break-words">
                  {s.value ?? "—"}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto p-1 sm:p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className={`${modalSectionClass} overflow-hidden`}>
              <div className={modalSectionHeaderClass}>
                <InformationCircleIcon className="h-4 w-4 text-[#8B5FD6]" />
                <span className="text-sm font-semibold text-[#2D1B69]">بيانات أساسية</span>
              </div>
              <div className="px-4 pb-4 pt-3 space-y-3">
                <DetailItem
                  icon={<UserIcon />}
                  label="اسم المورد"
                  value={supplier.supplier_name || "—"}
                />
                <DetailItem
                  icon={<UserIcon />}
                  label="مسؤول الاتصال"
                  value={supplier.supplier_contact_person || "—"}
                />
                <DetailItem
                  icon={<PhoneIcon />}
                  label="هاتف"
                  value={supplier.supplier_phone || "—"}
                />
                <DetailItem
                  icon={<EnvelopeIcon />}
                  label="البريد الإلكتروني"
                  value={supplier.supplier_email || "—"}
                />
              </div>
            </div>

            <div className={`${modalSectionClass} p-0 space-y-0 overflow-hidden`}>
              <div className={modalSectionHeaderClass}>
                <MapPinIcon className="h-4 w-4 text-[#8B5FD6]" />
                <span className="text-sm font-semibold text-[#2D1B69]">العنوان والملاحظات</span>
              </div>
              <div className="px-4 pb-4 pt-3 space-y-3">
                <DetailItem
                  icon={<MapPinIcon />}
                  label="العنوان"
                  value={supplier.supplier_address || "—"}
                />
                <DetailItem
                  icon={<DocumentTextIcon />}
                  label="ملاحظات"
                  value={supplier.supplier_notes || "—"}
                />
              </div>
            </div>
          </div>

          <div className={modalSectionClass}>
            <div className={modalSectionHeaderClass}>
              <ClipboardDocumentListIcon className="h-4 w-4 text-[#8B5FD6]" />
              <span className="text-sm font-semibold text-[#2D1B69]">نشاط</span>
            </div>
            <div className="p-4 text-sm text-[#8B5FD6]/70 text-center">
              لا يوجد نشاط مسجل حالياً
            </div>
          </div>
        </div>
      </div>
    </AppModalShell>
  );
}

export default SupplierDetailsModal;
