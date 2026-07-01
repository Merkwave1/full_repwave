import React, { useEffect, useCallback, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import AppModalShell, { modalSecondaryBtnClass } from "./AppModalShell.jsx";

export default function ImagePreviewModal({
  open,
  onClose,
  src,
  title = "معاينة الصورة",
}) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayTimer, setOverlayTimer] = useState(null);
  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, handleKey]);

  if (!open || !src) return null;

  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(src.split("?")[0]);

  return (
    <AppModalShell
      open={open}
      onClose={onClose}
      title={title}
      icon={PhotoIcon}
      size="2xl"
      bodyClassName="p-4 bg-[#FAFAFE] flex items-center justify-center max-h-[80vh] select-none"
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      {isImage ? (
        <div className="relative">
          <img
            src={src}
            alt={title}
            className={`max-h-[70vh] max-w-full object-contain rounded select-none ${showOverlay ? "pointer-events-none opacity-40" : "cursor-default"}`}
            draggable={false}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowOverlay(true);
              if (overlayTimer) clearTimeout(overlayTimer);
              const t = setTimeout(() => setShowOverlay(false), 1400);
              setOverlayTimer(t);
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          {showOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white text-sm font-medium bg-black/70 rounded animate-fade-in">
              <div>الحفظ من زر الفأرة الأيمن فقط</div>
              <div className="mt-1 text-[11px] text-gray-300">Left Click معطل</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-600 text-sm py-8">
          لا يمكن معاينة هذا النوع من الملفات
        </div>
      )}
    </AppModalShell>
  );
}
