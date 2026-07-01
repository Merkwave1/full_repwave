import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, Phone } from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    tagline:
      "Modern ERP for sales, inventory, and field operations — bilingual, multi-tenant, built to scale with you.",
    product: "Product",
    company: "Company",
    legal: "Legal",
    links: {
      product: [
        { label: "Features", href: "/en/#features" },
        { label: "Pricing", href: "/en/pricing" },
        { label: "Try it free", href: "/en/try-now" },
        { label: "Enterprise", href: "/en/enterprise" },
      ],
      company: [
        { label: "About", href: "/en/about" },
        { label: "Contact", href: "/en/contact" },
      ],
      legal: [
        { label: "Privacy", href: "/en/privacy" },
        { label: "Terms", href: "/en/terms" },
        { label: "Security", href: "/en/security" },
      ],
    },
    copyright: "© 2026 RepWave. All rights reserved.",
    madeBy: "Crafted by Merkwave",
  },
  ar: {
    tagline:
      "نظام ERP حديث للمبيعات والمخزون وعمليات الميدان — ثنائي اللغة، متعدد المستأجرين، ومصمم لينمو معك.",
    product: "المنتج",
    company: "الشركة",
    legal: "قانوني",
    links: {
      product: [
        { label: "الميزات", href: "/ar/#features" },
        { label: "الأسعار", href: "/ar/pricing" },
        { label: "جرّب مجاناً", href: "/ar/try-now" },
        { label: "المؤسسات", href: "/ar/enterprise" },
      ],
      company: [
        { label: "من نحن", href: "/ar/about" },
        { label: "اتصل", href: "/ar/contact" },
      ],
      legal: [
        { label: "الخصوصية", href: "/ar/privacy" },
        { label: "الشروط", href: "/ar/terms" },
        { label: "الأمان", href: "/ar/security" },
      ],
    },
    copyright: "© 2026 RepWave. جميع الحقوق محفوظة.",
    madeBy: "من تطوير Merkwave",
  },
};

const Footer = ({ lang }: { lang: Lang }) => {
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const prefix = `/${lang}`;

  const localize = (href: string) =>
    href.replace(/^\/(en|ar)/, prefix);

  return (
    <footer dir={dir} className="relative bg-[#1A0F35] text-[#EDE7FF]/80 overflow-hidden">
      <div className="absolute inset-0 rw-dot-grid opacity-[0.06] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#8B5FD6]/50 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
          <Link href={prefix} className="flex items-center w-fit group">
            <Image
              src="/repwave-logo.png"
              alt="RepWave"
              width={148}
              height={40}
              className="h-10 w-auto object-contain object-left brightness-110"
            />
          </Link>
          <p className="text-sm leading-relaxed text-[#EDE7FF]/60 max-w-xs">{t.tagline}</p>
        </div>

        {(["product", "company", "legal"] as const).map((section) => (
          <div key={section} className="flex flex-col gap-4">
            <h4 className="text-xs font-bold tracking-widest text-white uppercase">
              {t[section]}
            </h4>
            <div className="flex flex-col gap-2.5">
              {t.links[section].map((l) => (
                <Link
                  key={l.href}
                  href={localize(l.href)}
                  className="text-sm text-[#EDE7FF]/60 hover:text-[#C4A8F0] transition-colors w-fit"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#EDE7FF]/45">{t.copyright}</p>
          <p className="text-xs text-[#EDE7FF]/45">
            {t.madeBy}{" "}
            <a
              href="https://merkwave.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C4A8F0] hover:text-white transition-colors"
            >
              Merkwave
            </a>
          </p>
          <div className="flex items-center gap-3 text-[#EDE7FF]/50">
            <Globe className="w-4 h-4 hover:text-[#C4A8F0] cursor-pointer transition-colors" />
            <Mail className="w-4 h-4 hover:text-[#C4A8F0] cursor-pointer transition-colors" />
            <Phone className="w-4 h-4 hover:text-[#C4A8F0] cursor-pointer transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
