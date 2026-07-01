"use client";
import { useState } from "react";

type Lang = "en" | "ar";

const translations = {
  en: {
    badge: "PRODUCT TIMELINE",
    title: "How We Built It",
    milestones: [
      {
        year: "2021",
        quarter: "Q1",
        title: "The Spark",
        description:
          "A founding team of operators, tired of stitching together spreadsheets and disconnected apps to run a business. We decided to build the tool we always needed — starting with a blank canvas and one clear problem to solve.",
        tag: "Founded",
        tagColor: "bg-[#EDE7FF] text-[#7A52C2]",
      },
      {
        year: "2021",
        quarter: "Q4",
        title: "Inventory Core",
        description:
          "Shipped the first Repwave module: real-time stock tracking across locations. Scan in, scan out, live quantity updates, low-stock alerts. The foundation of the entire platform.",
        tag: "Feature",
        tagColor: "bg-green-100 text-green-700",
      },
      {
        year: "2022",
        quarter: "Q1",
        title: "Arabic-First RTL",
        description:
          "Built full right-to-left interface support and Arabic localization — one of the first modern ERP platforms built this way from the ground up, not bolted on as an afterthought.",
        tag: "Feature",
        tagColor: "bg-purple-100 text-purple-700",
      },
      {
        year: "2022",
        quarter: "Q4",
        title: "Sales & Invoicing",
        description:
          "End-to-end sales workflow: create quotes, convert to invoices, record payments, track outstanding balances, and manage customer ledgers — all in one screen.",
        tag: "Feature",
        tagColor: "bg-green-100 text-green-700",
      },
      {
        year: "2023",
        quarter: "Q2",
        title: "Multi-Warehouse",
        description:
          "As businesses grow, so do their locations. Multi-warehouse management lets operators see every SKU, across every site, in one unified view — with inter-warehouse transfer tracking built in.",
        tag: "Feature",
        tagColor: "bg-teal-100 text-teal-700",
      },
      {
        year: "2023",
        quarter: "Q4",
        title: "Live Analytics",
        description:
          "Real-time dashboards and a full reporting engine. Stop waiting for end-of-month exports. See your best-selling products, slowest movers, revenue by period, and purchase trends as they happen.",
        tag: "Feature",
        tagColor: "bg-green-100 text-green-700",
      },
      {
        year: "2024",
        quarter: "Q3",
        title: "Open API",
        description:
          "A developer-first REST API giving businesses the ability to connect Repwave to their storefront, accounting software, logistics partners, or any third-party tool without writing ERP boilerplate.",
        tag: "Feature",
        tagColor: "bg-amber-100 text-amber-700",
      },
      {
        year: "2025",
        quarter: "Q2",
        title: "AI Demand Forecasting",
        description:
          "A machine learning model trained on your historical sales and inventory data to predict future demand, flag likely stockouts weeks in advance, and suggest optimal reorder quantities.",
        tag: "Feature",
        tagColor: "bg-rose-100 text-rose-700",
      },
      {
        year: "2026",
        quarter: "Now",
        title: "What's Next",
        description:
          "Building the unified commerce layer — a single pane of glass connecting storefront, warehouse, supplier network, and finance. If data touches your business, it will flow through Repwave.",
        tag: "Roadmap",
        tagColor: "bg-slate-100 text-slate-700",
      },
    ],
  },
  ar: {
    badge: "الجدول الزمني للمنتج",
    title: "كيف بنيناه",
    milestones: [
      {
        year: "2021",
        quarter: "ر1",
        title: "الشرارة",
        description:
          "فريق مؤسسين من أصحاب العمليات، تعبوا من ربط جداول البيانات والتطبيقات المتشتتة لإدارة أعمالهم. قررنا بناء الأداة التي احتجناها دائماً — بدءاً من صفحة بيضاء ومشكلة واحدة واضحة للحل.",
        tag: "تأسيس",
        tagColor: "bg-[#EDE7FF] text-[#7A52C2]",
      },
      {
        year: "2021",
        quarter: "ر4",
        title: "وحدة المخزون الأساسية",
        description:
          "أطلقنا أول وحدة في Repwave: تتبع المخزون في الوقت الفعلي عبر المواقع. فحص الدخول والخروج، تحديثات الكمية اللحظية، تنبيهات انخفاض المخزون. الأساس الذي تقوم عليه المنصة.",
        tag: "ميزة",
        tagColor: "bg-green-100 text-green-700",
      },
      {
        year: "2022",
        quarter: "ر1",
        title: "العربية أولاً RTL",
        description:
          "بنينا دعم الواجهة من اليمين إلى اليسار والتوطين الكامل باللغة العربية — من أوائل منصات ERP الحديثة المبنية هكذا من الصفر، لا كإضافة لاحقة.",
        tag: "ميزة",
        tagColor: "bg-purple-100 text-purple-700",
      },
      {
        year: "2022",
        quarter: "ر4",
        title: "المبيعات والفواتير",
        description:
          "سير عمل مبيعات متكامل: إنشاء عروض الأسعار، تحويلها إلى فواتير، تسجيل المدفوعات، تتبع الأرصدة المستحقة، وإدارة دفاتر العملاء — كل ذلك في شاشة واحدة.",
        tag: "ميزة",
        tagColor: "bg-green-100 text-green-700",
      },
      {
        year: "2023",
        quarter: "ر2",
        title: "تعدد المستودعات",
        description:
          "مع نمو الأعمال تتعدد المواقع. إدارة المستودعات المتعددة تتيح للمشغلين رؤية كل منتج، في كل موقع، في عرض موحد واحد — مع تتبع عمليات النقل بين المستودعات.",
        tag: "ميزة",
        tagColor: "bg-teal-100 text-teal-700",
      },
      {
        year: "2023",
        quarter: "ر4",
        title: "التحليلات اللحظية",
        description:
          "لوحات تحكم في الوقت الفعلي ومحرك تقارير متكامل. توقف عن انتظار تصديرات نهاية الشهر. شاهد أكثر منتجاتك مبيعاً، وأبطأها حركةً، والإيرادات حسب الفترة الزمنية، فور حدوثها.",
        tag: "ميزة",
        tagColor: "bg-green-100 text-green-700",
      },
      {
        year: "2024",
        quarter: "ر3",
        title: "الواجهة البرمجية المفتوحة",
        description:
          "REST API موجهة للمطورين تمنح الشركات القدرة على ربط Repwave بمتجرها الإلكتروني أو برنامج المحاسبة أو شركاء الخدمات اللوجستية أو أي أداة خارجية دون كتابة كود ERP معقد.",
        tag: "ميزة",
        tagColor: "bg-amber-100 text-amber-700",
      },
      {
        year: "2025",
        quarter: "ر2",
        title: "التنبؤ بالطلب بالذكاء الاصطناعي",
        description:
          "نموذج تعلم آلي مدرّب على بيانات مبيعاتك ومخزونك التاريخية للتنبؤ بالطلب المستقبلي، وتنبيه نفاد المخزون قبل أسابيع، واقتراح كميات إعادة الطلب المثلى.",
        tag: "ميزة",
        tagColor: "bg-rose-100 text-rose-700",
      },
      {
        year: "2026",
        quarter: "الآن",
        title: "ما التالي",
        description:
          "بناء طبقة التجارة الموحدة — لوحة تحكم واحدة تربط المتجر الإلكتروني بالمستودع وشبكة الموردين والتمويل. إذا كانت البيانات تلمس أعمالك، فستتدفق عبر Repwave.",
        tag: "خارطة الطريق",
        tagColor: "bg-slate-100 text-slate-700",
      },
    ],
  },
};

