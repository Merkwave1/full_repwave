import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { storeAuth } from "../utils/axiosInstance.js";
import RepWaveLogo from "../components/common/RepWaveLogo/RepWaveLogo.jsx";

/**
 * Receives auth payload from the marketing site after trial signup
 * and stores it before redirecting to the dashboard.
 */
export default function AuthHandoffPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("جاري تسجيل دخولك…");

  useEffect(() => {
    const raw = searchParams.get("payload");
    if (!raw) {
      setMessage("رابط غير صالح. جاري التحويل لتسجيل الدخول…");
      const t = setTimeout(() => navigate("/login", { replace: true }), 2000);
      return () => clearTimeout(t);
    }

    try {
      const decoded = JSON.parse(atob(decodeURIComponent(raw)));
      if (!decoded?.token || !decoded?.tenant_id) {
        throw new Error("Invalid payload");
      }

      storeAuth({
        token: decoded.token,
        user_id: decoded.user_id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        tenant_id: decoded.tenant_id,
        image: decoded.image ?? null,
        days_remaining: decoded.days_remaining ?? null,
        admin_support: decoded.admin_support === true,
      });

      navigate("/dashboard", { replace: true });
    } catch {
      setMessage("تعذر إكمال تسجيل الدخول. جاري التحويل…");
      const t = setTimeout(() => navigate("/login", { replace: true }), 2000);
      return () => clearTimeout(t);
    }
  }, [navigate, searchParams]);

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f3ff] to-[#FAFAFE] p-6"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#EDE7FF] p-8 text-center">
        <RepWaveLogo variant="wordmark" size={48} className="mx-auto mb-6" />
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#EDE7FF] border-t-[#8B5FD6]" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
