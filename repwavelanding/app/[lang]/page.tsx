import HeroHome from "@/components/HeroHome";
import FeaturesSection from "@/components/FeaturesSection";
import MissionSection from "@/components/MissionSection";
import CTASection from "@/components/CTASection";

export const dynamicParams = false;

export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

interface PageProps {
  params: Promise<{ lang: "en" | "ar" }>;
}

const Page = async ({ params }: PageProps) => {
  const { lang } = await params;

  return (
    <>
      <HeroHome lang={lang} rtl={lang === "ar" ? "rtl" : "ltr"} />
      <FeaturesSection lang={lang} />
      <MissionSection lang={lang} />
      <CTASection lang={lang} />
    </>
  );
};

export default Page;
