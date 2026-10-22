import { guarded, withSession } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

function intParam(value: string | null, min: number, max: number): number | undefined {
  if (!value || !/^\d{1,4}$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

/** The customer is always taken from the token by the API: there is no way to ask for somebody else's orders. */
export const GET = guarded(async (req) => {
  const params = req.nextUrl.searchParams;
  const query = { page: intParam(params.get("page"), 1, 1000), pageSize: intParam(params.get("pageSize"), 1, 100) };
  return withSession(req, (accessToken) => upstream("/storefront/customers/me/orders", { accessToken, query, req }));
});
