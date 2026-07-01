"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Globe2,
  Loader2,
  Mail,
  Phone,
  Rocket,
  ShieldCheck,
  User,
} from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import {
  buildManualLoginUrl,
  loginTrialUser,
  redirectToAppWithAuth,
  registerTrial,
  type TrialCredentials,
} from "@/lib/trial";

type Lang = "en" | "ar";
type Step = "form" | "provisioning" | "success" | "error";

const copy = {
  en: {
    badge: "7-DAY FREE TRIAL",
    title: "Try RepWave Now",
    subtitle:
      "Get your own workspace in minutes. Full ERP access — no credit card required.",
    company: "Company name",
    country: "Country",
    name: "Your full name",
    email: "Work email",
    phone: "Phone (optional)",
    submit: "Start My Free Trial",
    submitting: "Creating your workspace…",
    trust: "Your data is isolated in a private tenant. Trial expires after 7 days.",
    backHome: "Back to home",
    haveAccount: "Already have an account?",
    login: "Log in",
    steps: [
      "Creating your company workspace",
      "Setting up your admin account",
      "Preparing your 7-day trial",
      "Signing you in…",
    ],
    successTitle: "You're all set!",
    successBody:
      "Your private RepWave workspace is ready. We're opening the app for you now.",
    tenantId: "Tenant ID",
    expires: "Trial expires",
    enterNow: "Enter RepWave Now",
    copyCreds: "Copy login details",
    copied: "Copied!",
    redirecting: "Redirecting in",
    seconds: "seconds",
    errorTitle: "Something went wrong",
    retry: "Try again",
    placeholders: {
      company: "e.g. Nile Trading Co.",
      name: "e.g. Ahmed Mohamed",
      email: "you@company.com",
      phone: "+20 100 000 0000",
    },
    selectCountry: "Select country",
    perks: [
      "Private multi-tenant workspace",
      "Full sales & inventory modules",
      "Admin access for 7 days",
    ],
  },
  ar: {
    badge: "تجربة مجانية 7 أيام",
    title: "جرّب RepWave الآن",
    subtitle:
      "احصل على مساحة عمل خاصة خلال دقائق. وصول كامل للنظام — بدون بطاقة ائتمان.",
    company: "اسم الشركة",
    country: "الدولة",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "الهاتف (اختياري)",
    submit: "ابدأ التجربة المجانية",
    submitting: "جاري إنشاء مساحة العمل…",
    trust: "بياناتك معزولة في tenant خاص. تنتهي التجربة بعد 7 أيام.",
    backHome: "العودة للرئيسية",
    haveAccount: "لديك حساب بالفعل؟",
    login: "تسجيل الدخول",
    steps: [
      "إنشاء مساحة عمل شركتك",
      "إعداد حساب المسؤول",
      "تجهيز تجربتك لمدة 7 أيام",
      "تسجيل دخولك…",
    ],
    successTitle: "كل شيء جاهز!",
    successBody: "مساحة RepWave الخاصة بك جاهزة. نفتح التطبيق لك الآن.",
    tenantId: "معرّف الشركة",
    expires: "انتهاء التجربة",
    enterNow: "الدخول إلى RepWave",
    copyCreds: "نسخ بيانات الدخول",
    copied: "تم النسخ!",
    redirecting: "إعادة التوجيه خلال",
    seconds: "ثوانٍ",
    errorTitle: "حدث خطأ",
    retry: "حاول مجدداً",
    placeholders: {
      company: "مثال: شركة النيل للتجارة",
      name: "مثال: أحمد محمد",
      email: "you@company.com",
      phone: "+20 100 000 0000",
    },
    selectCountry: "اختر الدولة",
    perks: [
      "مساحة عمل متعددة المستأجرين",
      "وحدات المبيعات والمخزون كاملة",
      "صلاحية مسؤول لمدة 7 أيام",
    ],
  },
};

const inputClass = "rw-input";

