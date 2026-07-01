import { FileText, CheckCircle, XCircle, Scale, Copyright, AlertTriangle } from "lucide-react";

type Lang = "en" | "ar";

interface Props {
  params: Promise<{ lang: string }>;
}

const content = {
  en: {
    badge: "Legal",
    title: "Terms of Service",
    subtitle: "By using RepWave, you agree to these terms. Please read them carefully.",
    lastUpdated: "Last updated: January 1, 2026",
    sections: [
      {
        icon: "CheckCircle",
        title: "Acceptance of Terms",
        body: [
          "By accessing or using RepWave, you confirm that you are at least 18 years old and have the authority to enter into these terms on behalf of your organisation.",
          "If you do not agree to these terms, please do not use our services.",
          "We may update these terms at any time. Continued use after updates constitutes acceptance.",
        ],
      },
      {
        icon: "FileText",
        title: "Description of Services",
        body: [
          "RepWave provides cloud-based ERP software for business operations, inventory, sales, and logistics management.",
          "Services are provided on a subscription basis with plans detailed on our Pricing page.",
          "We reserve the right to modify, suspend, or discontinue any service with reasonable notice.",
          "Access to certain features may vary based on your subscription tier.",
        ],
      },
      {
        icon: "CheckCircle",
        title: "User Obligations",
        body: [
          "Maintain the confidentiality of your account credentials and notify us immediately of any unauthorised access.",
          "Use the platform only for lawful business purposes in compliance with applicable laws.",
          "Not attempt to reverse-engineer, decompile, or extract the source code of our software.",
          "Not use automated scripts or bots to access or scrape our systems without written permission.",
          "Keep your account and billing information accurate and up to date.",
        ],
      },
      {
        icon: "XCircle",
        title: "Prohibited Activities",
        body: [
          "Uploading malicious code, viruses, or any software intended to damage our systems.",
          "Attempting to gain unauthorised access to other users' accounts or data.",
          "Using RepWave to transmit spam, fraudulent, or illegal content.",
          "Reselling, sublicensing, or distributing access to RepWave without authorisation.",
        ],
      },
      {
        icon: "Copyright",
        title: "Intellectual Property",
        body: [
          "All software, designs, trademarks, and content on RepWave are owned by RepWave ERP Systems Inc.",
          "Your data remains yours — we do not claim ownership of any content you upload.",
          "You grant us a limited licence to process your data solely to provide the services.",
          "Our name, logo, and brand assets may not be used without prior written consent.",
        ],
      },
      {
        icon: "AlertTriangle",
        title: "Limitation of Liability",
        body: [
          "RepWave is provided 'as is' with an uptime SLA detailed in your subscription agreement.",
          "We are not liable for indirect, incidental, or consequential damages arising from service use.",
          "Our maximum liability shall not exceed the fees paid by you in the preceding 12 months.",
          "These limitations apply to the fullest extent permitted by applicable law.",
        ],
      },
      {
        icon: "Scale",
        title: "Governing Law",
        body: [
          "These terms are governed by the laws of the State of California, USA.",
          "Any disputes shall be resolved through binding arbitration in San Francisco, CA.",
          "Class action lawsuits are waived to the extent permitted by law.",
          "For questions about these terms, contact legal@repwave.com.",
        ],
      },
    ],
  },
  ar: {
    badge: "قانوني",
    title: "شروط الخدمة",
    subtitle: "باستخدام RepWave، فإنك توافق على هذه الشروط. يرجى قراءتها بعناية.",
    lastUpdated: "آخر تحديث: 1 يناير 2026",
    sections: [
      {
        icon: "CheckCircle",
        title: "قبول الشروط",
        body: [
          "من خلال الوصول إلى RepWave أو استخدامه، فإنك تؤكد أنك تبلغ من العمر 18 عامًا على الأقل ولديك صلاحية الدخول في هذه الشروط نيابةً عن مؤسستك.",
          "إذا كنت لا توافق على هذه الشروط، فيرجى عدم استخدام خدماتنا.",
          "قد نقوم بتحديث هذه الشروط في أي وقت. يعني الاستمرار في الاستخدام بعد التحديثات القبول.",
        ],
      },
      {
        icon: "FileText",
        title: "وصف الخدمات",
        body: [
          "تقدم RepWave برنامج ERP السحابي لإدارة عمليات الأعمال والمخزون والمبيعات والخدمات اللوجستية.",
          "تُقدَّم الخدمات على أساس الاشتراك مع الخطط المفصلة في صفحة الأسعار.",
          "نحتفظ بالحق في تعديل أو تعليق أو إيقاف أي خدمة مع إشعار معقول.",
          "قد يختلف الوصول إلى ميزات معينة بناءً على مستوى اشتراكك.",
        ],
      },
      {
        icon: "CheckCircle",
        title: "التزامات المستخدم",
        body: [
          "الحفاظ على سرية بيانات اعتماد حسابك وإخطارنا فورًا بأي وصول غير مصرح به.",
          "استخدام المنصة لأغراض تجارية مشروعة فقط وفقًا للقوانين المعمول بها.",
          "عدم محاولة الهندسة العكسية أو فك الترميز أو استخراج الكود المصدري لبرنامجنا.",
          "عدم استخدام السكريبتات الآلية أو الروبوتات للوصول إلى أنظمتنا أو كشطها دون إذن كتابي.",
          "الحفاظ على دقة معلومات حسابك وفاتورتك وتحديثها.",
        ],
      },
      {
        icon: "XCircle",
        title: "الأنشطة المحظورة",
        body: [
          "تحميل الكود الضار أو الفيروسات أو أي برنامج يهدف إلى إلحاق الضرر بأنظمتنا.",
          "محاولة الوصول غير المصرح به إلى حسابات أو بيانات المستخدمين الآخرين.",
          "استخدام RepWave لنقل رسائل غير مرغوب فيها أو محتوى احتيالي أو غير قانوني.",
          "إعادة بيع أو ترخيص أو توزيع الوصول إلى RepWave دون تفويض.",
        ],
      },
      {
        icon: "Copyright",
        title: "الملكية الفكرية",
        body: [
          "جميع البرامج والتصاميم والعلامات التجارية والمحتوى في RepWave مملوكة لشركة RepWave ERP Systems Inc.",
          "تظل بياناتك ملكًا لك — نحن لا ندّعي ملكية أي محتوى تقوم بتحميله.",
          "تمنحنا ترخيصًا محدودًا لمعالجة بياناتك فقط لتقديم الخدمات.",
          "لا يجوز استخدام اسمنا وشعارنا وأصول علامتنا التجارية دون موافقة كتابية مسبقة.",
        ],
      },
      {
        icon: "AlertTriangle",
        title: "تحديد المسؤولية",
        body: [
          "تُقدَّم RepWave 'كما هي' مع اتفاقية مستوى خدمة وقت التشغيل المفصلة في اتفاقية اشتراكك.",
          "نحن لسنا مسؤولين عن الأضرار غير المباشرة أو العرضية أو التبعية الناشئة عن استخدام الخدمة.",
          "لن تتجاوز مسؤوليتنا القصوى الرسوم التي دفعتها في الـ 12 شهرًا الماضية.",
          "تسري هذه القيود إلى أقصى حد يسمح به القانون المعمول به.",
        ],
      },
      {
        icon: "Scale",
        title: "القانون الحاكم",
        body: [
          "تخضع هذه الشروط لقوانين ولاية كاليفورنيا، الولايات المتحدة الأمريكية.",
          "يجب حل أي نزاعات من خلال التحكيم الملزم في سان فرانسيسكو، CA.",
          "يتم التنازل عن الدعاوى القضائية الجماعية إلى الحد الذي يسمح به القانون.",
          "للأسئلة حول هذه الشروط، اتصل بـ legal@repwave.com.",
        ],
      },
    ],
  },
};

