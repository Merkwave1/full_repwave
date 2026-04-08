import React, { useEffect, useCallback, useState } from 'react';

// Reusable image preview modal (RTL friendly)
// Props: { open, onClose, src, title, downloadName }
export default function ImagePreviewModal({ open, onClose, src, title = 'معاينة الصورة' }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayTimer, setOverlayTimer] = useState(null);
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;
  if (!src) return null;

  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(src.split('?')[0]);

  // Download removed per user request: user will right-click the image

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden border border-gray-200" dir="rtl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800 text-sm md:text-base">{title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs md:text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100">إغلاق</button>
          </div>
        </div>
        <div className="p-4 bg-gray-100 flex items-center justify-center max-h-[80vh] select-none">
          {isImage ? (
            <div className="relative">
              <img
                src={src}
                alt={title}
                className={`max-h-[70vh] max-w-full object-contain rounded select-none ${showOverlay ? 'pointer-events-none opacity-40' : 'cursor-default'}`}
                draggable={false}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Show brief guidance overlay when user left-clicks (disabled action)
                  setShowOverlay(true);
                  if (overlayTimer) clearTimeout(overlayTimer);
                  const t = setTimeout(() => setShowOverlay(false), 1400);
                  setOverlayTimer(t);
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              {showOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white text-sm font-medium bg-black/70 rounded animate-fade-in">
                  <div>الحفظ من زر الفأرة الأيمن فقط</div>
                  <div className="mt-1 text-[11px] text-gray-300">Left Click معطل</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-600 text-sm">لا يمكن معاينة هذا النوع من الملفات</div>
          )}
        </div>
      </div>
    </div>
  );
}
