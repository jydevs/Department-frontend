import type { Metadata } from "next";
import { ProfilePanel } from "@/components/account/ProfilePanel";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function AccountPage() {
  return <ProfilePanel />;
}
