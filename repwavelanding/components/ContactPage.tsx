"use client";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Building2,
  Clock,
  CheckCircle2,
  Send,
  ChevronDown,
} from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    badge: "GET IN TOUCH",
    title: "We'd Love to Hear From You",
    subtitle:
      "Whether you have a question about features, pricing, a demo request, or anything else — our team is ready to answer.",
    contactInfo: {
      title: "Contact Information",
      items: [
        {
          icon: "mail",
          label: "Email",
          value: "hello@repwave.io",
          sub: "We reply within 24 hours",
        },
        {
          icon: "phone",
          label: "Phone",
          value: "+971 4 000 1234",
          sub: "Sun – Thu, 9am – 6pm GST",
        },
        {
          icon: "map",
          label: "Office",
          value: "Cairo, Egypt",
          sub: "92 Othman Ibn Affan St., Triumph Square, Heliopolis",
        },
        {
          icon: "clock",
          label: "Support Hours",
          value: "24 / 7",
          sub: "Enterprise tier customers",
        },
      ],
    },
    departments: [
      { value: "sales", label: "Sales & Pricing" },
      { value: "demo", label: "Request a Demo" },
      { value: "support", label: "Technical Support" },
      { value: "partnership", label: "Partnerships" },
      { value: "other", label: "Other" },
    ],
    form: {
      name: "Full Name",
      namePlaceholder: "Ahmed Al-Rashidi",
      email: "Work Email",
      emailPlaceholder: "ahmed@company.com",
      company: "Company Name",
      companyPlaceholder: "Acme Trading LLC",
      department: "What can we help with?",
      message: "Message",
      messagePlaceholder: "Tell us a bit about your business and what you're looking for...",
      submit: "Send Message",
      sending: "Sending...",
    },
    successTitle: "Message Sent!",
    successBody:
      "Thanks for reaching out. Someone from our team will be in touch within one business day.",
    successBack: "Send Another Message",
  },
  ar: {
    badge: "تواصل معنا",
    title: "يسعدنا سماعك",
    subtitle:
      "سواء كان لديك سؤال حول الميزات أو الأسعار أو طلب عرض تجريبي أو أي شيء آخر — فريقنا جاهز للإجابة.",
    contactInfo: {
      title: "معلومات التواصل",
      items: [
        {
          icon: "mail",
          label: "البريد الإلكتروني",
          value: "hello@repwave.io",
          sub: "نرد خلال 24 ساعة",
        },
        {
          icon: "phone",
          label: "الهاتف",
          value: "1234 000 4 971+",
          sub: "الأحد – الخميس، 9ص – 6م بتوقيت الخليج",
        },
        {
          icon: "map",
          label: "المكتب",
          value: "القاهرة، مصر",
          sub: "٩٢ شارع عثمان بن عفان، ميدان تريومف، مصر الجديدة",
        },
        {
          icon: "clock",
          label: "ساعات الدعم",
          value: "24 / 7",
          sub: "لعملاء الباقة المؤسسية",
        },
      ],
    },
    departments: [
      { value: "sales", label: "المبيعات والأسعار" },
      { value: "demo", label: "طلب عرض تجريبي" },
      { value: "support", label: "الدعم التقني" },
      { value: "partnership", label: "الشراكات" },
      { value: "other", label: "أخرى" },
    ],
    form: {
      name: "الاسم الكامل",
      namePlaceholder: "أحمد الراشدي",
      email: "البريد الإلكتروني للعمل",
      emailPlaceholder: "ahmed@company.com",
      company: "اسم الشركة",
      companyPlaceholder: "شركة أكمي للتجارة",
      department: "كيف يمكننا المساعدة؟",
      message: "الرسالة",
      messagePlaceholder: "أخبرنا قليلاً عن أعمالك وما تبحث عنه...",
      submit: "إرسال الرسالة",
      sending: "جارٍ الإرسال...",
    },
    successTitle: "تم إرسال رسالتك!",
    successBody:
      "شكراً على تواصلك. سيتصل بك أحد أعضاء فريقنا خلال يوم عمل واحد.",
    successBack: "إرسال رسالة أخرى",
  },
};

const iconMap = {
  mail: Mail,
  phone: Phone,
  map: MapPin,
  clock: Clock,
};

type FormState = {
  name: string;
  email: string;
  company: string;
  department: string;
  message: string;
};

