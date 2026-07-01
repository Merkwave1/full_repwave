"use client";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    monthly: "Monthly",
    yearly: "Yearly",
    save: "Save 20%",
    mostPopular: "MOST POPULAR",
    startTrial: "Start Free Trial",
    contactSales: "Contact Sales",
    plans: [
      {
        name: "Starter",
        tagline: "Perfect for small teams getting started.",
        monthlyPrice: "$49",
        yearlyPrice: "$39",
        period: "/mo",
        cta: "startTrial",
        featuresLabel: "INCLUDED FEATURES",
        features: [
          "Up to 5 user accounts",
          "Basic Inventory Tracking",
          "Core User Management",
          "Email Support",
        ],
        popular: false,
      },
      {
        name: "Professional",
        tagline: "Advanced tools for growing businesses.",
        monthlyPrice: "$149",
        yearlyPrice: "$119",
        period: "/mo",
        cta: "startTrial",
        featuresLabel: "EVERYTHING IN STARTER PLUS",
        features: [
          "Unlimited users",
          "Multi-warehouse Inventory",
          "Advanced Reporting & Analytics",
          "Full API Access",
          "Priority 24/7 Support",
        ],
        popular: true,
      },
      {
        name: "Enterprise",
        tagline: "Custom solutions for large-scale operations.",
        monthlyPrice: "Custom",
        yearlyPrice: "Custom",
        period: "",
        cta: "contactSales",
        featuresLabel: "ENTERPRISE FEATURES",
        features: [
          "Custom User Roles & Permissions",
          "Global Supply Chain Module",
          "Dedicated Account Manager",
          "On-premise Deployment Options",
          "Custom Integration Support",
        ],
        popular: false,
      },
    ],
  },
  ar: {
    monthly: "شهري",
    yearly: "سنوي",
    save: "وفر 20%",
    mostPopular: "الأكثر شيوعاً",
    startTrial: "ابدأ التجربة المجانية",
    contactSales: "تواصل مع المبيعات",
    plans: [
      {
        name: "المبتدئ",
        tagline: "مثالي للفرق الصغيرة في بداية مشوارها.",
        monthlyPrice: "$49",
        yearlyPrice: "$39",
        period: "/شهر",
        cta: "startTrial",
        featuresLabel: "الميزات المتضمنة",
        features: [
          "حتى 5 حسابات مستخدم",
          "تتبع المخزون الأساسي",
          "إدارة المستخدمين الأساسية",
          "دعم البريد الإلكتروني",
        ],
        popular: false,
      },
      {
        name: "الاحترافي",
        tagline: "أدوات متقدمة للأعمال المتنامية.",
        monthlyPrice: "$149",
        yearlyPrice: "$119",
        period: "/شهر",
        cta: "startTrial",
        featuresLabel: "كل شيء في باقة المبتدئ وأكثر",
        features: [
          "مستخدمون غير محدودون",
          "مخزون متعدد المستودعات",
          "التقارير والتحليلات المتقدمة",
          "الوصول الكامل لـ API",
          "دعم أولوي على مدار الساعة",
        ],
        popular: true,
      },
      {
        name: "المؤسسات",
        tagline: "حلول مخصصة للعمليات واسعة النطاق.",
        monthlyPrice: "مخصص",
        yearlyPrice: "مخصص",
        period: "",
        cta: "contactSales",
        featuresLabel: "ميزات المؤسسات",
        features: [
          "أدوار وصلاحيات مستخدمين مخصصة",
          "وحدة سلسلة التوريد العالمية",
          "مدير حساب مخصص",
          "خيارات النشر المحلية",
          "دعم التكامل المخصص",
        ],
        popular: false,
      },
    ],
  },
};

