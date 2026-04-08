// src/components/dashboard/tabs/clients-management/suppliers/SupplierDetailsModal.jsx
import React from 'react';
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
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

// Reusable DetailItem component (new style)
const DetailItem = ({ icon, label, value, valueClassName = 'text-slate-700' }) => (
  <div className="flex items-start gap-3 p-3 bg-gradient-to-tr from-slate-50 to-white rounded-lg border border-slate-200 group hover:shadow-sm transition-shadow">
    <div className="shrink-0 mt-0.5 p-2 rounded-md bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
      {React.cloneElement(icon, { className: 'h-5 w-5 text-indigo-600' })}
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-sm font-bold break-words leading-snug ${valueClassName}`}>{value ?? 'غير متوفر'}</span>
    </div>
  </div>
);

// Assuming Modal component is defined elsewhere or will be defined here
const Modal = ({ isOpen, dir = 'rtl', modalWidthClass = 'max-w-2xl', children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div
        className={`bg-white rounded-xl shadow-2xl p-6 ${modalWidthClass} w-full max-h-[90vh] overflow-hidden flex flex-col`}
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
    { label: 'المعرف', value: supplier.supplier_id, icon: <IdentificationIcon /> },
    { label: 'الحساب', value: parseFloat(supplier.supplier_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: <ClipboardDocumentListIcon /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل المورد" dir="rtl" modalWidthClass="max-w-4xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-t-xl">
        <div className="absolute inset-0 bg-gradient-to-l from-indigo-600 via-indigo-500 to-blue-500 opacity-90" />
        <div className="relative p-6 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur">
                <Bars3BottomLeftIcon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">{supplier.supplier_name || 'مورد بدون اسم'}</h3>
            </div>
            <p className="text-indigo-100 text-sm">تفاصيل وبيانات المورد</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row flex-grow overflow-hidden bg-slate-50">
        {/* Left sidebar stats */}
        <aside className="lg:w-64 w-full border-l border-slate-200 bg-white/60 backdrop-blur-sm p-4 flex-shrink-0">
          <h4 className="text-sm font-bold text-slate-600 mb-3">ملخص سريع</h4>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {stats.map(s => (
                <div key={s.label} className="p-3 rounded-lg bg-gradient-to-tr from-indigo-50 to-white border border-indigo-100">
                  <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-indigo-600">
                    {React.cloneElement(s.icon, { className: 'h-4 w-4' })}
                    {s.label}
                  </div>
                  <div className="text-sm font-bold text-slate-700 break-words">{s.value ?? '—'}</div>
                </div>
              ))}
            </div>
        </aside>

        {/* Main content scroll area */}
        <div className="flex-1 overflow-y-auto max-h-[65vh] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h5 className="text-sm font-extrabold tracking-wide text-slate-500 uppercase flex items-center gap-2"> 
                <InformationCircleIcon className="h-5 w-5 text-indigo-500" /> بيانات أساسية
              </h5>
              <DetailItem icon={<UserIcon />} label="اسم المورد" value={supplier.supplier_name || '—'} />
              <DetailItem icon={<UserIcon />} label="مسؤول الاتصال" value={supplier.supplier_contact_person || '—'} />
              <DetailItem icon={<PhoneIcon />} label="هاتف" value={supplier.supplier_phone || '—'} />
              <DetailItem icon={<EnvelopeIcon />} label="البريد الإلكتروني" value={supplier.supplier_email || '—'} />
            </div>
            <div className="space-y-4">
              <h5 className="text-sm font-extrabold tracking-wide text-slate-500 uppercase flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-indigo-500" /> العنوان والملاحظات
              </h5>
              <DetailItem icon={<MapPinIcon />} label="العنوان" value={supplier.supplier_address || '—'} />
              <DetailItem icon={<DocumentTextIcon />} label="ملاحظات" value={supplier.supplier_notes || '—'} />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h5 className="text-sm font-extrabold tracking-wide text-slate-500 uppercase mb-4 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-500" /> نشاط
            </h5>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gradient-to-l from-slate-100 to-white border-t border-slate-200 rounded-b-xl flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition-colors"
        >إغلاق</button>
      </div>
    </Modal>
  );
}

export default SupplierDetailsModal;
