import { NextResponse } from "next/server";
import { search } from "@/lib/api/catalog";
import { ApiError, visitorHeaders } from "@/lib/api/http";
import { resolveMediaUrl } from "@/lib/api/media";
import { mapSummary } from "@/lib/catalog/service";

/**
 * Server-side proxy of the backend's `GET /storefront/search`, consumed by the search overlay. It keeps the storefront
 * key and the visitor's IP on the server and answers with the view-model the UI renders (`Product` + collections).
 *
 * `q` is trimmed and must have 2–80 characters; anything else answers 200 with empty lists (never 400), so typing
 * can never show an error.
 */

const MIN_QUERY = 2;
const MAX_QUERY = 80;
const HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: Request): Promise<Response> {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY || q.length > MAX_QUERY) {
    return NextResponse.json({ products: [], collections: [] }, { headers: HEADERS });
  }

  try {
    const result = await search(q, visitorHeaders(req));
    return NextResponse.json(
      {
        products: result.products.map(mapSummary),
        collections: result.collections.map((c) => ({
          handle: c.handle,
          title: c.title,
          imageUrl: resolveMediaUrl(c.image?.url),
        })),
      },
      { headers: HEADERS },
    );
  } catch (err) {
    const status = err instanceof ApiError && err.status === 429 ? 429 : 502;
    return NextResponse.json({ products: [], collections: [] }, { status, headers: HEADERS });
  }
}
