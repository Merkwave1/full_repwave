/**
 * TryNow.jsx — "Try It Now" signup page for RepWave demo
 *
 * Collects visitor info, creates a 7-day trial account,
 * and shows credentials for immediate login.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_LOGIN_BASE_URL || "/api/clients/";
const DEMO_COMPANY = "demo_company";
const REGISTER_URL = `${API_BASE}${DEMO_COMPANY}/auth/register_trial.php`;

export default function TryNow() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    trial_name: "",
    trial_email: "",
    trial_phone: "",
    trial_company: "",
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

    const body = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (val.trim()) body.append(key, val.trim());
    });

    try {
      const res = await fetch(REGISTER_URL, { method: "POST", body });
      let json;
      try {
        json = await res.json();
      } catch {
        // Server returned non-JSON (PHP error, 404, etc.)
        const text = await res.text().catch(() => "");
        const preview = text
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 200);
        setError(
          `Server error (${res.status})${preview ? ": " + preview : ". Please try again later."}`,
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
    const text = `Email: ${result.email}\nPassword: ${result.password}\nCompany: ${result.company_name}\nExpires: ${result.expires_at}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Success Screen ──────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center">
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
                <div className="text-sm font-mono mt-1 text-blue-700">
                  {result.company_name}
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
                  state: { prefillCompany: result.company_name },
                })
              }
              className="mt-4 block w-full text-center bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Try RepWave Free</h1>
          <p className="text-blue-200 text-sm mt-2">
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
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Company Name{" "}
              <span className="text-gray-400 normal-case font-normal">
                (optional)
              </span>
            </label>
            <input
              type="text"
              name="trial_company"
              maxLength={200}
              placeholder="Your company"
              value={formData.trial_company}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-200"
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
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
