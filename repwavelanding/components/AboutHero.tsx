"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

type Lang = "en" | "ar";

const BAR_HEIGHTS = [
  22, 38, 55, 70, 58, 40, 62, 78, 65, 44, 68, 85, 70, 48, 75, 85, 70, 46, 64,
  80, 60, 38, 58, 74, 55, 35, 48, 25,
];
const TOTAL = BAR_HEIGHTS.length;

function WaveVisualizer({ lang }: { lang: string }) {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseX((e.clientX - rect.left) / rect.width);
  };

  const handleClick = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 500);
  };

  return (
    <div
      className="w-full max-w-xl mx-auto cursor-crosshair select-none rounded-2xl border border-[#8B5FD6]/25 bg-[#1A0F35]/50 backdrop-blur-sm px-5 sm:px-8 py-6 shadow-[0_20px_50px_rgba(139,95,214,0.15)]"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMouseX(null)}
      onClick={handleClick}
    >
      <div className="flex items-center justify-center gap-2 mb-5">
        <Sparkles className="h-3.5 w-3.5 text-[#C4A8F0]" />
        <p className="text-center text-[11px] text-[#C4A8F0] tracking-widest uppercase font-semibold">
          {lang === "ar"
            ? "حرّك المؤشر فوق الموجة"
            : "Move your cursor across the wave"}
        </p>
        <Sparkles className="h-3.5 w-3.5 text-[#C4A8F0]" />
      </div>

      <div className="flex items-end justify-center gap-1 h-28 sm:h-32 px-1">
        {BAR_HEIGHTS.map((base, i) => {
          const pos = i / (TOTAL - 1);
          const influence =
            mouseX !== null ? Math.max(0, 1 - Math.abs(pos - mouseX) * 5.5) : 0;
          const pulseBoost = pulse
            ? Math.max(0, 1 - Math.abs(pos - 0.5) * 3)
            : 0;
          const heightPct = Math.min(
            100,
            base + influence * (100 - base) + pulseBoost * 30,
          );
          const opacity = 0.35 + influence * 0.55 + pulseBoost * 0.25;
          const r = Math.round(139 + influence * 36);
          const g = Math.round(95 + influence * 70);
          const b = Math.round(214 - influence * 24);

          return (
            <div
              key={i}
              className="rounded-full min-w-[5px] sm:min-w-[6px] flex-1 max-w-[8px]"
              style={{
                height: `${heightPct}%`,
                backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
                boxShadow:
                  influence > 0.4
                    ? `0 0 12px rgba(196, 168, 240, ${influence * 0.6})`
                    : undefined,
                transition: "height 120ms ease, background-color 120ms ease, box-shadow 120ms ease",
              }}
            />
          );
        })}
      </div>

      <p className="text-center text-[10px] text-[#EDE7FF]/70 mt-5 font-bold tracking-[0.25em] uppercase">
        RepWave — Data in Motion
      </p>
    </div>
  );
}

const translations = {
  en: {
    badge: "BUILT FOR OPERATORS",
    title: "A New Kind of",
    titleAccent: "Business Platform",
    subtitle:
      "Repwave is an early-stage ERP platform built from scratch for businesses that can't afford to waste time on broken tools. Lean, fast, and designed to grow beside you.",
    cta: "See Our Plans",
    ctaSecondary: "Read Our Story",
    pillars: [
      { value: "5+", label: "Core Modules" },
      { value: "AR + EN", label: "Bilingual Native" },
      { value: "Real-Time", label: "Live Data Sync" },
      { value: "API-First", label: "Architecture" },
    ],
  },
  ar: {
    badge: "مبني لأصحاب العمليات",
    title: "نوع جديد من",
    titleAccent: "منصات الأعمال",
    subtitle:
      "Repwave منصة ERP في مرحلة مبكرة، بُنيت من الصفر للشركات التي لا تستطيع تحمّل إضاعة الوقت في أدوات متكسرة. خفيفة، سريعة، ومصممة لتنمو بجانبك.",
    cta: "اطّلع على الخطط",
    ctaSecondary: "اقرأ قصتنا",
    pillars: [
      { value: "+5", label: "وحدات أساسية" },
      { value: "ع + EN", label: "ثنائي اللغة" },
      { value: "فوري", label: "مزامنة البيانات" },
      { value: "API أولاً", label: "البنية التقنية" },
    ],
  },
};

const AboutHero = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section
      dir={dir}
      className="relative bg-gradient-to-b from-[#2D1B69] to-[#1A0F35] overflow-hidden pt-24 pb-20 px-6 sm:px-10"
    >
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#8B5FD6]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#C4A8F0]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
        <span className="inline-block border border-[#8B5FD6]/40 bg-[#8B5FD6]/10 text-[#C4A8F0] text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">
          {t.badge}
        </span>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
          {t.title}{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-[#C4A8F0] to-[#8B5FD6]">
            {t.titleAccent}
          </span>
        </h1>

        <p className="text-[#EDE7FF]/75 text-base sm:text-lg leading-relaxed max-w-2xl">
          {t.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href={`/${lang}/pricing`}
            className="bg-[#8B5FD6] hover:bg-[#7A52C2] text-white font-semibold px-7 py-3 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-[#8B5FD6]/25"
          >
            {t.cta}
          </Link>
          <a
            href="#story"
            className="border border-[#8B5FD6]/40 hover:border-[#C4A8F0] text-[#EDE7FF] hover:text-white font-semibold px-7 py-3 rounded-xl transition-all duration-200 bg-[#8B5FD6]/5"
          >
            {t.ctaSecondary}
          </a>
        </div>

        <div className="w-full mt-8 border-t border-[#8B5FD6]/20 pt-10">
          <WaveVisualizer lang={lang} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full border-t border-[#8B5FD6]/20 pt-10 mt-2">
          {t.pillars.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-1">
              <span className="text-xl sm:text-2xl font-extrabold text-white">
                {p.value}
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-[#C4A8F0]/80 uppercase text-center">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutHero;
