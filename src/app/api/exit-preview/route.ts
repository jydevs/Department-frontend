import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEW_COOKIE } from "@/lib/cms/content";

/** Sale del modo borrador y vuelve al inicio. */
export async function GET() {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);
  redirect("/");
}
