import PricingHero from "@/components/PricingHero";
import PricingCards from "@/components/PricingCards";
import PricingFAQ from "@/components/PricingFAQ";

export const dynamicParams = false;

export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

interface PageProps {
  params: Promise<{ lang: "en" | "ar" }>;
}

const PricingPage = async ({ params }: PageProps) => {
  const { lang } = await params;

  return (
    <>
      <PricingHero lang={lang} />
      <PricingCards lang={lang} />
      <PricingFAQ lang={lang} />
    </>
  );
};

export default PricingPage;
