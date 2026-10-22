import { NextResponse } from "next/server";
import { REFRESH_COOKIE } from "@/lib/account/config";
import { clearSessionCookies, fail, guarded, json, refreshSession, setSessionCookies } from "@/lib/account/server/bff";

export const dynamic = "force-dynamic";

/**
 * Explicit refresh. The other routes already refresh transparently; this one exists for callers that want to renew
 * the session on purpose. Tokens go to the cookies only.
 */
export const POST = guarded(async (req): Promise<NextResponse> => {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return fail(401, "UNAUTHORIZED");
  const outcome = await refreshSession(req, refreshToken);
  if (outcome.kind === "unavailable") return fail(503, "SERVICE_UNAVAILABLE");
  if (outcome.kind === "invalid") {
    const res = fail(401, "SESSION_EXPIRED");
    clearSessionCookies(res);
    return res;
  }
  const res = json({ refreshed: true });
  setSessionCookies(res, outcome.tokens);
  return res;
});
