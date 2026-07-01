import { ShieldCheck, Lock, Server, Bug, Award, Zap } from "lucide-react";

type Lang = "en" | "ar";

interface Props {
  params: Promise<{ lang: string }>;
}

const content = {
  en: {
    badge: "Security",
    title: "Security at RepWave",
    subtitle: "Your data security is our top priority. Here's how we protect what matters most to your business.",
    certifications: ["SOC 2 Type II", "ISO 27001", "GDPR Compliant", "PCI DSS Level 1"],
    sections: [
      {
        icon: "Lock",
        color: "from-[#FAFAFE] to-[#EDE7FF]",
        title: "Encryption",
        body: [
          "All data is encrypted in transit using TLS 1.3 — the latest and most secure transport protocol.",
          "Data at rest is encrypted using AES-256, the same standard used by financial institutions.",
          "Encryption keys are managed via AWS KMS with strict access control and automatic rotation.",
          "Database backups are encrypted and stored in geographically distributed locations.",
        ],
      },
      {
        icon: "Server",
        color: "from-purple-50 to-white",
        title: "Infrastructure Security",
        body: [
          "Hosted on AWS with multi-region redundancy and 99.9% uptime SLA.",
          "All servers run inside private VPCs with no direct public internet access.",
          "WAF (Web Application Firewall) protects against OWASP Top 10 threats in real time.",
          "DDoS protection powered by AWS Shield Standard is enabled across all endpoints.",
          "Automated vulnerability scanning runs continuously on all infrastructure components.",
        ],
      },
      {
        icon: "ShieldCheck",
        color: "from-green-50 to-white",
        title: "Access Control",
        body: [
          "Role-based access control (RBAC) ensures users only see data relevant to their role.",
          "Multi-factor authentication (MFA) is required for all admin and production system access.",
          "All privileged access sessions are logged, recorded, and regularly audited.",
          "Zero-trust network architecture — no implicit trust, every request is verified.",
        ],
      },
      {
        icon: "Award",
        color: "from-yellow-50 to-white",
        title: "Compliance & Audits",
        body: [
          "SOC 2 Type II audit conducted annually by an independent third-party auditor.",
          "ISO 27001 certification demonstrates our commitment to information security management.",
          "GDPR compliant with a designated Data Protection Officer and formal data processing agreements.",
          "Penetration tests performed twice yearly by certified external security firms.",
        ],
      },
      {
        icon: "Zap",
        color: "from-orange-50 to-white",
        title: "Incident Response",
        body: [
          "24/7 security monitoring with automated alerting for anomalous activity.",
          "Dedicated incident response team with defined escalation and communication procedures.",
          "Affected customers are notified within 72 hours of a confirmed security incident.",
          "Post-incident reviews and root cause analyses are shared with enterprise customers.",
        ],
      },
      {
        icon: "Bug",
        color: "from-red-50 to-white",
        title: "Responsible Disclosure",
        body: [
          "We welcome security researchers to responsibly disclose vulnerabilities.",
          "Report issues to: security@repwave.com — we aim to respond within 48 hours.",
          "Confirmed critical vulnerabilities are patched within 7 days.",
          "We recognise researchers in our public Hall of Fame for significant findings.",
        ],
      },
    ],
  },
  ar: {
    badge: "الأمان",
    title: "الأمان في RepWave",
    subtitle: "أمان بياناتك هو أولويتنا القصوى. إليك كيف نحمي ما يهم عملك أكثر.",
    certifications: ["SOC 2 النوع II", "ISO 27001", "متوافق مع GDPR", "PCI DSS المستوى 1"],
    sections: [
      {
        icon: "Lock",
        color: "from-[#FAFAFE] to-[#EDE7FF]",
        title: "التشفير",
        body: [
          "جميع البيانات مشفرة أثناء النقل باستخدام TLS 1.3 — أحدث بروتوكول نقل وأكثره أمانًا.",
          "البيانات أثناء التخزين مشفرة باستخدام AES-256، نفس المعيار المستخدم في المؤسسات المالية.",
          "تُدار مفاتيح التشفير عبر AWS KMS مع التحكم الصارم في الوصول والتدوير التلقائي.",
          "نسخ قواعد البيانات الاحتياطية مشفرة ومخزنة في مواقع موزعة جغرافيًا.",
        ],
      },
      {
        icon: "Server",
        color: "from-purple-50 to-white",
        title: "أمان البنية التحتية",
        body: [
          "مستضاف على AWS مع تكرار متعدد المناطق واتفاقية مستوى خدمة بوقت تشغيل 99.9%.",
          "تعمل جميع الخوادم داخل VPCs خاصة دون وصول مباشر لشبكة الإنترنت العامة.",
          "يحمي WAF (جدار حماية تطبيقات الويب) من تهديدات OWASP Top 10 في الوقت الفعلي.",
          "حماية DDoS مدعومة بـ AWS Shield Standard ممكّنة عبر جميع نقاط النهاية.",
          "تعمل فحوصات الثغرات الآلية باستمرار على جميع مكونات البنية التحتية.",
        ],
      },
      {
        icon: "ShieldCheck",
        color: "from-green-50 to-white",
        title: "التحكم في الوصول",
        body: [
          "التحكم في الوصول المستند إلى الأدوار (RBAC) يضمن رؤية المستخدمين فقط للبيانات ذات الصلة بدورهم.",
          "المصادقة متعددة العوامل (MFA) مطلوبة لجميع وصول المسؤولين وأنظمة الإنتاج.",
          "جميع جلسات الوصول المتميز مسجلة ومحفوظة وتخضع للتدقيق بانتظام.",
          "بنية شبكة الثقة الصفرية — لا ثقة ضمنية، يتم التحقق من كل طلب.",
        ],
      },
      {
        icon: "Award",
        color: "from-yellow-50 to-white",
        title: "الامتثال والتدقيق",
        body: [
          "تدقيق SOC 2 النوع II يُجرى سنويًا من قبل مدقق مستقل من طرف ثالث.",
          "تشهادة ISO 27001 تُثبت التزامنا بإدارة أمن المعلومات.",
          "متوافق مع GDPR مع مسؤول حماية بيانات معين واتفاقيات معالجة بيانات رسمية.",
          "اختبارات اختراق تُجرى مرتين سنويًا من قبل شركات أمن خارجية معتمدة.",
        ],
      },
      {
        icon: "Zap",
        color: "from-orange-50 to-white",
        title: "الاستجابة للحوادث",
        body: [
          "مراقبة أمنية على مدار الساعة مع تنبيه آلي للنشاط الشاذ.",
          "فريق استجابة للحوادث مخصص مع إجراءات التصعيد والتواصل المحددة.",
          "يتم إخطار العملاء المتضررين في غضون 72 ساعة من الحادث الأمني المؤكد.",
          "مراجعات ما بعد الحوادث وتحليلات الأسباب الجذرية تُشارك مع عملاء المؤسسات.",
        ],
      },
      {
        icon: "Bug",
        color: "from-red-50 to-white",
        title: "الإفصاح المسؤول",
        body: [
          "نرحب بباحثي الأمن للإفصاح المسؤول عن الثغرات.",
          "أبلغ عن المشكلات على: security@repwave.com — نهدف للرد في غضون 48 ساعة.",
          "يتم إصلاح الثغرات الحرجة المؤكدة في غضون 7 أيام.",
          "نكرّم الباحثين في قاعة الشرف العامة لدينا للنتائج الهامة.",
        ],
      },
    ],
  },
};

