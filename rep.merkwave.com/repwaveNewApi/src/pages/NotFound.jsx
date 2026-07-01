// src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(135deg, #1A0F35 0%, #2D1B69 45%, #8B5FD6 100%)",
      }}
      dir="rtl"
    >
      <div className="text-center bg-white rounded-2xl shadow-[0_25px_60px_-10px_rgba(139,95,214,0.40)] p-10 max-w-sm w-full border border-purple-100/40">
        {/* Large 404 */}
        <div
          className="text-8xl font-extrabold mb-4 bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #8B5FD6 0%, #F97366 100%)",
          }}
        >
          404
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          الصفحة غير موجودة
        </h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو ربما تمّ نقلها.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-2.5 rounded-xl font-semibold text-white text-sm rw-btn-gradient shadow-md hover:shadow-lg transition-shadow"
        >
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
