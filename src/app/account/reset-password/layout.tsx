import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
