import { guarded, pick, withSession } from "@/lib/account/server/bff";
import { ADDRESS_FIELDS, cleanAddressPayload } from "@/lib/account/server/address";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

export const GET = guarded(async (req) =>
  withSession(req, (accessToken) => upstream("/storefront/customers/me/addresses", { accessToken, req }), {
    map: (items) => ({ items: Array.isArray(items) ? items : [] }),
  }),
);

export const POST = guarded(async (req, body) => {
  const payload = cleanAddressPayload(pick(body, ADDRESS_FIELDS), "create");
  return withSession(req, (accessToken) => upstream("/storefront/customers/me/addresses", { method: "POST", body: payload, accessToken, req }), {
    successStatus: 201,
  });
});
