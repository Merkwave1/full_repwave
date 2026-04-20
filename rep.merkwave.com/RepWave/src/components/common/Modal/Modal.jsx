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
      className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose} // Close modal when clicking outside
    >
      {/* Modal content area */}
      <div
        // Use widthClass for the modal width
        className={`bg-white rounded-xl shadow-2xl w-full relative transform transition-all duration-300 ease-out scale-100 opacity-100 flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden ${widthClass}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing the modal
        dir="rtl" // Set direction to RTL for Arabic content
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#02415A] text-white rounded-t-xl shrink-0">
          {/* Title row + close button */}
          <div className="flex justify-between items-center">
            <h3 className="text-base sm:text-xl font-bold truncate pl-2">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          </div>
          {/* Actions row (separate line) */}
          {actions && (
            <div className="mt-2 flex flex-wrap gap-2">{actions}</div>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body p-3 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {children} {/* Render content passed as children */}
        </div>
      </div>
    </div>
  );
}

export default Modal;
