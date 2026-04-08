import React from 'react';
import { X } from 'lucide-react'; // Import the close icon

function Modal({ isOpen, onClose, title, children, modalWidthClass, actions, size = 'medium' }) {
  if (!isOpen) return null; // Don't render if the modal is not open

  // Size presets
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-4xl',
    xlarge: 'max-w-6xl',
    full: 'max-w-7xl'
  };

  // Use modalWidthClass if provided, otherwise use size preset
  const widthClass = modalWidthClass || sizeClasses[size] || sizeClasses.medium;

  return (
    // Overlay for the modal (dark background)
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close modal when clicking outside
    >
      {/* Modal content area */}
      <div
        // Use widthClass for the modal width
        className={`bg-white rounded-xl shadow-2xl w-full relative transform transition-all duration-300 ease-out scale-100 opacity-100 ${widthClass}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing the modal
        dir="rtl" // Set direction to RTL for Arabic content
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-t-xl">
          <h3 className="text-xl font-bold">{title}</h3>
          <div className="flex items-center gap-3">
            {actions && <div className="ml-2">{actions}</div>}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body p-6">
          {children} {/* Render content passed as children */}
        </div>
      </div>
    </div>
  );
}

export default Modal;
