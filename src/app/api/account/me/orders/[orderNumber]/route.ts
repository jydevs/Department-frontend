import { fail, guarded, withSession } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

export const GET = guarded(async (req, _body, ctx) => {
  const { orderNumber } = await ctx.params;
  if (!/^[1-9]\d{0,9}$/.test(orderNumber)) return fail(404, "NOT_FOUND");
  return withSession(req, (accessToken) => upstream(`/storefront/customers/me/orders/${orderNumber}`, { accessToken, req }));
});
