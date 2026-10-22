import type { Metadata } from "next";
import { LoginForm } from "@/components/account/LoginForm";
import { firstParam, type SearchParams } from "@/lib/account/search-params";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const notice = firstParam(params.reset) ? "reset" : firstParam(params.verified) ? "verified" : firstParam(params.deleted) ? "deleted" : undefined;
  return <LoginForm next={firstParam(params.next)} notice={notice} />;
}
