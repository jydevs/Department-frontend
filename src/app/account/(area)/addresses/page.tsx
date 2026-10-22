import type { Metadata } from "next";
import { AddressesPanel } from "@/components/account/AddressesPanel";

export const metadata: Metadata = { title: "Mis direcciones" };

export default function AddressesPage() {
  return <AddressesPanel />;
}
