"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Lang = "en" | "ar";

const translations = {
  en: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know about our pricing and plans.",
    faqs: [
      {
        question: "Can I change plans later?",
        answer:
          "Yes, you can upgrade or downgrade your plan at any time from your dashboard settings. Upgrades take effect immediately, while downgrades are applied at the end of your current billing cycle.",
      },
      {
        question: "What's included in the 14-day free trial?",
        answer:
          "The free trial gives you full access to all Professional plan features — no credit card required. After 14 days, you can choose to upgrade to a paid plan or your account will automatically switch to the Starter tier.",
      },
      {
        question: "Is my business data secure?",
        answer:
          "Absolutely. We use enterprise-grade AES-256 encryption for all data at rest and in transit. Your data is hosted on ISO 27001-certified servers with daily backups and strict access controls.",
      },
      {
        question: "Do you offer discounts for non-profits?",
        answer:
          "Yes, we offer a 30% discount for verified non-profit organizations. Please contact our sales team with your non-profit registration documents to apply.",
      },
    ],
  },
  ar: {
    title: "الأسئلة الشائعة",
    subtitle: "كل ما تحتاج معرفته حول أسعارنا وخططنا.",
    faqs: [
      {
        question: "هل يمكنني تغيير الخطط لاحقاً؟",
        answer:
          "نعم، يمكنك ترقية خطتك أو تخفيضها في أي وقت من إعدادات لوحة التحكم. تسري الترقيات فوراً، بينما يتم تطبيق التخفيضات في نهاية دورة الفوترة الحالية.",
      },
      {
        question: "ما الذي يتضمنه الإصدار التجريبي المجاني لمدة 14 يوماً؟",
        answer:
          "يمنحك الإصدار التجريبي المجاني وصولاً كاملاً لجميع ميزات الخطة الاحترافية — دون الحاجة لبطاقة ائتمان. بعد 14 يوماً، يمكنك الترقية إلى خطة مدفوعة أو سيتم تحويل حسابك تلقائياً إلى طبقة المبتدئ.",
      },
      {
        question: "هل بيانات أعمالي آمنة؟",
        answer:
          "بالتأكيد. نستخدم تشفير AES-256 على مستوى المؤسسات لجميع البيانات في حالة الراحة وأثناء النقل. يتم استضافة بياناتك على خوادم معتمدة بـ ISO 27001 مع نسخ احتياطية يومية وضوابط وصول صارمة.",
      },
      {
        question: "هل تقدمون خصومات للمنظمات غير الربحية؟",
        answer:
          "نعم، نقدم خصم 30% للمنظمات غير الربحية الموثقة. يرجى التواصل مع فريق المبيعات مع مستندات التسجيل للتقديم.",
      },
    ],
  },
};

const PricingFAQ = ({ lang }: { lang: Lang }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const t = translations[lang] ?? translations.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section
      dir={dir}
      className="bg-[#F8FAFC] py-12 sm:py-20 px-4 sm:px-6 md:px-10"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1F2937]">
            {t.title}
          </h2>
          <p className="mt-3 text-gray-500 text-base">{t.subtitle}</p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {t.faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 text-left focus:outline-none group"
                >
                  <span className="text-sm sm:text-base font-semibold text-[#1F2937] group-hover:text-[#8B5FD6] transition-colors duration-200">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#8B5FD6]" : ""
                    }`}
                  />
                </button>

                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-4 sm:px-6 pb-4 sm:pb-5 text-sm text-gray-500 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingFAQ;
