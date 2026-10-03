"use client";

import { NewsletterToken } from "@/components/account/NewsletterToken";

export default function NewsletterConfirmPage() {
  return <NewsletterToken testId="newsletter-confirm" eyebrow="Newsletter" path="/storefront/newsletter/confirm" method="GET" doneTitle="Suscripción confirmada" doneText="Gracias por unirte. Recibirás nuestras novedades en tu correo." />;
}
