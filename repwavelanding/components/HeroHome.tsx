import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Shield, Clock, Languages } from "lucide-react";

type Lang = "en" | "ar";

interface HeroHomeProps {
  lang: Lang;
  rtl?: "rtl" | "ltr";
}

const translations = {
  en: {
    badge: "Next-gen Representative ERP",
    heading1: "Run your entire",
    heading2: "business from one place",
    description:
      "Sales, inventory, warehouses, and field teams — unified in a beautiful ERP built for operators who move fast.",
    tryNow: "Start free trial",
    contact: "Talk to sales",
    learnMore: "Explore product",
    trust: [
      { icon: Clock, text: "7-day free trial" },
      { icon: Shield, text: "No credit card" },
      { icon: Languages, text: "Arabic & English" },
    ],
  },
  ar: {
    badge: "نظام ERP تمثيلي من الجيل القادم",
    heading1: "أدر عملك بالكامل",
    heading2: "من منصة واحدة",
    description:
      "المبيعات والمخزون والمستودعات وفرق الميدان — في نظام ERP موحّد مصمم لمن يتحركون بسرعة.",
    tryNow: "ابدأ التجربة المجانية",
    contact: "تحدث مع المبيعات",
    learnMore: "استكشف المنتج",
    trust: [
      { icon: Clock, text: "تجربة 7 أيام مجاناً" },
      { icon: Shield, text: "بدون بطاقة ائتمان" },
      { icon: Languages, text: "عربي وإنجليزي" },
    ],
  },
};

const HeroHome = ({ lang, rtl }: HeroHomeProps) => {
  const t = translations[lang] ?? translations.en;
  const dir = rtl ?? (lang === "ar" ? "rtl" : "ltr");

  return (
    <section dir={dir} className="relative min-h-[92vh] rw-mesh overflow-hidden">
      <div className="absolute inset-0 rw-dot-grid opacity-40 pointer-events-none" />
      <div className="absolute top-20 -left-32 h-96 w-96 rounded-full bg-[#8B5FD6]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-[#C4A8F0]/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-8 md:pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Copy */}
          <div className="flex flex-col gap-6 text-center lg:text-start rw-fade-up">
            <div className="flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C4A8F0]/50 bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#7A52C2] shadow-sm backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8B5FD6] rw-pulse-dot" />
                <Sparkles className="h-3.5 w-3.5 text-[#8B5FD6]" />
                {t.badge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-[3.5rem] font-extrabold leading-[1.08] tracking-tight text-[#2D1B69]">
              {t.heading1}{" "}
              <span className="rw-gradient-text block sm:inline">{t.heading2}</span>
            </h1>

            <p className="text-base sm:text-lg text-[#5B5470] leading-relaxed max-w-xl mx-auto lg:mx-0">
              {t.description}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start items-stretch sm:items-center gap-3 pt-2">
              <Link
                href={`/${lang}/try-now`}
                className="rw-btn-cta group w-full sm:w-auto sm:min-w-[15.5rem]"
              >
                <span className="rw-btn-cta-label">{t.tryNow}</span>
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link href={`/${lang}/contact`} className="rw-btn rw-btn-secondary w-full sm:w-auto">
                {t.contact}
              </Link>
              <Link href={`/${lang}/about`} className="rw-btn rw-btn-ghost hidden sm:inline-flex">
                {t.learnMore}
              </Link>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4 border-t border-[#EDE7FF]/80">
              {t.trust.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-2 text-xs font-medium text-[#5B5470]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDE7FF]/80 text-[#8B5FD6]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Visual — transparent PNG floats on hero (no card/bg behind image) */}
          <div className="relative flex justify-center lg:justify-end rw-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative w-full max-w-lg">
              <div
                className="absolute inset-0 scale-90 rounded-full bg-[#8B5FD6]/10 blur-3xl pointer-events-none"
                aria-hidden
              />
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={lang === "ar" ? "/ContainerAr.png" : "/Container.png"}
                  alt="RepWave ERP Platform"
                  fill
                  priority
                  unoptimized
                  className="object-contain object-center rw-float drop-shadow-[0_24px_48px_rgba(139,95,214,0.35)]"
                />
              </div>
              <div className="mt-5 flex items-center justify-center lg:justify-end gap-3">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-[#8B5FD6] to-[#C4A8F0]"
                      style={{ opacity: 1 - i * 0.15 }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-[#7A52C2]">
                  {lang === "ar" ? "موثوق من فرق التشغيل" : "Trusted by operations teams"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroHome;
