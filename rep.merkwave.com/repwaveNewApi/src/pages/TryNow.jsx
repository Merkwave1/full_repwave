/**
 * TryNow.jsx — "Try It Now" signup page for RepWave demo
 *
 * Collects visitor info, creates a 7-day trial account via .NET API,
 * and shows credentials for immediate login.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TRIAL_URL = "/api/tenants/trial";

export default function TryNow() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    trial_name: "",
    trial_email: "",
    trial_phone: "",
    trial_company: "",
    trial_country: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const body = JSON.stringify({
      contact_name: formData.trial_name.trim(),
      contact_email: formData.trial_email.trim(),
      contact_phone: formData.trial_phone.trim() || null,
      company_name: formData.trial_company.trim() || formData.trial_name.trim(),
      country: formData.trial_country.trim() || "Other",
    });

    try {
      const res = await fetch(TRIAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      let json;
      try {
        json = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        const preview = text
          .replace(/<[^>]*>/g," ")
          .replace(/\s+/g," ")
          .trim()
          .slice(0, 200);
        setError(
          `Server error (${res.status})${preview ? ":" + preview : ". Please try again later."}`,
        );
        return;
      }
      if (json.status === "success") {
        setResult(json.data);
      } else {
        setError(json.message || "Something went wrong.");
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!result) return;
    const text = `Email: ${result.email}\nPassword: ${result.password}\nCompany: ${result.company_name}\nTenant ID: ${result.tenant_id}\nExpires: ${result.expires_at}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Success Screen ──────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] to-[#fdf2f1] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#C4A8F0] overflow-hidden">
          {/* Header */}
          <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #8B5FD6 0%, #F97366 100%)" }}>
            <div className="text-white text-5xl mb-2">✓</div>
            <h2 className="text-xl font-bold text-white">
              Your 7-Day Trial is Ready!
            </h2>
            <p className="text-green-100 text-sm mt-1">
              Save your credentials below — they won't be shown again
            </p>
          </div>

          {/* Credentials Card */}
          <div className="p-6">
            <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Company Name
                </span>
                <div className="text-sm font-mono mt-1 text-[#7A52C2]">
                  {result.company_name}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tenant ID (Login)
                </span>
                <div className="text-sm font-mono mt-1 text-purple-700">
                  {result.tenant_id}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Email
                </span>
                <div className="text-sm font-mono mt-1">{result.email}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Password
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-yellow-100 px-3 py-1.5 rounded-lg font-mono text-lg tracking-[0.2em] font-bold text-gray-800 border border-yellow-200">
                    {result.password}
                  </code>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Expires
                </span>
                <div className="text-sm mt-1">
                  {result.expires_at}{" "}
                  <span className="text-gray-400">({result.days} days)</span>
                </div>
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={copyCredentials}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              {copied ? "✓ Copied!" : "📋 Copy Credentials"}
            </button>

            {/* Warning */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Important:</strong> Your password cannot be changed or
              recovered. Demo data resets every hour. Your account expires in{" "}
              {result.days} days.
            </div>

            {/* Login button */}
            <button
              onClick={() =>
                navigate("/login", {
                  state: {
                    prefillCompany: result.tenant_id,
                    prefillEmail: result.email,
                  },
                })
              }
              className="mt-4 block w-full text-center bg-[#8B5FD6] text-white py-3 rounded-xl font-semibold hover:bg-[#7A52C2] transition shadow-lg shadow-[#C4A8F0]/40"
            >
              Go to Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Signup Form ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] to-[#fdf2f1] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #8B5FD6 0%, #F97366 100%)" }}>
          <h1 className="text-2xl font-bold text-white">Try RepWave Free</h1>
          <p className="text-[#C4A8F0] text-sm mt-2">
            7-day demo · No credit card · Instant access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="trial_name"
              required
              minLength={2}
              maxLength={100}
              placeholder="e.g. Ahmed Mohamed"
              value={formData.trial_name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="trial_email"
              required
              placeholder="you@company.com"
              value={formData.trial_email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Phone{" "}
              <span className="text-gray-400 normal-case font-normal">
                (optional)
              </span>
            </label>
            <input
              type="tel"
              name="trial_phone"
              placeholder="+20 100 000 0000"
              value={formData.trial_phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="trial_company"
              required
              maxLength={200}
              placeholder="Your company"
              value={formData.trial_company}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              name="trial_country"
              required
              value={formData.trial_country}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6] focus:border-transparent"
            >
              <option value="">Select country</option>
              <option value="Egypt">Egypt</option>
              <option value="Saudi Arabia">Saudi Arabia</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8B5FD6] text-white py-3 rounded-xl font-semibold hover:bg-[#7A52C2] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-[#C4A8F0]/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating your demo...
              </span>
            ) : (
              "Start Free Trial →"
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-2">
            By signing up, you agree to receive product updates. No spam, ever.
          </p>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm text-[#8B5FD6] hover:underline"
            >
              ← Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
