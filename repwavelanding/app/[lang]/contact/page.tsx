import ContactPage from "@/components/ContactPage";

export const dynamicParams = false;

export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

interface PageProps {
  params: Promise<{ lang: "en" | "ar" }>;
}

const Page = async ({ params }: PageProps) => {
  const { lang } = await params;
  return <ContactPage lang={lang} />;
};

export default Page;
