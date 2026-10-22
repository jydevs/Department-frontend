import type { NextRequest } from "next/server";
import { callApi, fail, guardMutation, json, readJson } from "@/lib/cart/server";
import { mockPaymentsAllowed } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["approved", "declined", "voided", "error"]);

/** Development only: simulates the gateway's webhook through the API's dev endpoint. 404 in production / with Wompi. */
export async function POST(req: NextRequest) {
  if (!mockPaymentsAllowed()) return new Response(null, { status: 404 });
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if ("status" in body) return body;
  const reference = typeof body.reference === "string" ? body.reference : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(reference) || !STATUSES.has(status)) {
    return fail({ code: "VALIDATION_ERROR", message: "Solicitud no válida.", status: 400 });
  }
  const result = await callApi<{ outcome: string }>(req, "POST", "/storefront/dev/mock-payment", { body: { reference, status } });
  if (!result.ok) return fail(result.issue);
  return json({ ok: true, outcome: result.data.outcome });
}
