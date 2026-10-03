import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEW_COOKIE } from "@/lib/cms/content";
import { isSafePath } from "@/lib/url";

const JWT = /^[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}$/;

/** Ruta donde se ve cada tipo de documento. */
function landing(kind: string, key: string): string {
  if (kind === "page") return `/pages/${encodeURIComponent(key)}`;
  if (kind === "template" && key === "collection") return "/collections/all";
  return "/";
}

/**
 * Activa el modo borrador. Lo abre el panel con `GET /api/preview?token=…` (el token lo firma el backend con
 * `POST /admin/content/preview-tokens`, vale 1 h y solo para UN documento). El token se guarda en una cookie
 * httpOnly y se reenvía al backend como `?preview=` al leer ese documento.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!JWT.test(token)) return new Response("Token de vista previa inválido", { status: 401 });

  let target = "/";
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { kind?: string; key?: string };
    target = landing(String(claims.kind), String(claims.key));
  } catch {
    /* sin claims legibles → inicio */
  }
  const to = url.searchParams.get("path");
  if (to && isSafePath(to)) target = to;

  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  redirect(target);
}
