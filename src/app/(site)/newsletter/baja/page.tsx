import type { Metadata } from "next";
import { NewsletterUnsubscribe } from "@/components/account/NewsletterTokenPage";
import { firstParam, type SearchParams } from "@/lib/account/search-params";

export const metadata: Metadata = { title: "Darte de baja del newsletter" };

export default async function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <NewsletterUnsubscribe token={firstParam(params.token)} />;
}
