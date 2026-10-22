import "server-only";
import { SITE_URL } from "@/lib/site";

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CSRF guard for every BFF mutation (defence in depth on top of SameSite=Lax cookies):
 *  1. the body must be JSON (a cross-site form or a simple request cannot send that without a CORS preflight);
 *  2. the Origin header must be this site (the request Host, the forwarded host or NEXT_PUBLIC_SITE_URL).
 *     Without Origin, only browsers' `Sec-Fetch-Site: same-origin | none` is accepted.
 * Returns an error code when the request must be refused.
 */
export function csrfViolation(req: Request): "CSRF_CONTENT_TYPE" | "CSRF_ORIGIN" | null {
  const type = (req.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json") return "CSRF_CONTENT_TYPE";

  const allowed = new Set<string>();
  const host = req.headers.get("host");
  if (host) allowed.add(host.toLowerCase());
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) allowed.add(forwarded.toLowerCase());
  const site = hostOf(SITE_URL);
  if (site) allowed.add(site);

  const origin = req.headers.get("origin");
  if (origin) {
    const originHost = hostOf(origin);
    return originHost && allowed.has(originHost) ? null : "CSRF_ORIGIN";
  }
  const fetchSite = req.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "none" ? null : "CSRF_ORIGIN";
}
