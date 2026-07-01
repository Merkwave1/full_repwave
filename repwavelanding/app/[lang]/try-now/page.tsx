import TryNowForm from "@/components/TryNowForm";

export const dynamicParams = false;

export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

interface PageProps {
  params: Promise<{ lang: "en" | "ar" }>;
}

export default async function TryNowPage({ params }: PageProps) {
  const { lang } = await params;
  return <TryNowForm lang={lang} />;
}
