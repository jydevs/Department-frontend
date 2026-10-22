import type { Metadata } from "next";
import { NewsletterConfirm } from "@/components/account/NewsletterTokenPage";
import { firstParam, type SearchParams } from "@/lib/account/search-params";

export const metadata: Metadata = { title: "Confirmar suscripción" };

export default async function ConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <NewsletterConfirm token={firstParam(params.token)} />;
}
