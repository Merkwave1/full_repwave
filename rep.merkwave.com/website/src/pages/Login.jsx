// src/pages/Login.js
// This is the main Login Page component, now directly under src/pages/.
// It handles user input for email, password, and company name (used for URL construction only).
// It should be saved as Login.jsx in your local project.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../components/common/TextField/TextField.jsx';
import Button from '../components/common/Button/Button.jsx';
import { loginUser } from '../apis/auth.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { getErrorMessage } from '../utils/errorTranslations.js';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState(''); // State for company name (used for URL)
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const notificationsCtx = useNotifications();

  // Get the base API URL from environment variables
  const API_LOGIN_BASE_URL = import.meta.env.VITE_API_LOGIN_BASE_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!API_LOGIN_BASE_URL || !companyName) {
      console.error("Error: VITE_API_LOGIN_BASE_URL or Company Name is missing.");
      setMessage("خطأ: يرجى إدخال اسم الشركة وعنوان URL الأساسي لتسجيل الدخول.");
      setLoading(false);
      return;
    }

    // Construct the full login URL dynamically
    // Expected: https://your-domain.example/api/clients/{company name}/auth/login.php
    const fullLoginUrl = `${API_LOGIN_BASE_URL}${companyName}/auth/login.php`;

    try {
      // Pass the dynamically constructed fullLoginUrl and other credentials
      // Note: companyName is passed here as a parameter for loginUser,
      // but it will NOT be appended to FormData in loginUser.
      const result = await loginUser(fullLoginUrl, email, password, companyName);

      if (result.status === "success") {
        // Fetch notifications immediately on first successful login
        try {
          if (notificationsCtx) {
            await notificationsCtx.fetchNotifications({ is_read: 0, page: 1 });
            if (typeof notificationsCtx.fetchUnreadCount === 'function') {
              await notificationsCtx.fetchUnreadCount();
            }
            try {
              localStorage.setItem('notifications_initialFetched', 'true');
            } catch { /* noop */ }
          }
        } catch { /* silent */ }
        setMessage(result.message || "تم تسجيل الدخول بنجاح!");
        navigate('/dashboard'); // Redirect to dashboard
      } else {
        console.error('Login failed:', result.message);
        setMessage(result.message || "فشل تسجيل الدخول. يرجى التحقق من بياناتك.");
      }
    } catch (error) {
      console.error('Error during login:', error);
      // Specific handling for 404 or undefined status (network/connection error)
      if (error.status === 404 || error.status === undefined) {
        setMessage("اسم الشركة غير موجود بقواعد البيانات");
      } else if (error.message !== "Relogin required.") {
        // Handle other general errors (excluding "Relogin required." as it causes global redirect)
        // Use the error translation utility to get Arabic message
        const translatedMessage = getErrorMessage(error);
        setMessage(`حدث خطأ أثناء تسجيل الدخول: ${translatedMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center" dir="rtl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">تسجيل الدخول</h2>
      <p className="text-gray-600 mb-8">أدخل بيانات الاعتماد الخاصة بك للوصول إلى لوحة التحكم.</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('نجاح') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <TextField label="اسم الشركة" type="text" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="أدخل اسم شركتك" required />
        <TextField label="البريد الإلكتروني" type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="أدخل بريدك الإلكتروني" required />
        <TextField label="كلمة المرور" type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-gray-500 text-sm mb-3">ليس لديك حساب بعد؟</p>
        <button
          type="button"
          onClick={() => navigate('/try-now')}
          className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          🚀 جرّب RepWave مجاناً — 6 أيام تجريبية
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
