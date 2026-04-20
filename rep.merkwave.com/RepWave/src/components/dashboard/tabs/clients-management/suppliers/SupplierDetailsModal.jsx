// src/components/dashboard/tabs/clients-management/suppliers/SupplierDetailsModal.jsx
import React from "react";
import {
  InformationCircleIcon,
  Bars3BottomLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
  XMarkIcon,
  IdentificationIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// Reusable DetailItem component (new style)
const DetailItem = ({
  icon,
  label,
  value,
  valueClassName = "text-[#1F2937]",
}) => (
  <div
    className="
    flex items-start gap-3
    p-3 rounded-xl
    bg-white
    border border-gray-200
    hover:shadow-sm
    transition
  "
  >
    <div
      className="
      shrink-0 mt-0.5
      p-2 rounded-lg
      bg-[#8DD8F5]/20
      text-[#8DD8F5]
    "
    >
      {React.cloneElement(icon, { className: "h-5 w-5" })}
    </div>

    <div className="flex flex-col flex-1 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#1F2937]/60">
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

// Assuming Modal component is defined elsewhere or will be defined here
const Modal = ({
  isOpen,
  dir = "rtl",
  modalWidthClass = "max-w-2xl",
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex justify-center items-center p-2 sm:p-4 z-50">
      <div
        className={`bg-white rounded-2xl shadow-2xl p-0 ${modalWidthClass} w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col`}
        dir={dir}
      >
        {children}
      </div>
    </div>
  );
};

function SupplierDetailsModal({ isOpen, onClose, supplier }) {
  if (!isOpen || !supplier) return null;

  // Derived quick stats (placeholders for future expansions)
  const stats = [
    {
      label: "المعرف",
      value: supplier.supplier_id,
      icon: <IdentificationIcon />,
    },
    {
      label: "الحساب",
      value: parseFloat(supplier.supplier_balance || 0).toLocaleString(
        "en-US",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      ),
      icon: <ClipboardDocumentListIcon />,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل المورد"
      dir="rtl"
      modalWidthClass="max-w-4xl"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-t-xl">
        <div className="absolute inset-0 bg-gradient-to-l from-[#1F2937] to-[#2c3a4f]" />
        <div className="absolute inset-0 bg-[#8DD8F5] opacity-10" />

        <div className="relative p-4 sm:p-6 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-[#8DD8F5]/20 rounded-xl backdrop-blur">
                <Bars3BottomLeftIcon className="h-5 w-5 sm:h-7 sm:w-7 text-[#8DD8F5]" />
              </div>

              <h3 className="text-base sm:text-2xl font-black text-white tracking-tight">
                {supplier.supplier_name || "مورد بدون اسم"}
              </h3>
            </div>

            <p className="text-sm text-[#8DD8F5]/80">تفاصيل وبيانات المورد</p>
          </div>

          <button
            onClick={onClose}
            className="
            w-10 h-10
            rounded-full
            flex items-center justify-center
            text-white/80
            hover:bg-[#8DD8F5]
            hover:text-[#1F2937]
            transition-all
          "
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row flex-grow min-h-0 overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <aside className="lg:w-64 w-full border-b lg:border-b-0 lg:border-l border-gray-200 bg-white p-3 sm:p-4 flex-shrink-0 overflow-y-auto">
          <h4 className="text-sm font-bold text-[#1F2937] mb-4">ملخص سريع</h4>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="
                p-4 rounded-xl
                bg-[#8DD8F5]/10
                border border-[#8DD8F5]/20
                hover:shadow-sm
                transition
              "
              >
                <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-[#1F2937]">
                  {React.cloneElement(s.icon, {
                    className: "h-4 w-4 text-[#8DD8F5]",
                  })}
                  {s.label}
                </div>
                <div className="text-sm font-bold text-[#1F2937] break-words">
                  {s.value ?? "—"}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-10">
            <div className="space-y-5">
              <h5 className="text-sm font-extrabold tracking-wide text-[#1F2937]/60 uppercase flex items-center gap-2">
                <InformationCircleIcon className="h-5 w-5 text-[#8DD8F5]" />
                بيانات أساسية
              </h5>

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

            <div className="space-y-5">
              <h5 className="text-sm font-extrabold tracking-wide text-[#1F2937]/60 uppercase flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-[#8DD8F5]" />
                العنوان والملاحظات
              </h5>

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

          {/* Activity */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <h5 className="text-sm font-extrabold tracking-wide text-[#1F2937]/60 uppercase mb-4 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-[#8DD8F5]" />
              نشاط
            </h5>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex justify-end">
        <button
          onClick={onClose}
          className="
          w-full sm:w-auto px-4 py-3 sm:px-6 sm:py-2.5
          rounded-xl
          bg-[#8DD8F5]
          hover:bg-[#7ccfee]
          text-[#1F2937]
          font-semibold
          shadow-sm
          transition
        "
        >
          إغلاق
        </button>
      </div>
    </Modal>
  );
}

export default SupplierDetailsModal;
