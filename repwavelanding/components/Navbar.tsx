"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";

const navLinks = (lang: string) => [
  { href: `/${lang}`, label: lang === "ar" ? "الرئيسية" : "Home", exact: true },
  { href: `/${lang}/about`, label: lang === "ar" ? "حول" : "About" },
  { href: `/${lang}/pricing`, label: lang === "ar" ? "الأسعار" : "Pricing" },
  { href: `/${lang}/contact`, label: lang === "ar" ? "اتصل" : "Contact" },
];

const Navbar = ({ lang }: { lang: string }) => {
  const pathname = usePathname();
  const next_lang = lang === "en" ? "ar" : "en";
  const pathnameSegments = (pathname ?? "").split("/").slice(2).join("/");
  const newpathname = `/${next_lang}/${pathnameSegments}`;

  const [menuOpen, setMenuOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const closeMenu = () => setMenuOpen(false);
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6 pt-4 pb-2">
      <nav className="rw-glass max-w-6xl mx-auto rounded-2xl shadow-[0_8px_32px_rgba(139,95,214,0.08)]">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href={`/${lang}`} className="flex items-center group shrink-0">
            <Image
              src="/repwave-logo.png"
              alt="RepWave"
              width={148}
              height={40}
              priority
              className="h-9 sm:h-10 w-auto object-contain object-left"
            />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks(lang).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href, link.exact)
                    ? "text-[#8B5FD6] bg-[#EDE7FF]/60"
                    : "text-[#5B5470] hover:text-[#2D1B69] hover:bg-[#FAFAFE]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href={newpathname}
              className="text-sm font-medium text-[#7A52C2] hover:text-[#8B5FD6] px-3 py-2 rounded-lg hover:bg-[#EDE7FF]/50 transition-all"
            >
              {lang === "ar" ? "English" : "العربية"}
            </Link>
            <Link href={`/${lang}/try-now`} className="rw-btn-cta rw-btn-cta-sm">
              <span className="rw-btn-cta-label">{lang === "ar" ? "جرّب مجاناً" : "Try It Free"}</span>
            </Link>
          </div>

          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl hover:bg-[#EDE7FF]/50 transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 bg-[#2D1B69] transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
            <span className={`block h-0.5 w-5 bg-[#2D1B69] my-1 transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-[#2D1B69] transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
          </button>
        </div>

        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            menuOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
          }`}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const dy = e.changedTouches[0].clientY - touchStartY.current;
            if (Math.abs(dx) > 50 || Math.abs(dy) > 50) closeMenu();
          }}
        >
          <div className="px-4 pb-4 pt-1 flex flex-col gap-1 border-t border-[#EDE7FF]">
            {navLinks(lang).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`py-3 px-3 rounded-xl text-sm font-medium ${
                  isActive(link.href, link.exact)
                    ? "text-[#8B5FD6] bg-[#EDE7FF]/50"
                    : "text-[#5B5470]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link href={newpathname} onClick={closeMenu} className="py-3 px-3 text-sm text-[#7A52C2] font-medium">
              {lang === "ar" ? "English" : "العربية"}
            </Link>
            <Link href={`/${lang}/try-now`} onClick={closeMenu} className="rw-btn-cta mt-2 w-full">
              <span className="rw-btn-cta-label">{lang === "ar" ? "جرّب مجاناً" : "Try It Free"}</span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