export default function TryNowForm({ lang }: { lang: Lang }) {
  const t = copy[lang] ?? copy.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isRtl = dir === "rtl";

  const [step, setStep] = useState<Step>("form");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<TrialCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const [form, setForm] = useState({
    company_name: "",
    country: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });

  const countryOptions = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.en,
        label: lang === "ar" ? c.ar : c.en,
      })),
    [lang],
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const runProvisioningAnimation = async (work: () => Promise<void>) => {
    setStep("provisioning");
    setStepIndex(0);
    const timers = t.steps.map((_, i) =>
      window.setTimeout(() => setStepIndex(i), i * 1200),
    );
    try {
      await work();
      setStepIndex(t.steps.length - 1);
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      timers.forEach(clearTimeout);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    await runProvisioningAnimation(async () => {
      try {
        const creds = await registerTrial({
          company_name: form.company_name.trim(),
          country: form.country,
          contact_name: form.contact_name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim() || null,
        });
        setCredentials(creds);

        const auth = await loginTrialUser(
          creds.tenant_id,
          creds.email,
          creds.password,
        );

        setStep("success");
        let remaining = 5;
        setCountdown(remaining);
        const timer = window.setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(timer);
            redirectToAppWithAuth(auth);
          }
        }, 1000);
      } catch (err) {
        setStep("error");
        setError(err instanceof Error ? err.message : "Registration failed.");
      }
    });
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Tenant ID: ${credentials.tenant_id}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nExpires: ${credentials.expires_at}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section dir={dir} className="relative overflow-hidden rw-mesh py-16 sm:py-24 px-4 sm:px-6">
      <div className="absolute inset-0 rw-dot-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] items-start">
          {/* Left panel — marketing */}
          <div className={`${isRtl ? "lg:order-2" : ""} space-y-6`}>
            <span className="rw-eyebrow">
              <Rocket className="h-3.5 w-3.5 text-[#8B5FD6]" />
              {t.badge}
            </span>
            <h1 className="rw-title mt-2">{t.title}</h1>
            <p className="text-[#5B5470] text-base sm:text-lg leading-relaxed">
              {t.subtitle}
            </p>
            <ul className="space-y-3">
              {t.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-sm text-[#2D1B69]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDE7FF] text-[#8B5FD6]">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
            <div className="rw-glass flex items-start gap-3 rounded-2xl p-4 text-sm text-[#5B5470]">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#8B5FD6] mt-0.5" />
              {t.trust}
            </div>
          </div>

          {/* Right panel — form / states */}
          <div
            className={`${isRtl ? "lg:order-1" : ""} rw-card overflow-hidden shadow-[0_25px_60px_-15px_rgba(139,95,214,0.25)] !rounded-[1.5rem]`}
          >
            <div className="rw-gradient-band px-6 py-5 text-white">
              <p className="text-sm font-semibold opacity-90">{t.badge}</p>
              <p className="text-lg font-bold">{t.title}</p>
            </div>

            <div className="p-6 sm:p-8">
              {step === "form" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label={t.company} icon={<Building2 className="h-4 w-4" />}>
                    <input
                      name="company_name"
                      required
                      minLength={2}
                      maxLength={200}
                      value={form.company_name}
                      onChange={handleChange}
                      placeholder={t.placeholders.company}
                      className={inputClass}
                    />
                  </Field>

                  <Field label={t.country} icon={<Globe2 className="h-4 w-4" />}>
                    <select
                      name="country"
                      required
                      value={form.country}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">{t.selectCountry}</option>
                      {countryOptions.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t.name} icon={<User className="h-4 w-4" />}>
                    <input
                      name="contact_name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={form.contact_name}
                      onChange={handleChange}
                      placeholder={t.placeholders.name}
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t.email} icon={<Mail className="h-4 w-4" />}>
                      <input
                        type="email"
                        name="contact_email"
                        required
                        value={form.contact_email}
                        onChange={handleChange}
                        placeholder={t.placeholders.email}
                        className={inputClass}
                        dir="ltr"
                      />
                    </Field>
                    <Field label={t.phone} icon={<Phone className="h-4 w-4" />}>
                      <input
                        type="tel"
                        name="contact_phone"
                        value={form.contact_phone}
                        onChange={handleChange}
                        placeholder={t.placeholders.phone}
                        className={inputClass}
                        dir="ltr"
                      />
                    </Field>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="rw-btn rw-btn-primary w-full py-3.5"
                  >
                    <Rocket className="h-4 w-4" />
                    {t.submit}
                  </button>
                </form>
              )}

              {step === "provisioning" && (
                <div className="py-8 text-center space-y-6">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#8B5FD6]" />
                  <p className="font-semibold text-[#2D1B69]">{t.submitting}</p>
                  <ul className="space-y-3 text-sm text-left max-w-xs mx-auto">
                    {t.steps.map((label, i) => (
                      <li
                        key={label}
                        className={`flex items-center gap-3 ${
                          i <= stepIndex ? "text-[#8B5FD6]" : "text-gray-300"
                        }`}
                      >
                        {i < stepIndex ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : i === stepIndex ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        ) : (
                          <span className="h-4 w-4 shrink-0 rounded-full border border-current" />
                        )}
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step === "success" && credentials && (
                <div className="space-y-5 text-center">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-[#8B5FD6]" />
                  <div>
                    <h2 className="text-xl font-bold text-[#1F2937]">{t.successTitle}</h2>
                    <p className="mt-2 text-sm text-gray-500">{t.successBody}</p>
                  </div>

                  <div className="rounded-xl border border-[#EDE7FF] bg-[#FAFAFE] p-4 text-sm text-left space-y-2">
                    <Row label={t.tenantId} value={credentials.tenant_id} />
                    <Row label={t.email} value={credentials.email} />
                    <Row label={t.expires} value={credentials.expires_at} />
                  </div>

                  <p className="text-xs text-[#8B5FD6]">
                    {t.redirecting} {countdown} {t.seconds}…
                  </p>

                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {copied ? t.copied : t.copyCreds}
                  </button>

                  {credentials && (
                    <a
                      href={buildManualLoginUrl(credentials)}
                      className="block w-full rounded-xl bg-[#8B5FD6] py-3 text-sm font-bold text-white hover:bg-[#7A52C2]"
                    >
                      {t.enterNow}
                    </a>
                  )}
                </div>
              )}

              {step === "error" && (
                <div className="space-y-4 text-center py-4">
                  <h2 className="text-lg font-bold text-red-600">{t.errorTitle}</h2>
                  <p className="text-sm text-gray-600">{error}</p>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="rounded-xl bg-[#8B5FD6] px-6 py-2.5 text-sm font-semibold text-white"
                  >
                    {t.retry}
                  </button>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                <Link href={`/${lang}`} className="hover:text-[#8B5FD6]">
                  ← {t.backHome}
                </Link>
                <span>
                  {t.haveAccount}{" "}
                  <a
                    href={`${process.env.NEXT_PUBLIC_REPWAVE_APP_URL || "http://localhost:5174"}/login`}
                    className="font-semibold text-[#8B5FD6] hover:underline"
                  >
                    {t.login}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
        <span className="text-[#8B5FD6]">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono font-semibold text-[#2D1B69] break-all text-right">
        {value}
      </span>
    </div>
  );
}
