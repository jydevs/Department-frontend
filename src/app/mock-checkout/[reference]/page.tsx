import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { APP_ENV } from "@/lib/api/config";
import { MockCheckout } from "./MockCheckout";

export const metadata: Metadata = { title: "Pasarela de pruebas", robots: { index: false, follow: false } };

/** La pasarela simulada NO existe en producción: 404 decidido en el SERVIDOR (no se envía ni su código al navegador). */
export default function MockCheckoutPage() {
  if (APP_ENV === "production") notFound();
  return <MockCheckout />;
}
