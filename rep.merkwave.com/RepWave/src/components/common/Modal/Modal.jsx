import React from "react";
import { X } from "lucide-react"; // Import the close icon

function Modal({
  isOpen,
  onClose,
  title,
  children,
  modalWidthClass,
  actions,
  size = "medium",
}) {
  if (!isOpen) return null; // Don't render if the modal is not open

  // Size presets
  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-lg",
    large: "max-w-4xl",
    xlarge: "max-w-6xl",
    full: "max-w-7xl",
  };

  // Use modalWidthClass if provided, otherwise use size preset
  const widthClass = modalWidthClass || sizeClasses[size] || sizeClasses.medium;

  return (
    // Overlay for the modal (dark background)
    <div
      className="fixed inset-0 backdrop-blur-[6px] bg-black/50 flex items-center justify-center z-50 p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Modal content area */}
      <div
        className={`bg-white rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,0,0,0.35)] w-full relative flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-white/60 animate-modal-in ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-l from-[#02415A] to-[#025f84] text-white rounded-t-2xl shrink-0">
          {/* Title row + close button */}
          <div className="flex justify-between items-center gap-3">
            <h3 className="text-base sm:text-lg font-bold truncate">{title}</h3>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
          {/* Actions row (separate line) */}
          {actions && (
            <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
