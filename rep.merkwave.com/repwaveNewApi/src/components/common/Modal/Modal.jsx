import React from "react";
import { X } from "lucide-react";

function Modal({
  isOpen,
  onClose,
  title,
  children,
  modalWidthClass,
  actions,
  size = "medium",
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-lg",
    large: "max-w-4xl",
    xlarge: "max-w-6xl",
    full: "max-w-7xl",
  };
  const widthClass = modalWidthClass || sizeClasses[size] || sizeClasses.medium;

  return (
    <div
      className="fixed inset-0 backdrop-blur-[6px] bg-black/55 flex items-center justify-center z-50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-[0_25px_60px_-10px_rgba(139,95,214,0.30)] w-full relative flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-purple-100/60 animate-modal-in ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header — brand gradient */}
        <div
          className="px-5 sm:px-7 py-4 sm:py-5 shrink-0"
          style={{
            background: "linear-gradient(135deg, #8B5FD6 0%, #F97366 100%)",
          }}
        >
          <div className="flex justify-between items-center gap-3">
            <h3 className="text-base sm:text-lg font-bold text-white truncate">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {actions && (
            <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
          )}
        </div>

        {/* Body */}
        <div className="modal-body p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