const PricingCards = ({ lang }: { lang: Lang }) => {
  const [yearly, setYearly] = useState(false);
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section dir={dir} className="pb-16 sm:pb-24 px-4 sm:px-6 lg:px-10 bg-[#FAFAFE]">
      <div className="flex items-center justify-center gap-3 mb-10 sm:mb-14">
        <span className={`text-sm font-semibold ${!yearly ? "text-[#2D1B69]" : "text-[#9CA3AF]"}`}>
          {t.monthly}
        </span>
        <button
          onClick={() => setYearly((v) => !v)}
          className={`relative inline-flex w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5FD6]/40 ${
            yearly ? "bg-[#8B5FD6]" : "bg-[#EDE7FF]"
          }`}
          aria-label="Toggle billing period"
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
              yearly ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-sm font-semibold ${yearly ? "text-[#2D1B69]" : "text-[#9CA3AF]"}`}>
          {t.yearly}
        </span>
        {yearly && (
          <span className="bg-[#EDE7FF] text-[#7A52C2] text-[11px] font-bold px-3 py-1 rounded-full">
            {t.save}
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-5">
        {t.plans.map((plan) => {
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isPro = plan.popular;

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[1.5rem] transition-all duration-300 ${
                isPro
                  ? "bg-gradient-to-b from-[#2D1B69] to-[#1A0F35] text-white shadow-[0_32px_64px_rgba(45,27,105,0.35)] mt-5 md:mt-0 md:-translate-y-4 ring-1 ring-[#8B5FD6]/30"
                  : "rw-card text-[#2D1B69] hover:!transform-none"
              }`}
            >
              {/* Most popular badge */}
              {isPro && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[#8B5FD6] text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow">
                    {t.mostPopular}
                  </span>
                </div>
              )}

              <div className="p-5 sm:p-8 flex flex-col flex-1">
                {/* Plan name & tagline */}
                <div className="mb-4 sm:mb-6 mt-2">
                  <h2
                    className={`text-xl font-bold mb-1 ${
                      isPro ? "text-white" : "text-[#1F2937]"
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <p
                    className={`text-sm ${
                      isPro ? "text-slate-400" : "text-gray-500"
                    }`}
                  >
                    {plan.tagline}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-4 sm:mb-6 flex items-end gap-1">
                  <span
                    className={`font-extrabold leading-none ${
                      plan.period
                        ? "text-3xl sm:text-4xl md:text-5xl"
                        : "text-2xl sm:text-3xl md:text-4xl"
                    } ${isPro ? "text-white" : "text-[#1F2937]"}`}
                  >
                    {price}
                  </span>
                  {plan.period && (
                    <span
                      className={`text-sm mb-1 ${
                        isPro ? "text-slate-400" : "text-gray-400"
                      }`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>

                {/* CTA button */}
                <Link
                  href={
                    plan.cta === "startTrial"
                      ? `/${lang}/try-now`
                      : `/${lang}/contact`
                  }
                  className={`block text-center text-sm font-semibold py-3 px-6 rounded-xl border transition-all duration-200 mb-5 sm:mb-8 ${
                    isPro
                      ? "bg-white text-[#2D1B69] border-white hover:bg-slate-100"
                      : "bg-transparent text-[#1F2937] border-gray-300 hover:border-[#1F2937] hover:bg-gray-50"
                  }`}
                >
                  {plan.cta === "startTrial" ? t.startTrial : t.contactSales}
                </Link>

                {/* Divider */}
                <div
                  className={`border-t mb-4 sm:mb-6 ${
                    isPro ? "border-slate-700" : "border-gray-100"
                  }`}
                />

                {/* Features label */}
                <p
                  className={`text-[10px] font-bold tracking-wide sm:tracking-widest uppercase mb-3 sm:mb-4 ${
                    isPro ? "text-slate-400" : "text-gray-400"
                  }`}
                >
                  {plan.featuresLabel}
                </p>

                {/* Features list */}
                <ul className="flex flex-col gap-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isPro ? "bg-[#8B5FD6]" : "bg-[#EDE7FF]"
                        }`}
                      >
                        <Check
                          className={`w-3 h-3 ${
                            isPro ? "text-white" : "text-[#8B5FD6]"
                          }`}
                          strokeWidth={3}
                        />
                      </span>
                      <span
                        className={`text-sm ${
                          isPro ? "text-slate-300" : "text-gray-600"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PricingCards;
