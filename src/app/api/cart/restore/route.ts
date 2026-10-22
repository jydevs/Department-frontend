import type { NextRequest } from "next/server";
import { addLine } from "@/lib/cart/bff";
import { fail, guardMutation, json, readJson } from "@/lib/cart/server";
import { readOrderCookie } from "@/lib/checkout/server";
import { readCart } from "@/lib/cart/bff";

export const dynamic = "force-dynamic";

/** Puts the lines of an order that was not paid (cancelled / expired) back into a new cart. Skips what is out of stock. */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const number = Number(body.number);
  const cookie = Number.isInteger(number) ? await readOrderCookie(number) : null;
  if (!cookie || cookie.lines.length === 0) return fail({ code: "NOT_FOUND", message: "No pudimos recuperar los productos de ese pedido.", status: 404 });

  let skipped = cookie.truncated ?? 0;
  for (const [variantId, quantity] of cookie.lines) {
    const res = await addLine(req, variantId, Math.min(20, Math.max(1, quantity)));
    if (res.status >= 400) skipped++;
  }
  const cart = await readCart(req);
  return json({ cart, skipped });
}
