import { fail, guarded, pick, withSession } from "@/lib/account/server/bff";
import { ADDRESS_FIELDS, cleanAddressPayload, isUuid } from "@/lib/account/server/address";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

export const PATCH = guarded(async (req, body, ctx) => {
  const { addressId } = await ctx.params;
  if (!isUuid(addressId)) return fail(404, "NOT_FOUND");
  const payload = cleanAddressPayload(pick(body, ADDRESS_FIELDS), "update");
  return withSession(
    req,
    (accessToken) => upstream(`/storefront/customers/me/addresses/${addressId}`, { method: "PATCH", body: payload, accessToken, req }),
  );
});

export const DELETE = guarded(async (req, _body, ctx) => {
  const { addressId } = await ctx.params;
  if (!isUuid(addressId)) return fail(404, "NOT_FOUND");
  return withSession(
    req,
    (accessToken) => upstream(`/storefront/customers/me/addresses/${addressId}`, { method: "DELETE", accessToken, req }),
    { successStatus: 204 },
  );
});