const iconMap: Record<string, React.ElementType> = {
  FileText,
  CheckCircle,
  XCircle,
  Scale,
  Copyright,
  AlertTriangle,
};

export default async function TermsPage({ params }: Props) {
  const { lang } = await params;
  const t = content[(lang as Lang)] ?? content.en;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#FAFAFE] via-white to-[#EDE7FF] border-b border-[#EDE7FF]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#8B5FD6]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[#7A52C2]/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <span className="inline-block bg-[#8B5FD6]/20 text-[#7A52C2] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            {t.badge}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1F2937] mb-5 leading-tight">
            {t.title}
          </h1>
          <p className="text-lg text-[#475569] max-w-2xl mx-auto mb-6 leading-relaxed">
            {t.subtitle}
          </p>
          <p className="text-sm text-gray-400">{t.lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid gap-8">
          {t.sections.map((section, i) => {
            const Icon = iconMap[section.icon];
            return (
              <div
                key={i}
                className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-[#8B5FD6]/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#8B5FD6]/20 to-[#7A52C2]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {Icon && <Icon className="w-5 h-5 text-[#7A52C2]" />}
                  </div>
                  <h2 className="text-xl font-bold text-[#1F2937]">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.body.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-[#475569] text-sm leading-relaxed">
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#8B5FD6]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
