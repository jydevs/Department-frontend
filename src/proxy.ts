import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, isProtectedPath } from "@/lib/account/config";
import { findRedirect } from "@/lib/cms/redirects";

/**
 * Applies the redirects an admin manages in the CMS (`/storefront/redirects`) before any page renders.
 * Replaces the old `middleware.ts` convention (Next 16: `proxy`). It fails open: see lib/cms/redirects.ts.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  // account pages that need a session: without any session cookie go straight to the login (no flash of the page).
  // Expired / revoked sessions are handled by the page itself (AccountArea).
  if (isProtectedPath(request.nextUrl.pathname) && !request.cookies.has(ACCESS_COOKIE) && !request.cookies.has(REFRESH_COOKIE)) {
    const login = request.nextUrl.clone();
    login.pathname = "/account/login";
    login.search = "";
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  const rule = await findRedirect(request.nextUrl.pathname);
  if (!rule) return NextResponse.next();

  if (rule.to.startsWith("/")) {
    const target = new URL(rule.to, "http://placeholder.invalid");
    const url = request.nextUrl.clone();
    url.pathname = target.pathname;
    url.search = target.search;
    url.hash = target.hash;
    return NextResponse.redirect(url, rule.status);
  }
  return NextResponse.redirect(rule.to, rule.status);
}

export const config = {
  // pages only: no framework assets, API routes, admin or static files (anything with an extension)
  matcher: ["/((?!_next/|api/|admin/|admin$|.*\\.[A-Za-z0-9]+$).*)"],
};
