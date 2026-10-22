import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/http";
import { getCollectionPage } from "@/lib/catalog/service";

/** "Ver más" of a collection: the next page of (enriched) products after `cursor`. */

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURSOR = /^[A-Za-z0-9_-]{1,1024}$/;
const HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: Request, ctx: { params: Promise<{ handle: string }> }): Promise<Response> {
  const { handle } = await ctx.params;
  const cursor = new URL(req.url).searchParams.get("cursor") ?? "";
  if (!HANDLE.test(handle) || !CURSOR.test(cursor)) {
    return NextResponse.json({ products: [], nextCursor: null }, { status: 400, headers: HEADERS });
  }
  try {
    return NextResponse.json(await getCollectionPage(handle, cursor), { headers: HEADERS });
  } catch (err) {
    const status = err instanceof ApiError && err.status === 400 ? 400 : 502;
    return NextResponse.json({ products: [], nextCursor: null }, { status, headers: HEADERS });
  }
}
