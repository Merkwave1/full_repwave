// src/components/ProtectedRoute.js
// A component that protects routes, redirecting unauthenticated users to the login page.
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, isAdmin } from '../apis/auth.js'; // Import the authentication check

function ProtectedRoute() {
  // Check if the user is authenticated
  const auth = isAuthenticated();
  const adminRole = isAdmin();

  // If not authenticated, redirect to login
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but not admin, show access denied
  if (!adminRole) {
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
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
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
