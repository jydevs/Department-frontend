import type { NextRequest } from "next/server";
import { onCart } from "@/lib/cart/bff";
import { badRequest, guardMutation, readJson } from "@/lib/cart/server";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Za-z0-9_-]{3,40}$/;

/** Applies a discount code to the cart (the API validates it against the cart, and the buyer's email when known, and answers 422 DISCOUNT_INVALID). */
export async function PUT(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE_RE.test(code)) return badRequest("Escribe un código de descuento válido (letras, números, guiones).", { code: "Escribe un código válido." });
  // optional: lets the API refuse a single-use code this email already used before the buyer pays
  const email = typeof body.email === "string" ? body.email.trim() : "";
  return onCart(req, "PUT", "/discount", { code, ...(email && email.length <= 255 ? { email } : null) });
}

/** Removes the discount code. */
export async function DELETE(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  return onCart(req, "PUT", "/discount", { code: null });
}
