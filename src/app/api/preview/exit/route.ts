import { cookies, draftMode } from "next/headers";
import { PREVIEW_COOKIE, safeInternalPath } from "@/lib/preview";

/**
 * Leaves the CMS preview: clears the token cookie, switches Draft Mode off and goes back to the published site
 * (to `?path=` when it is a same-site path such as `/pages/community`, else to `/`).
 */
export async function GET(req: Request): Promise<Response> {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);
  const destination = safeInternalPath(new URL(req.url).searchParams.get("path")) ?? "/";
  return new Response(null, { status: 302, headers: { "Cache-Control": "no-store", Location: destination } });
}
