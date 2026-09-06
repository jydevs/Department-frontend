import type { Metadata } from "next";
import { Anton, Oswald, Inter, Pinyon_Script } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { NewsletterFooter } from "@/components/layout/NewsletterFooter";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const pinyon = Pinyon_Script({
  weight: "400",
  variable: "--font-pinyon",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Daregular Dept.",
    template: "%s — Daregular Dept.",
  },
  description: "Uniforms for the unnoticed.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${oswald.variable} ${inter.variable} ${pinyon.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-dept-black text-dept-white">
        <Header />
        <main className="flex-1">{children}</main>
        <NewsletterFooter />
      </body>
    </html>
  );
}
