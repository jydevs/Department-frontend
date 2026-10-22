import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/account/VerifyEmailForm";
import { firstParam, type SearchParams } from "@/lib/account/search-params";

export const metadata: Metadata = { title: "Verifica tu correo" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <VerifyEmailForm token={firstParam(params.token)} />;
}
