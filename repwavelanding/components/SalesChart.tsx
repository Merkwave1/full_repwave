"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Lang = "en" | "ar";

const PulsingDot = (props: {
  cx?: number;
  cy?: number;
  [key: string]: unknown;
}) => {
  const { cx = 0, cy = 0 } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#8B5FD6" />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="none"
        stroke="#8B5FD6"
        strokeWidth={1.5}
      >
        <animate
          attributeName="r"
          from="4"
          to="16"
          dur="2.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.7"
          to="0"
          dur="2.2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
};

const dataEn = [
  { month: "Jan", sales: 120000 },
  { month: "Feb", sales: 145000 },
  { month: "Mar", sales: 138000 },
  { month: "Apr", sales: 172000 },
  { month: "May", sales: 195000 },
  { month: "Jun", sales: 210000 },
  { month: "Jul", sales: 230000 },
  { month: "Aug", sales: 255000 },
  { month: "Sep", sales: 278000 },
  { month: "Oct", sales: 305000 },
  { month: "Nov", sales: 332000 },
  { month: "Dec", sales: 370000 },
];

const dataAr = [
  { month: "يناير", sales: 120000 },
  { month: "فبراير", sales: 145000 },
  { month: "مارس", sales: 138000 },
  { month: "أبريل", sales: 172000 },
  { month: "مايو", sales: 195000 },
  { month: "يونيو", sales: 210000 },
  { month: "يوليو", sales: 230000 },
  { month: "أغسطس", sales: 255000 },
  { month: "سبتمبر", sales: 278000 },
  { month: "أكتوبر", sales: 305000 },
  { month: "نوفمبر", sales: 332000 },
  { month: "ديسمبر", sales: 370000 },
];

const labels = {
  en: {
    title: "Annual Sales Growth",
    subtitle: "Track how revenue scales with Repwave ERP",
    sales: "Sales ($)",
  },
  ar: {
    title: "نمو المبيعات السنوي",
    subtitle: "تتبع كيف ينمو الإيراد مع Repwave ERP",
    sales: "المبيعات ($)",
  },
};

const formatValue = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

const SalesChart = ({ lang }: { lang: Lang }) => {
  const t = labels[lang] ?? labels.en;
  const fullData = lang === "ar" ? dataAr : dataEn;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // On mobile show every other month (6 points), on desktop all 12
  const data = isMobile ? fullData.filter((_, i) => i % 2 === 0) : fullData;

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setAnimKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <>
      <style>{`
        @keyframes chartGlow {
          0%, 100% { filter: drop-shadow(0 0 5px #8B5FD680); }
          50%       { filter: drop-shadow(0 0 18px #8B5FD6cc); }
        }
        @keyframes titlePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.75; }
        }
        .chart-glow-wrap { animation: chartGlow 3.5s ease-in-out infinite; }
        .chart-title-pulse { animation: titlePulse 3.5s ease-in-out infinite; }
      `}</style>
      <div ref={ref} className="relative bg-gradient-to-b from-[#2D1B69] via-[#251456] to-[#1A0F35] py-14 px-6 sm:px-10 lg:px-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-[#8B5FD6]/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-[#C4A8F0]/10 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white chart-title-pulse">
              {t.title}
            </h3>
            <p className="text-[#C4A8F0]/90 mt-2 text-sm sm:text-base">
              {t.subtitle}
            </p>
          </div>

          <div className="w-full h-64 sm:h-80 chart-glow-wrap rounded-2xl border border-[#8B5FD6]/20 bg-[#1A0F35]/40 backdrop-blur-sm p-4 sm:p-6">
            {visible && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  key={animKey}
                  data={data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#8B5FD6"
                        stopOpacity={0.35}
                      />
                      <stop offset="95%" stopColor="#8B5FD6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8B5FD6" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#C4A8F0", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatValue}
                    tick={{ fill: "#C4A8F0", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString()}`,
                      t.sales,
                    ]}
                    contentStyle={{
                      backgroundColor: "#2D1B69",
                      border: "1px solid #8B5FD6",
                      borderRadius: 12,
                      color: "#FFFFFF",
                      boxShadow: "0 12px 30px rgba(139,95,214,0.25)",
                    }}
                    labelStyle={{ color: "#C4A8F0", fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#8B5FD6"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                    dot={<PulsingDot />}
                    activeDot={{
                      r: 6,
                      fill: "#fff",
                      stroke: "#8B5FD6",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={true}
                    animationDuration={1800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesChart;
