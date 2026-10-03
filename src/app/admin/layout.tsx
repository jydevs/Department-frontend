import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Panel · Dept.", template: "%s · Panel Dept." },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root min-h-screen bg-bg text-fg" data-theme="dark">
      <Providers>{children}</Providers>
    </div>
  );
}
