// src/components/common/Loader/Loader.js
// This component provides a simple, animated loading spinner.
// It should be saved as Loader.jsx in your local project.

import React from 'react';

function Loader({ className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
        role="status"
      >
        <span className="sr-only">جاري التحميل...</span>
      </div>
    </div>
  );
}

export default Loader;
