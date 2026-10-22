import { cookies, draftMode } from "next/headers";
import { listProducts } from "@/lib/api/catalog";
import {
  decodePreviewTarget,
  isPreviewToken,
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_MAX_AGE,
  routeForPreview,
} from "@/lib/preview";

/**
 * Entry point of the CMS preview. The admin panel opens `/api/preview?token=<JWT>`:
 *  1. the token is only checked for SHAPE (the backend verifies the signature on every read, and it only unlocks the one
 *     document it was issued for);
 *  2. Draft Mode is switched on and the token is kept in an httpOnly session cookie;
 *  3. the visitor is sent to the internal route that shows that document. The destination is derived from the token's
 *     `{ kind, key }` – a free-form target is never accepted, so this can not be used as an open redirect.
 */

const NO_STORE = { "Cache-Control": "no-store" };

async function firstProductPath(): Promise<string | null> {
  try {
    const page = await listProducts({ limit: 1 });
    const handle = page.items[0]?.handle;
    return handle ? `/products/${handle}` : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  if (!isPreviewToken(token)) {
    return new Response("Invalid preview token", { status: 400, headers: NO_STORE });
  }

  const target = decodePreviewTarget(token);
  const isProductTemplate = target?.kind === "template" && target.key === "product";
  const destination = routeForPreview(target, isProductTemplate ? await firstProductPath() : null);

  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_COOKIE_MAX_AGE,
  });

  // relative Location: valid per RFC 9110 and immune to a proxy rewriting the Host header
  return new Response(null, { status: 302, headers: { ...NO_STORE, Location: destination } });
}
