import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    eyebrow: "Get started today",
    title: "Ready to run your business smarter?",
    subtitle:
      "Join teams using RepWave to streamline operations, cut manual work, and see the full picture — in Arabic or English.",
    primary: "Start 7-day free trial",
    secondary: "Schedule a demo",
  },
  ar: {
    eyebrow: "ابدأ اليوم",
    title: "هل أنت مستعد لإدارة أعمالك بذكاء؟",
    subtitle:
      "انضم إلى الفرق التي تستخدم RepWave لتبسيط العمليات وتقليل العمل اليدوي ورؤية الصورة الكاملة — بالعربية أو الإنجليزية.",
    primary: "ابدأ تجربة 7 أيام مجاناً",
    secondary: "احجز عرضاً توضيحياً",
  },
};

const CTASection = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section dir={dir} className="px-6 sm:px-10 lg:px-16 py-20">
      <div className="relative max-w-5xl mx-auto overflow-hidden rounded-[2rem] rw-gradient-band px-8 sm:px-14 py-14 sm:py-16 text-center shadow-[0_32px_64px_rgba(45,27,105,0.35)]">
        <div className="absolute inset-0 rw-dot-grid opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#C4A8F0]/20 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-[#EDE7FF] uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
            {t.title}
          </h2>
          <p className="text-[#EDE7FF]/85 text-base sm:text-lg leading-relaxed">{t.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
            <Link
              href={`/${lang}/try-now`}
              className="rw-btn bg-white text-[#2D1B69] hover:bg-[#FAFAFE] shadow-lg group"
            >
              {t.primary}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href={`/${lang}/contact`}
              className="rw-btn border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
            >
              {t.secondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
