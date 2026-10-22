import type { Metadata } from "next";

/** Nothing under /account is for search engines: forms, one-time links and private data. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AccountRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
