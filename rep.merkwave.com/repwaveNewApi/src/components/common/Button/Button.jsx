// src/components/common/Button/Button.js
import React, { useRef, useCallback } from "react";

function Button({
  children,
  className = "",
  isLoading,
  disabled,
  preventDoubleClick = true,
  onClick,
  ...props
}) {
  const isDisabled = Boolean(isLoading) || Boolean(disabled);
  const lastClickRef = useRef(0);

  const handleClick = useCallback(
    (e) => {
      if (preventDoubleClick) {
        const now = Date.now();
        if (now - lastClickRef.current < 800) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        lastClickRef.current = now;
      }
      onClick?.(e);
    },
    [onClick, preventDoubleClick],
  );

  return (
    <button
      className={`px-3 py-2 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-semibold text-white
        ${isDisabled ? "opacity-50 cursor-not-allowed" : "rw-btn-gradient"}
        focus:outline-none focus:ring-2 focus:ring-[#8B5FD6]/50 focus:ring-offset-1
        transition-all duration-200 ${className}`}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? "جارٍ التحميل..." : children}
    </button>
  );
}

export default Button;
