// src/pages/Login.js
// This is the main Login Page component, now directly under src/pages/.
// It handles user input for email, password, and company name (used for URL construction only).
// It should be saved as Login.jsx in your local project.
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TextField from "../components/common/TextField/TextField.jsx";
import Button from "../components/common/Button/Button.jsx";
import { loginUser } from "../apis/auth.js";

function LoginPage() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState(
    location.state?.prefillCompany || import.meta.env.VITE_TENANT_ID || "",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (!tenantId) {
      setMessage("خطأ: يرجى إدخال معرّف الشركة (Tenant ID).");
      setLoading(false);
      return;
    }
    try {
      await loginUser(email, password, tenantId);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error.message || "فشل تسجيل الدخول. يرجى التحقق من بياناتك.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">تسجيل الدخول</h2>
      <p className="text-gray-500 text-sm mb-6">
        أدخل بيانات الاعتماد الخاصة بك للوصول إلى لوحة التحكم.
      </p>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${message.includes("نجاح") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {!import.meta.env.VITE_TENANT_ID && (
          <TextField
            label="معرّف الشركة"
            type="text"
            id="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="أدخل معرّف شركتك (Tenant ID)"
            required
          />
        )}
        <TextField
          label="البريد الإلكتروني"
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="أدخل بريدك الإلكتروني"
          required
        />
        <TextField
          label="كلمة المرور"
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="أدخل كلمة المرور"
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-gray-500 text-sm mb-3">ليس لديك حساب بعد؟</p>
        <button
          type="button"
          onClick={() => navigate("/try-now")}
          className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg rw-btn-gradient"
        >
          🚀 جرّب RepWave مجاناً — 7 أيام تجريبية
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
