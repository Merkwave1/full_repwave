// src/components/ProtectedRoute.js
// A component that protects routes, redirecting unauthenticated users to the login page.
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, isAdmin, isAdminSupportSession } from '../apis/auth.js'; // Import the authentication check

function ProtectedRoute() {
  // Check if the user is authenticated
  const auth = isAuthenticated();
  const adminRole = isAdmin();
  const supportSession = isAdminSupportSession();

  // If not authenticated, redirect to login
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but not admin (unless super-admin opened ERP for support)
  if (!adminRole && !supportSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">غير مسموح لك بالدخول</h1>
          <p className="text-gray-600 mb-6">
            هذه اللوحة مخصصة للمديرين فقط. يرجى التواصل مع المدير للحصول على الصلاحيات المناسبة.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="bg-[#8B5FD6] hover:bg-[#8B5FD6] text-white font-bold py-2 px-4 rounded transition-colors"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  // If authenticated and admin, render the child routes (Outlet)
  return <Outlet />;
}

export default ProtectedRoute;
