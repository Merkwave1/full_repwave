import Link from "next/link";
import {
  Building2,
  Users,
  Shield,
  Headphones,
  BarChart3,
  Zap,
  CheckCircle,
  ArrowRight,
  Globe,
  Lock,
  RefreshCw,
} from "lucide-react";

type Lang = "en" | "ar";

interface Props {
  params: Promise<{ lang: string }>;
}

const content = {
  en: {
    badge: "Enterprise",
    heroTitle: "The ERP Built for\nEnterprise Scale",
    heroSubtitle:
      "RepWave Enterprise gives large organisations the power, control, and compliance they need — with dedicated support, custom integrations, and SLAs that match your ambitions.",
    ctaPrimary: "Talk to Sales",
    ctaSecondary: "View Pricing",
    trustedBy: "Trusted by operations teams at",
    companies: ["Fortune 500 Retailers", "Global Logistics Firms", "Healthcare Networks", "Manufacturing Groups"],
    featuresTitle: "Everything your enterprise needs",
    featuresSubtitle:
      "Built from the ground up to handle the complexity, scale, and compliance requirements of large organisations.",
    features: [
      {
        icon: "Building2",
        title: "Multi-Entity Management",
        desc: "Manage multiple business units, subsidiaries, and legal entities from a single unified dashboard with consolidated reporting.",
      },
      {
        icon: "Users",
        title: "Advanced User Roles",
        desc: "Fine-grained RBAC, SSO via SAML 2.0/OIDC, and directory sync with Active Directory and Okta.",
      },
      {
        icon: "Shield",
        title: "Enterprise Security",
        desc: "SOC 2 Type II, ISO 27001, and custom data residency options. Dedicated tenant with private cloud deployment available.",
      },
      {
        icon: "Headphones",
        title: "Dedicated Support",
        desc: "Named customer success manager, 24/7 priority phone support, and a guaranteed 4-hour response SLA.",
      },
      {
        icon: "BarChart3",
        title: "Advanced Analytics",
        desc: "Real-time dashboards, custom KPI builder, and direct data warehouse export to Snowflake, BigQuery, or Redshift.",
      },
      {
        icon: "Zap",
        title: "Custom Integrations",
        desc: "REST & GraphQL APIs, webhooks, and our integration team will build and maintain any third-party connector you need.",
      },
      {
        icon: "Globe",
        title: "Global Operations",
        desc: "Multi-currency, multi-language, and multi-timezone support with country-specific compliance modules.",
      },
      {
        icon: "Lock",
        title: "Data Governance",
        desc: "Field-level encryption, audit logs, data retention policies, and GDPR/CCPA compliance tooling built in.",
      },
      {
        icon: "RefreshCw",
        title: "Smooth Migration",
        desc: "Dedicated onboarding team, data migration tooling, and a structured go-live plan with zero downtime.",
      },
    ],
    includedTitle: "What's included in Enterprise",
    included: [
      "Unlimited users & seats",
      "Custom contract & billing",
      "99.9% uptime SLA",
      "Dedicated cloud instance",
      "24/7 phone & email support",
      "Named success manager",
      "Custom integrations & APIs",
      "Advanced security & compliance",
      "Executive business reviews",
      "Onboarding & training",
      "Data migration assistance",
      "Custom feature development",
    ],
    ctaTitle: "Ready to scale with RepWave?",
    ctaSubtitle:
      "Our enterprise team is ready to build a solution around your exact requirements. No templates, no compromise.",
    ctaButton: "Contact our Enterprise team",
  },
  ar: {
    badge: "المؤسسات",
    heroTitle: "نظام ERP مبني\nلحجم المؤسسات",
    heroSubtitle:
      "يمنح RepWave للمؤسسات الكبيرة القوة والتحكم والامتثال التي تحتاجها — مع دعم مخصص وتكاملات مخصصة واتفاقيات مستوى خدمة تتناسب مع طموحاتك.",
    ctaPrimary: "تحدث مع المبيعات",
    ctaSecondary: "عرض الأسعار",
    trustedBy: "موثوق به من فرق العمليات في",
    companies: ["شركات Fortune 500", "شركات الخدمات اللوجستية العالمية", "شبكات الرعاية الصحية", "مجموعات التصنيع"],
    featuresTitle: "كل ما تحتاجه مؤسستك",
    featuresSubtitle:
      "مبني من الصفر للتعامل مع التعقيد والحجم ومتطلبات الامتثال للمؤسسات الكبيرة.",
    features: [
      {
        icon: "Building2",
        title: "إدارة متعددة الكيانات",
        desc: "إدارة وحدات أعمال متعددة وشركات تابعة وكيانات قانونية من لوحة تحكم موحدة واحدة مع تقارير موحدة.",
      },
      {
        icon: "Users",
        title: "أدوار مستخدم متقدمة",
        desc: "RBAC دقيق، SSO عبر SAML 2.0/OIDC، ومزامنة الدليل مع Active Directory وOkta.",
      },
      {
        icon: "Shield",
        title: "أمان المؤسسات",
        desc: "SOC 2 النوع II وISO 27001 وخيارات إقامة البيانات المخصصة. مستأجر مخصص مع نشر سحابي خاص متاح.",
      },
      {
        icon: "Headphones",
        title: "دعم مخصص",
        desc: "مدير نجاح عملاء مسمى ودعم هاتفي ذو أولوية على مدار الساعة واتفاقية مستوى خدمة استجابة مضمونة خلال 4 ساعات.",
      },
      {
        icon: "BarChart3",
        title: "تحليلات متقدمة",
        desc: "لوحات تحكم في الوقت الفعلي ومنشئ KPI مخصص وتصدير مباشر لمستودع البيانات إلى Snowflake أو BigQuery أو Redshift.",
      },
      {
        icon: "Zap",
        title: "تكاملات مخصصة",
        desc: "APIs بـ REST وGraphQL وwebhooks، وسيقوم فريق التكامل لدينا ببناء وصيانة أي موصل طرف ثالث تحتاجه.",
      },
      {
        icon: "Globe",
        title: "العمليات العالمية",
        desc: "دعم متعدد العملات ومتعدد اللغات ومتعدد المناطق الزمنية مع وحدات امتثال خاصة بكل دولة.",
      },
      {
        icon: "Lock",
        title: "حوكمة البيانات",
        desc: "تشفير على مستوى الحقل وسجلات التدقيق وسياسات الاحتفاظ بالبيانات وأدوات الامتثال لـ GDPR/CCPA مدمجة.",
      },
      {
        icon: "RefreshCw",
        title: "ترحيل سلس",
        desc: "فريق تأهيل مخصص وأدوات ترحيل البيانات وخطة إطلاق منظمة بدون توقف.",
      },
    ],
    includedTitle: "ما يتضمنه الاشتراك المؤسسي",
    included: [
      "مستخدمون ومقاعد غير محدودة",
      "عقد وفوترة مخصصة",
      "اتفاقية مستوى خدمة بوقت تشغيل 99.9%",
      "نموذج سحابي مخصص",
      "دعم هاتفي وبريد إلكتروني 24/7",
      "مدير نجاح مسمى",
      "تكاملات وAPIs مخصصة",
      "أمان وامتثال متقدمان",
      "مراجعات أعمال تنفيذية",
      "تأهيل وتدريب",
      "مساعدة في ترحيل البيانات",
      "تطوير ميزات مخصصة",
    ],
    ctaTitle: "هل أنت مستعد للتوسع مع RepWave؟",
    ctaSubtitle:
      "فريق المؤسسات لدينا مستعد لبناء حل حول متطلباتك الدقيقة. لا قوالب، لا حلول وسط.",
    ctaButton: "تواصل مع فريق المؤسسات",
  },
};

