// src/components/common/Button/Button.js
// This component provides a reusable button styled with Tailwind CSS.
// It accepts children for its text, a className for additional styling,
// and other standard button props.
// This file should be saved as Button.jsx in your local project.
import React, { useRef, useCallback } from 'react';

function Button({ children, className = '', isLoading, disabled, preventDoubleClick = true, onClick, ...props }) {
  const isDisabled = Boolean(isLoading) || Boolean(disabled);
  const lastClickRef = useRef(0);

  const handleClick = useCallback((e) => {
    if (preventDoubleClick) {
      const now = Date.now();
      if (now - lastClickRef.current < 800) {
        // Ignore rapid double clicks within 800ms
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      lastClickRef.current = now;
    }
    onClick?.(e);
  }, [onClick, preventDoubleClick]);
  return (
    <button
      className={`px-6 py-3 rounded-lg font-semibold text-white ${isDisabled ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200 ${className}`}
  disabled={isDisabled}
  onClick={handleClick}
      {...props}
    >
      {isLoading ? 'جارٍ التحميل...' : children}
    </button>
  );
}

export default Button;
