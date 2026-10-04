"use client";

import { NewsletterToken } from "@/components/account/NewsletterToken";

export default function NewsletterUnsubscribePage() {
  return <NewsletterToken testId="newsletter-unsubscribe" eyebrow="Newsletter" path="/storefront/newsletter/unsubscribe" method="POST" doneTitle="Suscripción cancelada" doneText="Ya no recibirás nuestro boletín. Puedes volver a suscribirte cuando quieras." />;
}
