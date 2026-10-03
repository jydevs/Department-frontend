import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata: Metadata = { title: { default: "Dept. Admin", template: "%s · Dept. Admin" }, robots: { index: false, follow: false } };

// Script estático (sin contenido de la API): aplica el tema guardado antes de pintar.
const themeScript = `try{var t=localStorage.getItem("dept-admin-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
