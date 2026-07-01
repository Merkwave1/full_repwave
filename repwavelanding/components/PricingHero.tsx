type Lang = "en" | "ar";

const translations = {
  en: {
    eyebrow: "Simple & scalable",
    title: "Plans for every stage of growth",
    subtitle:
      "Choose the plan that's right for your business. All plans include core ERP modules with no hidden fees.",
  },
  ar: {
    eyebrow: "بسيط وقابل للتوسع",
    title: "خطط لكل مرحلة من مراحل النمو",
    subtitle:
      "اختر الخطة المناسبة لأعمالك. تتضمن جميع الخطط وحدات ERP الأساسية دون رسوم خفية.",
  },
};

const PricingHero = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section dir={dir} className="relative rw-mesh pt-28 pb-10 px-6 sm:px-10 text-center overflow-hidden">
      <div className="absolute inset-0 rw-dot-grid opacity-40 pointer-events-none" />
      <div className="relative max-w-2xl mx-auto">
        <span className="rw-eyebrow justify-center mb-5">{t.eyebrow}</span>
        <h1 className="rw-title mt-3">{t.title}</h1>
        <p className="mt-4 text-[#5B5470] text-base sm:text-lg leading-relaxed">
          {t.subtitle}
        </p>
      </div>
    </section>
  );
};

export default PricingHero;
