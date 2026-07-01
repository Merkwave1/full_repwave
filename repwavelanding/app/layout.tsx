import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "RepWave — Modern ERP for Sales & Operations",
  description: "Run sales, inventory, and field teams from one beautiful platform. Try free for 7 days.",
  icons: {
    icon: [{ url: "/repwave-logo-icon.png", type: "image/png" }],
    shortcut: "/repwave-logo-icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${cairo.variable} antialiased bg-[#FAFAFE] text-[#2D1B69]`}
      >
        {children}
      </body>
    </html>
  );
}
