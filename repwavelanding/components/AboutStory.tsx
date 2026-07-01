import { Lightbulb, Target, Rocket } from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    badge: "HOW IT STARTED",
    title: "From Frustration to Platform",
    paragraphs: [
      "We started Repwave because we experienced the problem ourselves. Running a business on disconnected tools — spreadsheets for stock, a separate app for invoicing, emails for supplier updates — isn't just frustrating. It costs real money, creates dangerous blind spots, and slows down every decision that matters.",
      "We looked at what existed for growing businesses and found a clear gap. Enterprise ERP systems were either built for organisations with full IT departments, or they were so stripped-down they offered little more than a digital ledger. Nothing in between was worth its price.",
      "So we started deliberately small — one core problem at a time. Every module in Repwave was shaped by real operators who told us what they needed. Every design choice came from watching real users struggle without it. We're still early, and we're proud of that.",
    ],
    pillars: [
      {
        icon: "lightbulb",
        title: "Born from real experience",
        desc: "Our founders ran businesses before building software. The pain points in Repwave are ones we felt personally.",
      },
      {
        icon: "target",
        title: "Feature discipline",
        desc: "We don't build what sounds cool. Every feature ships because an operator said it would change their day.",
      },
      {
        icon: "rocket",
        title: "Designed to scale with you",
        desc: "Start with inventory tracking. Add sales, warehousing, and analytics when you need them. Repwave grows at your pace.",
      },
    ],
  },
  ar: {
    badge: "كيف بدأت القصة",
    title: "من الإحباط إلى المنصة",
    paragraphs: [
      "بدأنا Repwave لأننا عشنا المشكلة بأنفسنا. إدارة أعمال عبر أدوات متفرقة — جداول بيانات للمخزون، وتطبيق منفصل للفواتير، وبريد إلكتروني لتحديثات الموردين — ليس مجرد إحباط. إنها تكلف مالاً حقيقياً، وتخلق نقاط عمى خطيرة، وتبطّئ كل قرار مهم.",
      "نظرنا إلى ما هو متاح للشركات المتنامية ووجدنا فجوةً واضحة. أنظمة ERP المؤسسية مبنية إما لمنظمات لديها أقسام تقنية كاملة، أو مجردة جدّاً لدرجة أنها لا تقدلم سوى سجل محاسبي رقمي. لم يكن هناك شيء بينهما يستحق ثمنه.",
      "لذا بدأنا بتعمد صغير، مشكلة واحدة في كل مرة. كل وحدة في Repwave كان شكلها مشغّلون حقيقيون أخبرونا بما يحتاجونه. كل خيار تصميمي جاء من مشاهدة مستخدمين حقيقيين يعانون بدونه. لا نزال في بداية مشوارنا، ونحن فخورون بذلك.",
    ],
    pillars: [
      {
        icon: "lightbulb",
        title: "وُلدت من تجربة حقيقية",
        desc: "أدار مؤسسونا أعمالاً قبل بناء البرمجيات. نقاط الألم في Repwave هي نقاط نفسية لنا شخصياً.",
      },
      {
        icon: "target",
        title: "انضباط الميزات",
        desc: "لا نبني ما يبدو رائعاً. كل ميزة تُطلق لأن مشغّلاً قال إنها ستغيّر يومه.",
      },
      {
        icon: "rocket",
        title: "مصممة لتتوسع معك",
        desc: "ابدأ بتتبع المخزون. أضف المبيعات والمستودعات والتحليلات عندما تحتاجها. Repwave تتوسع بوتيرتك.",
      },
    ],
  },
};

const iconMap = {
  lightbulb: Lightbulb,
  target: Target,
  rocket: Rocket,
};

const AboutStory = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section dir={dir} id={'story'} className="bg-white py-20 px-6 sm:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-14">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#8B5FD6] mb-3 block">
            {t.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937] max-w-xl leading-tight">
            {t.title}
          </h2>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Paragraphs */}
          <div className="flex flex-col gap-5">
            {t.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-gray-500 text-base sm:text-lg leading-relaxed"
              >
                {p}
              </p>
            ))}
          </div>

          {/* Pillars */}
          <div className="flex flex-col gap-6">
            {t.pillars.map((pillar) => {
              const Icon = iconMap[pillar.icon as keyof typeof iconMap];
              return (
                <div
                  key={pillar.title}
                  className="flex gap-4 p-5 rounded-2xl border border-gray-100 bg-[#F8FAFC] hover:border-[#EDE7FF] hover:shadow-sm transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EDE7FF] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#8B5FD6]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1F2937] mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStory;
