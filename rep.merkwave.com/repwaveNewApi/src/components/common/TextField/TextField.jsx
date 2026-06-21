// src/components/common/TextField/TextField.js
import React from "react";

function TextField({
  label,
  id,
  className = "",
  containerClass = "",
  ...props
}) {
  return (
    <div className={containerClass}>
      {label && (
        <label
          htmlFor={id}
          className="block text-gray-700 text-sm font-bold mb-2 text-right"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-[#8B5FD6]/40 focus:border-[#8B5FD6]
          text-gray-700 text-right bg-white shadow-sm
          hover:border-[#C4A8F0] transition-colors duration-200
          ${className}`}
        dir="rtl"
        {...props}
      />
    </div>
  );
}

export default TextField;