const iconMap: Record<string, React.ElementType> = {
  ShieldCheck,
  Lock,
  Server,
  Bug,
  Award,
  Zap,
};

export default async function SecurityPage({ params }: Props) {
  const { lang } = await params;
  const t = content[(lang as Lang)] ?? content.en;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1F2937] via-[#2d3748] to-[#1a2535] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#8B5FD6]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#7A52C2]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-[#8B5FD6]/10 border border-[#8B5FD6]/20 text-[#8B5FD6] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
            {t.title}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.subtitle}
          </p>
          {/* Certifications */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {t.certifications.map((cert, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20"
              >
                <Award className="w-3 h-3 text-[#8B5FD6]" />
                {cert}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {t.sections.map((section, i) => {
            const Icon = iconMap[section.icon];
            return (
              <div
                key={i}
                className={`group bg-gradient-to-br ${section.color} border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg hover:border-[#8B5FD6]/40 transition-all duration-300 hover:-translate-y-0.5`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {Icon && <Icon className="w-5 h-5 text-[#7A52C2]" />}
                  </div>
                  <h2 className="text-lg font-bold text-[#1F2937]">{section.title}</h2>
                </div>
                <ul className="space-y-2.5">
                  {section.body.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[#475569] text-sm leading-relaxed">
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
