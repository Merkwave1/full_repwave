import AboutHero from "@/components/AboutHero";
import AboutStory from "@/components/AboutStory";
import AboutValues from "@/components/AboutValues";
import AboutTimeline from "@/components/AboutTimeline";
import CTASection from "@/components/CTASection";

export const dynamicParams = false;

export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

interface PageProps {
  params: Promise<{ lang: "en" | "ar" }>;
}

const AboutPage = async ({ params }: PageProps) => {
  const { lang } = await params;

  return (
    <>
      <AboutHero lang={lang} />
      <AboutStory lang={lang} />
      <AboutValues lang={lang} />
      <AboutTimeline lang={lang} />
      <CTASection lang={lang} />
    </>
  );
};

export default AboutPage;
