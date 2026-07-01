"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutList, ReceiptText, Users, BarChart3 } from "lucide-react";
import SalesChart from "@/components/SalesChart";

type Lang = "en" | "ar";

const featureIcons = [LayoutList, ReceiptText, Users, BarChart3];

const translations = {
  en: {
    eyebrow: "Platform capabilities",
    sectionTitle: "Powerful tools to manage your business",
    sectionSubtitle:
      "Everything you need to run sales, inventory, customers, and operations — designed with clarity and speed in mind.",
    features: [
      {
        title: "Inventory Management",
        desc: "Track stock levels, manage warehouses, and monitor product availability in real time.",
      },
      {
        title: "Sales & Invoicing",
        desc: "Create invoices, track sales transactions, and manage customer orders with ease.",
      },
      {
        title: "Customer & Supplier Management",
        desc: "Keep all customer and supplier information organized in one centralized system.",
      },
      {
        title: "Reports & Insights",
        desc: "Get detailed reports and analytics to help you make smarter business decisions.",
      },
    ],
    stats: [
      { value: 99.9, suffix: "%", label: "Accuracy rate" },
      { value: 24, suffix: "/7", label: "Global support" },
      { value: 150, suffix: "+", label: "Ports covered" },
      { value: 30, suffix: "%", label: "Cost reduction" },
    ],
  },
  ar: {
    eyebrow: "قدرات المنصة",
    sectionTitle: "أدوات قوية لإدارة أعمالك",
    sectionSubtitle:
      "كل ما تحتاجه لإدارة المبيعات والمخزون والعملاء والعمليات — بتصميم واضح وسريع.",
    features: [
      {
        title: "إدارة المخزون",
        desc: "تتبع مستويات المخزون وإدارة المستودعات ورصد توافر المنتجات في الوقت الفعلي.",
      },
      {
        title: "المبيعات والفواتير",
        desc: "إنشاء الفواتير وتتبع معاملات المبيعات وإدارة طلبات العملاء بسهولة.",
      },
      {
        title: "إدارة العملاء والموردين",
        desc: "احتفظ بجميع معلومات العملاء والموردين منظمة في نظام مركزي واحد.",
      },
      {
        title: "التقارير والرؤى",
        desc: "احصل على تقارير وتحليلات تفصيلية لمساعدتك على اتخاذ قرارات تجارية أذكى.",
      },
    ],
    stats: [
      { value: 99.9, suffix: "%", label: "معدل الدقة" },
      { value: 24, suffix: "/7", label: "دعم عالمي" },
      { value: 150, suffix: "+", label: "ميناء مغطى" },
      { value: 30, suffix: "%", label: "تخفيض التكلفة" },
    ],
  },
};

function useCountUp(target: number, duration = 1800, started: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    const isDecimal = target % 1 !== 0;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setCount(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current));
      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration, started]);
  return count;
}

function StatItem({
  value,
  suffix,
  label,
  started,
}: {
  value: number;
  suffix: string;
  label: string;
  started: boolean;
}) {
  const count = useCountUp(value, 1800, started);
  return (
    <div className="relative flex flex-col items-center gap-2 text-center px-3 py-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <span className="text-4xl sm:text-5xl font-extrabold text-white leading-none tabular-nums">
        {count}
        <span className="text-[#C4A8F0]">{suffix}</span>
      </span>
      <span className="text-[11px] font-semibold tracking-wider text-[#EDE7FF]/75 uppercase">
        {label}
      </span>
    </div>
  );
}

const FeaturesSection = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" dir={dir} className="relative bg-[#FAFAFE]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-24">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="rw-eyebrow justify-center mb-4">{t.eyebrow}</span>
          <h2 className="rw-title mt-3">{t.sectionTitle}</h2>
          <p className="mt-4 text-[#5B5470] text-base sm:text-lg leading-relaxed">
            {t.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {t.features.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <article key={f.title} className="rw-card h-full p-6 flex flex-col gap-4 group">
                <div className="flex items-center justify-between">
                  <div className="rw-icon-ring group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <span className="text-xs font-bold text-[#C4A8F0] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#2D1B69] leading-snug min-h-[3.25rem]">
                  {f.title}
                </h3>
                <p className="text-sm text-[#5B5470] leading-relaxed flex-1">{f.desc}</p>
                <div className="h-1 w-0 group-hover:w-full rounded-full bg-gradient-to-r from-[#8B5FD6] to-[#C4A8F0] transition-all duration-500" />
              </article>
            );
          })}
        </div>
      </div>

      <div
        ref={statsRef}
        className="relative overflow-hidden bg-gradient-to-b from-[#2D1B69] to-[#1A0F35] py-16 px-6 sm:px-10 lg:px-16"
      >
        <div className="absolute inset-0 rw-dot-grid opacity-[0.07] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {t.stats.map((s, i) => (
            <StatItem
              key={i}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              started={statsVisible}
            />
          ))}
        </div>
      </div>

      <SalesChart lang={lang} />
    </section>
  );
};

export default FeaturesSection;