const ContactPage = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    company: "",
    department: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState<keyof FormState | null>(null);

  const errmsg = {
    required: lang === "ar" ? "هذا الحقل مطلوب" : "Required",
    email: lang === "ar" ? "يرجى إدخال بريد إلكتروني صحيح" : "Valid email required",
    select: lang === "ar" ? "يرجى اختيار خيار" : "Please select one",
  };

  const validate = () => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = errmsg.required;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = errmsg.email;
    if (!form.department) e.department = errmsg.select;
    if (!form.message.trim()) e.message = errmsg.required;
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1400);
  };

  const fieldClass = (key: keyof FormState) =>
    `rw-input ${errors[key] ? "!border-red-400" : ""} ${
      focused === key ? "!border-[#8B5FD6]" : ""
    }`;

  return (
    <div dir={dir}>
      {/* ── Hero ── */}
      <section className="relative rw-gradient-band px-6 sm:px-10 pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 rw-dot-grid opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 text-[#EDE7FF] text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 mb-5">
            {t.badge}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            {t.title}
          </h1>
          <p className="text-[#EDE7FF]/80 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-[#FAFAFE] py-16 px-6 sm:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          {/* Left: contact info cards */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-lg font-extrabold text-[#1F2937] mb-2">
              {t.contactInfo.title}
            </h2>
            {t.contactInfo.items.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              return (
                <div
                  key={item.label}
                  className="flex gap-4 rw-card p-5 hover:!translate-y-0 hover:border-[#C4A8F0]/60"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EDE7FF] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#8B5FD6]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-sm font-bold text-[#1F2937]">
                      {item.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              );
            })}

            {/* Social / extra links */}
            <div className="bg-[#2D1B69] rounded-2xl p-6 flex flex-col gap-3 mt-2">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#C4A8F0] shrink-0" />
                <p className="text-sm text-slate-300 leading-snug">
                  {lang === "ar"
                    ? "نعمل مع شركات من جميع الأحجام عبر منطقة الشرق الأوسط وأفريقيا وخارجها."
                    : "We work with businesses of all sizes across MENA and beyond."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-[#C4A8F0] shrink-0" />
                <p className="text-sm text-slate-300 leading-snug">
                  {lang === "ar"
                    ? "تفضّل بالتواصل بالعربية أو الإنجليزية — فريقنا ثنائي اللغة."
                    : "Reach out in Arabic or English — our team is bilingual."}
                </p>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3 rw-card p-8 hover:!translate-y-0">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-5 py-10">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#1F2937]">
                  {t.successTitle}
                </h3>
                <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                  {t.successBody}
                </p>
                <button
                  onClick={() => {
                    setSent(false);
                    setForm({
                      name: "",
                      email: "",
                      company: "",
                      department: "",
                      message: "",
                    });
                    setErrors({});
                  }}
                  className="mt-2 text-sm font-semibold text-[#8B5FD6] hover:text-[#7A52C2] transition-colors duration-200"
                >
                  {t.successBack}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#1F2937] tracking-wide">
                      {t.form.name}
                    </label>
                    <input
                      type="text"
                      placeholder={t.form.namePlaceholder}
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                      className={fieldClass("name")}
                    />
                    {errors.name && (
                      <span className="text-[11px] text-red-400">
                        {errors.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#1F2937] tracking-wide">
                      {t.form.email}
                    </label>
                    <input
                      type="email"
                      placeholder={t.form.emailPlaceholder}
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      className={fieldClass("email")}
                    />
                    {errors.email && (
                      <span className="text-[11px] text-red-400">
                        {errors.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Company */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1F2937] tracking-wide">
                    {t.form.company}
                  </label>
                  <input
                    type="text"
                    placeholder={t.form.companyPlaceholder}
                    value={form.company}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company: e.target.value }))
                    }
                    onFocus={() => setFocused("company")}
                    onBlur={() => setFocused(null)}
                    className={fieldClass("company")}
                  />
                </div>

                {/* Department select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1F2937] tracking-wide">
                    {t.form.department}
                  </label>
                  <div className="relative">
                    <select
                      value={form.department}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, department: e.target.value }))
                      }
                      onFocus={() => setFocused("department")}
                      onBlur={() => setFocused(null)}
                      className={`${fieldClass("department")} appearance-none pr-10 cursor-pointer`}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {t.departments.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 inset-e-3 pointer-events-none" />
                  </div>
                  {errors.department && (
                    <span className="text-[11px] text-red-400">
                      {errors.department}
                    </span>
                  )}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1F2937] tracking-wide">
                    {t.form.message}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={t.form.messagePlaceholder}
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    onFocus={() => setFocused("message")}
                    onBlur={() => setFocused(null)}
                    className={`${fieldClass("message")} resize-none`}
                  />
                  {errors.message && (
                    <span className="text-[11px] text-red-400">
                      {errors.message}
                    </span>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={sending}
                  className="rw-btn rw-btn-primary disabled:opacity-60 cursor-pointer"
                >
                  {sending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {t.form.sending}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t.form.submit}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
