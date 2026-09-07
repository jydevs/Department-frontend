import type { Metadata } from "next";
import { ContactOverlays } from "./ContactOverlays";

export const metadata: Metadata = { title: "Community" };

/**
 * SCAFFOLD — "DAREGULAR MEMBERS" page. The header renders its solid (light)
 * variant here. Polished in `feature/account-modal`.
 */
export default function ContactPage() {
  return (
    <div className="min-h-[60vh] bg-dept-white px-6 py-16 text-dept-black md:px-10">
      <h1 className="font-display text-4xl text-dept-black md:text-5xl">
        Daregular Members
      </h1>
      <ContactOverlays />
    </div>
  );
}
