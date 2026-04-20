// src/components/common/Alert/Alert.js
// This component provides a reusable alert/message box.
// It can display success, error, or info messages with appropriate styling.
// This file should be saved as Alert.jsx in your local project.

import React, { useEffect, useState } from 'react';
import { Info, CheckCircle, XCircle, X } from 'lucide-react'; // Icons for different alert types

function Alert({ message, type = 'info', onClose, duration = 5000, className = '' }) {
  const [isVisible, setIsVisible] = useState(true);

  // Automatically hide the alert after a duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose(); // Call onClose callback if provided
      }, duration);
      return () => clearTimeout(timer); // Cleanup timer
    }
  }, [duration, onClose]);

  if (!isVisible || !message) return null;

  let bgColor, textColor, borderColor, Icon;

  switch (type) {
    case 'success':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      borderColor = 'border-green-400';
      Icon = CheckCircle;
      break;
    case 'error':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      borderColor = 'border-red-400';
      Icon = XCircle;
      break;
    case 'info':
    default:
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      borderColor = 'border-blue-400';
      Icon = Info;
      break;
  }

  return (
    <div
      className={`flex items-center p-4 rounded-lg border ${bgColor} ${textColor} ${borderColor} shadow-sm transition-opacity duration-300 ${className}`}
      role="alert"
      dir="rtl" // Set direction to RTL for Arabic content
    >
      {Icon && <Icon className="w-5 h-5 ml-3 rtl:mr-3 rtl:ml-0 flex-shrink-0" />} {/* Icon */}
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      {onClose && ( // Show close button only if onClose callback is provided
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="p-1 rounded-full hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-current ml-auto rtl:mr-auto rtl:ml-0"
          aria-label="إغلاق التنبيه"
        >
          <X className={`w-4 h-4 ${textColor}`} />
        </button>
      )}
    </div>
  );
}

export default Alert;
