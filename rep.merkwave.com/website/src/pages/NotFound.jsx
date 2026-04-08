// src/pages/NotFound.js
// This component displays a 404 Not Found page.
// It should be saved as NotFound.jsx in your local project.
import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4" dir="rtl">
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">الصفحة غير موجودة</h2>
        <p className="text-gray-600 mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة.</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition duration-200"
        >
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
