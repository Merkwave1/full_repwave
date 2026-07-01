import { Shield, Eye, Lock, Database, Bell, Mail } from "lucide-react";

type Lang = "en" | "ar";

interface Props {
  params: Promise<{ lang: string }>;
}

const content = {
  en: {
    badge: "Legal",
    title: "Privacy Policy",
    subtitle: "We take your privacy seriously. Here's exactly how we collect, use, and protect your data.",
    lastUpdated: "Last updated: January 1, 2026",
    sections: [
      {
        icon: "Database",
        title: "Information We Collect",
        body: [
          "Account information: name, email address, company name, and password when you register.",
          "Usage data: how you interact with our platform, features used, and session duration.",
          "Device data: browser type, IP address, operating system, and referral URLs.",
          "Payment information: processed securely via our PCI-compliant payment partners — we never store raw card numbers.",
        ],
      },
      {
        icon: "Eye",
        title: "How We Use Your Data",
        body: [
          "To provide, operate, and improve RepWave services.",
          "To personalise your experience and surface relevant features.",
          "To send transactional emails, product updates, and security alerts.",
          "To comply with legal obligations and enforce our terms.",
        ],
      },
      {
        icon: "Lock",
        title: "Data Security",
        body: [
          "All data is encrypted in transit using TLS 1.3 and at rest using AES-256.",
          "Access to production systems is restricted to authorised personnel with MFA.",
          "We conduct regular penetration tests and third-party security audits.",
          "Incident response procedures are in place with a 72-hour breach notification policy.",
        ],
      },
      {
        icon: "Shield",
        title: "Your Rights",
        body: [
          "Access: request a copy of all personal data we hold about you.",
          "Rectification: ask us to correct inaccurate or incomplete data.",
          "Erasure: request deletion of your personal data ('right to be forgotten').",
          "Portability: receive your data in a machine-readable format.",
          "Objection: opt out of marketing communications at any time.",
        ],
      },
      {
        icon: "Bell",
        title: "Cookies",
        body: [
          "We use essential cookies to keep you logged in and maintain session state.",
          "Analytics cookies (e.g., anonymised usage stats) help us improve the product.",
          "You can manage or disable non-essential cookies via your browser settings.",
        ],
      },
      {
        icon: "Mail",
        title: "Contact Us",
        body: [
          "For any privacy-related inquiries, please contact our Data Protection Officer:",
          "Email: privacy@repwave.com",
          "Address: RepWave ERP Systems Inc., San Francisco, CA 94105, USA",
        ],
      },
    ],
  },
  ar: {
    badge: "قانوني",
    title: "سياسة الخصوصية",
    subtitle: "نحن نأخذ خصوصيتك على محمل الجد. إليك بالضبط كيف نجمع بياناتك ونستخدمها ونحميها.",
    lastUpdated: "آخر تحديث: 1 يناير 2026",
    sections: [
      {
        icon: "Database",
        title: "المعلومات التي نجمعها",
        body: [
          "معلومات الحساب: الاسم والبريد الإلكتروني واسم الشركة وكلمة المرور عند التسجيل.",
          "بيانات الاستخدام: كيفية تفاعلك مع منصتنا والميزات المستخدمة ومدة الجلسة.",
          "بيانات الجهاز: نوع المتصفح وعنوان IP ونظام التشغيل وعناوين الإحالة.",
          "معلومات الدفع: تُعالَج بأمان عبر شركاء الدفع المتوافقين مع PCI — نحن لا نخزن أرقام البطاقات أبدًا.",
        ],
      },
      {
        icon: "Eye",
        title: "كيف نستخدم بياناتك",
        body: [
          "لتقديم خدمات RepWave وتشغيلها وتحسينها.",
          "لتخصيص تجربتك وعرض الميزات ذات الصلة.",
          "لإرسال رسائل البريد الإلكتروني التشغيلية وتحديثات المنتج وتنبيهات الأمان.",
          "للامتثال للالتزامات القانونية وتطبيق شروطنا.",
        ],
      },
      {
        icon: "Lock",
        title: "أمان البيانات",
        body: [
          "جميع البيانات مشفرة أثناء النقل باستخدام TLS 1.3 وأثناء التخزين باستخدام AES-256.",
          "الوصول إلى أنظمة الإنتاج مقيد بالموظفين المصرح لهم مع المصادقة متعددة العوامل.",
          "نجري اختبارات اختراق منتظمة وعمليات تدقيق أمني من طرف ثالث.",
          "إجراءات الاستجابة للحوادث موجودة مع سياسة إشعار خرق البيانات خلال 72 ساعة.",
        ],
      },
      {
        icon: "Shield",
        title: "حقوقك",
        body: [
          "الوصول: طلب نسخة من جميع البيانات الشخصية التي نحتفظ بها عنك.",
          "التصحيح: طلب تصحيح البيانات غير الدقيقة أو غير المكتملة.",
          "المسح: طلب حذف بياناتك الشخصية ('الحق في النسيان').",
          "قابلية النقل: استلام بياناتك بتنسيق قابل للقراءة آليًا.",
          "الاعتراض: إلغاء الاشتراك في الاتصالات التسويقية في أي وقت.",
        ],
      },
      {
        icon: "Bell",
        title: "ملفات تعريف الارتباط",
        body: [
          "نستخدم ملفات تعريف الارتباط الأساسية لإبقائك مسجلًا دخولك والحفاظ على حالة الجلسة.",
          "ملفات تعريف الارتباط التحليلية (مثل إحصاءات الاستخدام المجهولة) تساعدنا على تحسين المنتج.",
          "يمكنك إدارة أو تعطيل ملفات تعريف الارتباط غير الضرورية عبر إعدادات متصفحك.",
        ],
      },
      {
        icon: "Mail",
        title: "تواصل معنا",
        body: [
          "لأي استفسارات تتعلق بالخصوصية، يرجى الاتصال بمسؤول حماية البيانات لدينا:",
          "البريد الإلكتروني: privacy@repwave.com",
          "العنوان: شركة RepWave لأنظمة ERP، سان فرانسيسكو، CA 94105، الولايات المتحدة الأمريكية",
        ],
      },
    ],
  },
};

const iconMap: Record<string, React.ElementType> = {
  Database,
  Eye,
  Lock,
  Shield,
  Bell,
  Mail,
};

export default async function PrivacyPage({ params }: Props) {
  const { lang } = await params;
  const t = content[(lang as Lang)] ?? content.en;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#FAFAFE] via-white to-[#EDE7FF] border-b border-[#EDE7FF]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#8B5FD6]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#7A52C2]/8 rounded-full blur-3xl" />
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
