import type { NextRequest } from "next/server";
import { ensureCart, onCart } from "@/lib/cart/bff";
import { badRequest, guardMutation, readJson } from "@/lib/cart/server";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Za-z0-9_-]{3,40}$/;

/** Applies a discount code to the cart (the API validates it against the cart and answers 422 DISCOUNT_INVALID). */
export async function PUT(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if ("status" in body) return body;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE_RE.test(code)) return badRequest("Escribe un código de descuento válido (letras, números, guiones).", { code: "Escribe un código válido." });
  const cart = await ensureCart(req);
  if ("status" in cart) return cart;
  return onCart(req, "PUT", "/discount", { code });
}

/** Removes the discount code. */
export async function DELETE(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if ("status" in body) return body;
  return onCart(req, "PUT", "/discount", { code: null });
}
