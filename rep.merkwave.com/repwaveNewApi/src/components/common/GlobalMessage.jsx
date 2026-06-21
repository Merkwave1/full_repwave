// src/components/common/GlobalMessage.js
import React, { useEffect, useState } from 'react';

function GlobalMessage({ message, onClear }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClear(); // Clear the message after a delay
      }, 5000); // Message visible for 5 seconds
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message, onClear]);

  if (!isVisible || !message) return null;

  // Support both string and object shapes for backward compatibility
  const isObjectMessage = typeof message === 'object' && message !== null;
  const displayText = isObjectMessage ? (message.message || '') : String(message || '');
  const messageType = isObjectMessage ? (message.type || 'success') : 'success';
  const messageTypeClass = messageType === 'error' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] p-4 rounded-lg shadow-lg text-white text-center transition-all duration-300 ease-in-out transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${messageTypeClass}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <span>{displayText}</span>
        <button onClick={onClear} className="ml-4 text-white hover:text-gray-200 focus:outline-none">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default GlobalMessage;
