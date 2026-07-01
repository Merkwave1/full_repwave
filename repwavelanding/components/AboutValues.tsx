"use client";
import { useState } from "react";
import { Shield, Zap, Globe, Heart, Code2, Users } from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    badge: "WHAT DRIVES US",
    title: "Our Core Values",
    subtitle:
      "These aren't words on a wall. They are the principles that shape every product decision, every support interaction, and every hire we make.",
    values: [
      {
        icon: "zap",
        color: "bg-amber-100 text-amber-600",
        title: "Speed Without Compromise",
        short: "We ship fast and build right.",
        detail:
          "We believe velocity and quality aren't opposites. Our teams run two-week sprints with rigorous code review, meaning you get new features quickly without sacrificing stability.",
      },
      {
        icon: "shield",
        color: "bg-green-100 text-green-600",
        title: "Security First",
        short: "Your data is your data.",
        detail:
          "AES-256 encryption at rest, TLS 1.3 in transit, SOC 2 Type II compliant, and regular third-party penetration testing. We treat your business data with the seriousness it deserves.",
      },
      {
        icon: "globe",
        color: "bg-[#EDE7FF] text-[#8B5FD6]",
        title: "Built Globally",
        short: "Designed for every market.",
        detail:
          "From Arabic RTL layouts to multi-currency support and regional tax compliance, Repwave is engineered from day one to work everywhere your business operates.",
      },
      {
        icon: "heart",
        color: "bg-rose-100 text-rose-600",
        title: "Customer Obsession",
        short: "Your success is our success.",
        detail:
          "Every roadmap decision starts with a customer interview. Our NPS score is 72 — not because we chase metrics, but because we genuinely listen and act.",
      },
      {
        icon: "code",
        color: "bg-purple-100 text-purple-600",
        title: "Radical Simplicity",
        short: "Powerful tools, zero confusion.",
        detail:
          "ERP software has a reputation for being complicated. We reject that. Every UI screen goes through usability testing before it ships — if a warehouse worker can't use it on day one, it goes back.",
      },
      {
        icon: "users",
        color: "bg-teal-100 text-teal-600",
        title: "Transparency",
        short: "No surprises, ever.",
        detail:
          "Public status page, honest pricing, visible roadmap, and changelogs for every release. We believe our customers deserve to know exactly what they're getting and when.",
      },
    ],
  },
  ar: {
    badge: "ما يحركنا",
    title: "قيمنا الجوهرية",
    subtitle:
      "هذه ليست مجرد كلمات على الجدار. إنها المبادئ التي تشكّل كل قرار في المنتج، وكل تفاعل في الدعم، وكل توظيف نقوم به.",
    values: [
      {
        icon: "zap",
        color: "bg-amber-100 text-amber-600",
        title: "السرعة دون تنازل",
        short: "نطور بسرعة ونبني بإتقان.",
        detail:
          "نعتقد أن السرعة والجودة ليستا نقيضتين. تعمل فرقنا بدورات أسبوعين مع مراجعة دقيقة للكود، مما يعني حصولك على ميزات جديدة بسرعة دون التضحية بالاستقرار.",
      },
      {
        icon: "shield",
        color: "bg-green-100 text-green-600",
        title: "الأمان أولاً",
        short: "بياناتك هي بياناتك.",
        detail:
          "تشفير AES-256 في حالة الراحة، وTLS 1.3 أثناء النقل، وامتثال SOC 2 Type II، واختبارات اختراق منتظمة من طرف ثالث. نتعامل مع بيانات أعمالك بالجدية التي تستحقها.",
      },
      {
        icon: "globe",
        color: "bg-[#EDE7FF] text-[#8B5FD6]",
        title: "مبني عالمياً",
        short: "مصمم لكل سوق.",
        detail:
          "من تخطيطات RTL العربية إلى دعم العملات المتعددة والامتثال الضريبي الإقليمي، تم تصميم Repwave من اليوم الأول للعمل في كل مكان تعمل فيه أعمالك.",
      },
      {
        icon: "heart",
        color: "bg-rose-100 text-rose-600",
        title: "هوس بالعميل",
        short: "نجاحك هو نجاحنا.",
        detail:
          "كل قرار في خارطة الطريق يبدأ بمقابلة مع عميل. درجة NPS لدينا 72 — ليس لأننا نطارد المقاييس، بل لأننا نستمع فعلاً ونتصرف.",
      },
      {
        icon: "code",
        color: "bg-purple-100 text-purple-600",
        title: "البساطة الجذرية",
        short: "أدوات قوية، صفر تعقيد.",
        detail:
          "برامج ERP لها سمعة بالتعقيد. نحن نرفض ذلك. كل شاشة UI تمر عبر اختبارات قابلية الاستخدام قبل الإطلاق — إذا لم يستطع عامل المستودع استخدامها في اليوم الأول، فإنها تعود للتحسين.",
      },
      {
        icon: "users",
        color: "bg-teal-100 text-teal-600",
        title: "الشفافية",
        short: "لا مفاجآت، أبداً.",
        detail:
          "صفحة حالة عامة، أسعار واضحة، خارطة طريق مرئية، وسجلات تغييرات لكل إصدار. نعتقد أن عملاءنا يستحقون معرفة ما يحصلون عليه بالضبط ومتى.",
      },
    ],
  },
};

const iconMap = {
  zap: Zap,
  shield: Shield,
  globe: Globe,
  heart: Heart,
  code: Code2,
  users: Users,
};

const AboutValues = ({ lang }: { lang: Lang }) => {
  const [active, setActive] = useState<number | null>(null);
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section dir={dir} className="bg-[#F8FAFC] py-20 px-6 sm:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#8B5FD6] mb-3 block">
            {t.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937]">
            {t.title}
          </h2>
          <p className="mt-3 text-gray-500 text-base max-w-xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.values.map((val, i) => {
            const Icon = iconMap[val.icon as keyof typeof iconMap];
            const isActive = active === i;
            return (
              <button
                key={val.title}
                onClick={() => setActive(isActive ? null : i)}
                className={`text-start p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-[#2D1B69] border-[#8B5FD6]/50 shadow-xl"
                    : "bg-white border-gray-200 hover:border-[#C4A8F0] hover:shadow-md"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                    isActive ? "bg-[#8B5FD6]/20" : val.color
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-[#C4A8F0]" : ""}`}
                  />
                </div>
                <h3
                  className={`font-bold text-base mb-1 transition-colors duration-300 ${
                    isActive ? "text-white" : "text-[#1F2937]"
                  }`}
                >
                  {val.title}
                </h3>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isActive ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  {isActive ? val.detail : val.short}
                </p>
                {!isActive && (
                  <span className="inline-block mt-3 text-xs font-semibold text-[#8B5FD6]">
                    {lang === "ar" ? "اعرف أكثر ←" : "Learn more →"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutValues;
