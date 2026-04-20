// src/components/common/TextField/TextField.js
// This component provides a reusable text input field with a label.
// It includes basic styling with Tailwind CSS and supports RTL text direction
// for Arabic input.
// This file should be saved as TextField.jsx in your local project.
import React from 'react';

function TextField({ label, id, className = '', containerClass = '', ...props }) {
  // Keep the container minimal so this component can be used inline in flex rows.
  // The `className` prop is applied to the input element (for compatibility with current usages).
  return (
    <div className={containerClass}>
      {label && (
        <label htmlFor={id} className="block text-gray-700 text-sm font-bold mb-2 text-right">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-right ${className}`}
        dir="rtl"
        {...props}
      />
    </div>
  );
}

export default TextField;
