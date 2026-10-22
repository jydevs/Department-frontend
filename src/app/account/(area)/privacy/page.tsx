import type { Metadata } from "next";
import { PrivacyPanel } from "@/components/account/PrivacyPanel";

export const metadata: Metadata = { title: "Privacidad y datos" };

export default function PrivacyPage() {
  return <PrivacyPanel />;
}
