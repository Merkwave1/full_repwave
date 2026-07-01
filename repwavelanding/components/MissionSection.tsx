"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Globe, ArrowUpRight } from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    eyebrow: "Our mission",
    title: "Built for operators who can't afford chaos",
    p1: "RepWave was founded on a simple belief: running a business shouldn't feel like fighting your tools. We combine field sales, inventory, and finance in one calm, powerful workspace.",
    p2: "From warehouse to customer doorstep, every detail stays visible — so your team moves with confidence, not guesswork.",
    badge1: "Modern ERP platform",
    badge2: "Global-ready",
    cta: "Read our story",
  },
  ar: {
    eyebrow: "مهمتنا",
    title: "مبني لمن لا يتحملون الفوضى",
    p1: "تأسست RepWave على conviction بسيط: إدارة الأعمال لا يجب أن تشعر وكأنك تحارب أدواتك. نجمع المبيعات الميدانية والمخزون والمالية في مساحة عمل واحدة هادئة وقوية.",
    p2: "من المستودع إلى باب العميل، كل تفصيلة مرئية — ليتحرك فريقك بثقة لا بتخمين.",
    badge1: "منصة ERP حديثة",
    badge2: "جاهز عالمياً",
    cta: "اقرأ قصتنا",
  },
};

const MissionSection = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section dir={dir} className="relative py-24 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#FAFAFE] to-[#EDE7FF]/30" />
      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <div className="flex flex-col gap-6">
          <span className="rw-eyebrow">{t.eyebrow}</span>
          <h2 className="rw-title">{t.title}</h2>
          <p className="text-[#5B5470] text-base sm:text-lg leading-relaxed">{t.p1}</p>
          <p className="text-[#5B5470] text-base sm:text-lg leading-relaxed">{t.p2}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            {[t.badge1, t.badge2].map((badge, i) => (
              <span
                key={badge}
                className="inline-flex items-center gap-2 rounded-full border border-[#EDE7FF] bg-white px-4 py-2 text-sm font-semibold text-[#2D1B69] shadow-sm"
              >
                {i === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-[#8B5FD6]" />
                ) : (
                  <Globe className="h-4 w-4 text-[#8B5FD6]" />
                )}
                {badge}
              </span>
            ))}
          </div>

          <Link
            href={`/${lang}/about`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B5FD6] hover:text-[#7A52C2] mt-2 group w-fit"
          >
            {t.cta}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-[#8B5FD6]/15 to-[#C4A8F0]/10 blur-2xl" />
          <div className="relative w-full max-w-md">
            <div className="absolute -top-4 -right-4 rtl:right-auto rtl:-left-4 z-20 rw-glass rounded-2xl px-4 py-3 shadow-lg">
              <p className="text-xs font-bold text-[#8B5FD6]">Live sync</p>
              <p className="text-[10px] text-[#5B5470] mt-0.5">
                {lang === "ar" ? "بيانات فورية عبر الفروع" : "Real-time across branches"}
              </p>
            </div>
            <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden border border-[#EDE7FF] shadow-[0_24px_48px_rgba(139,95,214,0.15)]">
              <Image src="/purple-boxes.png" alt="" fill className="object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-5 rtl:left-auto rtl:-right-5 rw-card px-5 py-4 max-w-[200px]">
              <p className="text-2xl font-extrabold text-[#8B5FD6]">99.9%</p>
              <p className="text-xs text-[#5B5470] mt-1">
                {lang === "ar" ? "دقة في العمليات" : "Operational accuracy"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
