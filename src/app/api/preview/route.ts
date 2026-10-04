import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { sfGet } from "@/lib/api/server";
import { PREVIEW_COOKIE } from "@/lib/cms/content";
import { isSafePath } from "@/lib/url";

const JWT = /^[A-Za-z0-9_-]{10,700}\.[A-Za-z0-9_-]{10,1300}\.[A-Za-z0-9_-]{10,700}$/;
/** Los tokens reales miden ~250 bytes; cualquier cosa mayor es abuso. */
const MAX_TOKEN = 2048;

/** Endpoint del backend que lee cada tipo de documento (el token solo vale para UN documento: `{ kind, key }`). */
function docEndpoint(kind: string, key: string): string | null {
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(key)) return null;
  switch (kind) {
    case "settings": return "/storefront/content/settings";
    case "menu": return `/storefront/content/menus/${encodeURIComponent(key)}`;
    case "template": return `/storefront/content/templates/${encodeURIComponent(key)}`;
    case "page": return `/storefront/content/pages/${encodeURIComponent(key)}`;
    default: return null;
  }
}

/** Ruta donde se ve cada tipo de documento. */
function landing(kind: string, key: string): string {
  if (kind === "page") return `/pages/${encodeURIComponent(key)}`;
  if (kind === "template" && key === "collection") return "/collections/all";
  return "/";
}

/**
 * Pregunta al BACKEND (que es quien tiene el secreto de firma) si el token es válido y vigente para su documento:
 * `GET …?preview=<token>` responde 200 con el borrador, o 401 "Invalid or expired preview token". Aquí no se verifica
 * nada localmente para no exponer el secreto. Cualquier fallo (red, 4xx, 5xx) = no válido.
 */
async function validate(token: string, kind: string, key: string): Promise<boolean> {
  const path = docEndpoint(kind, key);
  if (!path) return false;
  try {
    return (await sfGet(path, { preview: token })) !== null;
  } catch (e) {
    if (!(e instanceof ApiError)) console.error("[preview] no se pudo validar el token:", e);
    return false;
  }
}

/**
 * Activa el modo borrador. Lo abre el panel con `GET /api/preview?token=…` (el token lo firma el backend con
 * `POST /admin/content/preview-tokens`, vale 1 h y solo para UN documento). Solo se activa si el backend lo acepta;
 * si no, se vuelve a "/". El token se guarda en una cookie httpOnly y se reenvía al backend como `?preview=`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (token.length > MAX_TOKEN || !JWT.test(token)) redirect("/");

  let claims: { kind?: unknown; key?: unknown };
  try {
    claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as typeof claims;
  } catch {
    redirect("/");
  }
  const kind = String(claims.kind), key = String(claims.key);
  if (!(await validate(token, kind, key))) redirect("/");

  let target = landing(kind, key);
  const to = url.searchParams.get("path");
  if (to && isSafePath(to)) target = to;

  const secure = url.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";
  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 });
  redirect(target);
}