const AboutTimeline = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [selected, setSelected] = useState(0);

  const ms = t.milestones;

  return (
    <section dir={dir} className="bg-white py-20 px-6 sm:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#8B5FD6] mb-3 block">
            {t.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937]">
            {t.title}
          </h2>
        </div>

        {/* Timeline selector — horizontal scroll on mobile */}
        <div className="relative mb-10 overflow-x-auto pb-2">
          <div className="flex gap-0 min-w-max mx-auto w-fit">
            {ms.map((m, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className="flex flex-col items-center gap-2 px-4 group cursor-pointer"
              >
                {/* Year label */}
                <span
                  className={`text-xs font-bold transition-colors duration-200 ${
                    selected === i
                      ? "text-[#8B5FD6]"
                      : "text-gray-400 group-hover:text-gray-600"
                  }`}
                >
                  {m.year}
                </span>
                {/* Dot + line */}
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                      selected === i
                        ? "bg-[#8B5FD6] border-[#8B5FD6] scale-125"
                        : "bg-white border-gray-300 group-hover:border-[#C4A8F0]"
                    }`}
                  />
                </div>
                {/* Quarter */}
                <span
                  className={`text-[10px] font-semibold tracking-wider transition-colors duration-200 ${
                    selected === i ? "text-[#C4A8F0]" : "text-gray-300"
                  }`}
                >
                  {m.quarter}
                </span>
              </button>
            ))}
          </div>
          {/* Connecting line behind dots */}
          <div className="absolute top-[calc(0.75rem+1rem+2px)] left-0 right-0 h-0.5 bg-gray-100 -z-10" />
        </div>

        {/* Active milestone detail */}
        <div
          key={selected}
          className="bg-[#F8FAFC] border border-gray-200 rounded-2xl p-8 sm:p-10 animate-fade-in"
          style={{ animation: "fadeSlide 0.3s ease" }}
        >
          <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Left: year badge */}
            <div className="flex flex-col items-center sm:items-start gap-2 shrink-0">
              <span className="text-5xl font-extrabold text-[#1F2937]">
                {ms[selected].year}
              </span>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${ms[selected].tagColor}`}
              >
                {ms[selected].tag}
              </span>
            </div>
            {/* Divider */}
            <div className="hidden sm:block w-px self-stretch bg-gray-200" />
            {/* Right: content */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1F2937]">
                {ms[selected].title}
              </h3>
              <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
                {ms[selected].description}
              </p>
            </div>
          </div>

          {/* Navigation arrows */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setSelected((s) => Math.max(0, s - 1))}
              disabled={selected === 0}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#C4A8F0] hover:text-[#8B5FD6] disabled:opacity-30 transition-all duration-200 cursor-pointer"
            >
              {dir === "rtl" ? "→" : "←"}
            </button>
            <button
              onClick={() => setSelected((s) => Math.min(ms.length - 1, s + 1))}
              disabled={selected === ms.length - 1}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#C4A8F0] hover:text-[#8B5FD6] disabled:opacity-30 transition-all duration-200 cursor-pointer"
            >
              {dir === "rtl" ? "←" : "→"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutTimeline;
