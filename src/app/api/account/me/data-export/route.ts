import { guarded, withSession } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** Habeas Data: every personal datum the store keeps about the customer, as a JSON download. */
export const POST = guarded(async (req) =>
  withSession(req, (accessToken) => upstream("/storefront/customers/me/data-export", { method: "POST", accessToken, req }), {
    headers: { "Content-Disposition": 'attachment; filename="mis-datos-daregular-dept.json"' },
  }),
);
