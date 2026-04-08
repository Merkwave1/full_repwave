import React from 'react';

export default function SharedDetailModalBase({ title, client, open, onClose, children, customHeaderButton }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col detail-modal-print" dir="rtl">
        <style>{`@media print { body * { visibility: hidden; } .detail-modal-print, .detail-modal-print * { visibility: visible; } .detail-modal-print { position:absolute; inset:0; height:auto; overflow:visible; box-shadow:none !important; border-radius:0 !important; } .no-print { display:none !important } }`}</style>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-xl print:bg-white print:border-b-0 print:rounded-none">
          <h3 className="font-bold text-gray-800 text-sm md:text-base">{title}: <span className="text-indigo-600">{client?.clients_company_name}</span></h3>
          <div className="flex items-center gap-2">
            {customHeaderButton || (
              <button onClick={() => window.print()} className="no-print px-3 py-1.5 text-[11px] font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white">طباعة</button>
            )}
            <button onClick={onClose} className="no-print text-gray-500 hover:text-gray-700 text-sm">✕</button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto space-y-4 text-xs md:text-sm">
          {children}
        </div>
        <div className="px-5 py-3 border-t bg-gray-50 rounded-b-xl flex justify-end no-print">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
