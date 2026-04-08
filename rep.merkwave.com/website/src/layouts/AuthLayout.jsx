// src/layouts/AuthLayout.js
// This layout component provides a consistent visual wrapper for authentication-related pages
// like login and registration. It centers the content and applies a background gradient.
import React from 'react';

function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
