import type { Metadata } from "next";

export const metadata: Metadata = { title: "Community" };

/**
 * "DAREGULAR MEMBERS" page. The header renders its solid (light) variant here;
 * the account panel opens from the header account icon (see `OverlayProvider`).
 */
export default function ContactPage() {
  return (
    <div className="min-h-[60vh] bg-dept-white px-6 py-16 text-dept-black md:px-10">
      <h1 className="font-display text-4xl text-dept-black md:text-5xl">
        Daregular Members
      </h1>
    </div>
  );
}
