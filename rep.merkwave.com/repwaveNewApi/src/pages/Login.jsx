// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button/Button.jsx";
import { loginUser } from "../apis/auth.js";
import { EyeIcon, EyeSlashIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { DEMO_ACCOUNT } from "../constants/demoAccount.js";
import { BRAND_LOGO_ICON_SRC } from "../constants/brandLogo.js";
import { PORTFOLIO_URL } from "../constants/portfolioUrl.js";

const inputClass =
  "w-full px-4 py-3 text-sm border border-[#EDE7FF] rounded-xl bg-[#FAFAFE] text-[#2D1B69] placeholder:text-[#C4A8F0]/80 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8B5FD6]/30 focus:border-[#8B5FD6] focus:bg-white hover:border-[#C4A8F0]";

function LoginPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefillFromQuery =
    searchParams.get("email") || searchParams.get("tenant_id");
  const useDemoPrefill =
    import.meta.env.DEV &&
    !prefillFromQuery &&
    !location.state?.prefillEmail &&
    !location.state?.prefillCompany &&
    !import.meta.env.VITE_TENANT_ID;

  const [email, setEmail] = useState(
    location.state?.prefillEmail ||
      searchParams.get("email") ||
      (useDemoPrefill ? DEMO_ACCOUNT.email : ""),
  );
  const [password, setPassword] = useState(
    useDemoPrefill ? DEMO_ACCOUNT.password : "",
  );
  const [showPass, setShowPass] = useState(false);
  const [tenantId, setTenantId] = useState(
    location.state?.prefillCompany ||
      searchParams.get("tenant_id") ||
      import.meta.env.VITE_TENANT_ID ||
      (useDemoPrefill ? DEMO_ACCOUNT.tenantId : ""),
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (!tenantId) {
      setMessage("يرجى إدخال معرّف الشركة.");
      setLoading(false);
      return;
    }
    try {
      await loginUser(email, password, tenantId);
      navigate("/dashboard");
    } catch (error) {
      setMessage(
        error.message || "فشل تسجيل الدخول. تحقق من بياناتك وحاول مجدداً.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex flex-col">
      <div className="text-center mb-7">
        <h2 className="text-[1.65rem] font-bold tracking-tight text-[#1A0F35]">
          أهلاً بعودتك
        </h2>
        <p className="text-[#7A52C2] text-sm mt-1.5">
          سجّل دخولك للوصول إلى لوحة التحكم
        </p>
      </div>

      {message && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50/90 border border-red-100 text-red-700 text-sm flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!import.meta.env.VITE_TENANT_ID && (
          <div>
            <label className="block text-xs font-semibold text-[#2D1B69]/80 mb-1.5">
              معرّف الشركة
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="company-id"
              required
              className={inputClass}
              dir="ltr"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#2D1B69]/80 mb-1.5">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className={inputClass}
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2D1B69]/80 mb-1.5">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`${inputClass} pr-11`}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4A8F0] hover:text-[#8B5FD6] transition-colors"
              tabIndex={-1}
              aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPass ? (
                <EyeSlashIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full mt-1 py-3" disabled={loading}>
          {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#EDE7FF]">
        <a
          href={PORTFOLIO_URL}
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[#EDE7FF] bg-gradient-to-l from-[#FAFAFE] to-white px-4 py-3.5 transition-all duration-200 hover:border-[#C4A8F0] hover:shadow-[0_8px_24px_-8px_rgba(139,95,214,0.25)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDE7FF]/60 ring-1 ring-[#C4A8F0]/40">
              <img
                src={BRAND_LOGO_ICON_SRC}
                alt=""
                className="h-6 w-6 object-contain"
                aria-hidden
              />
            </span>
            <div className="min-w-0 text-right">
              <p className="text-sm font-semibold text-[#2D1B69]">
                العودة إلى RepWave
              </p>
              <p className="text-xs text-[#7A52C2]/90 truncate">
                اكتشف المزايا، الأسعار، والتجربة المجانية
              </p>
            </div>
          </div>
          <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-[#8B5FD6] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  );
}

export default LoginPage;