const iconMap: Record<string, React.ElementType> = {
  Building2,
  Users,
  Shield,
  Headphones,
  BarChart3,
  Zap,
  Globe,
  Lock,
  RefreshCw,
};

export default async function EnterprisePage({ params }: Props) {
  const { lang } = await params;
  const t = content[(lang as Lang)] ?? content.en;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1F2937] via-[#243447] to-[#1a2535] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#8B5FD6]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7A52C2]/8 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#8B5FD6 1px, transparent 1px), linear-gradient(90deg, #8B5FD6 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 bg-[#8B5FD6]/10 border border-[#8B5FD6]/20 text-[#8B5FD6] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8">
            <Building2 className="w-3.5 h-3.5" />
            {t.badge}
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight whitespace-pre-line">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/${lang}/contact`}
              className="inline-flex items-center gap-2 bg-[#8B5FD6] text-white font-bold px-7 py-3.5 rounded-xl hover:bg-[#7A52C2] transition-colors duration-200 shadow-lg shadow-[#8B5FD6]/25"
            >
              {t.ctaPrimary}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${lang}/pricing`}
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-colors duration-200"
            >
              {t.ctaSecondary}
            </Link>
          </div>

          {/* Trusted by */}
          <div className="mt-16 pt-10 border-t border-white/10">
            <p className="text-gray-400 text-sm mb-5">{t.trustedBy}</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {t.companies.map((c, i) => (
                <span key={i} className="text-gray-400 font-semibold text-sm">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2937] mb-4">
            {t.featuresTitle}
          </h2>
          <p className="text-[#475569] max-w-2xl mx-auto leading-relaxed">
            {t.featuresSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.features.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <div
                key={i}
                className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-[#8B5FD6]/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#8B5FD6]/20 to-[#7A52C2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  {Icon && <Icon className="w-5 h-5 text-[#7A52C2]" />}
                </div>
                <h3 className="text-[#1F2937] font-bold mb-2">{feature.title}</h3>
                <p className="text-[#475569] text-sm leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* What's included */}
      <div className="bg-[#F8FAFC] border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-extrabold text-[#1F2937] text-center mb-12">
            {t.includedTitle}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {t.included.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm"
              >
                <CheckCircle className="w-4 h-4 text-[#7A52C2] flex-shrink-0" />
                <span className="text-[#1F2937] text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative bg-gradient-to-br from-[#1F2937] to-[#2d3748] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #8B5FD6 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5">
            {t.ctaTitle}
          </h2>
          <p className="text-gray-300 mb-10 leading-relaxed max-w-xl mx-auto">
            {t.ctaSubtitle}
          </p>
          <Link
            href={`/${lang}/contact`}
            className="inline-flex items-center gap-2 bg-[#8B5FD6] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#7A52C2] transition-colors duration-200 text-lg shadow-lg shadow-[#8B5FD6]/25"
          >
            {t.ctaButton}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
