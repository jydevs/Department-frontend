import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";
import { firstParam, type SearchParams } from "@/lib/account/search-params";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <ResetPasswordForm token={firstParam(params.token)} />;
}
