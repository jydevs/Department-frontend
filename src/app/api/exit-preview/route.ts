import { cookies, draftMode } from "next/headers";
import { PREVIEW_COOKIE } from "@/lib/cms/content";

/**
 * Sale del modo borrador. Solo POST (un GET se podría disparar desde cualquier página con una imagen/enlace).
 * Nada del panel ni de la tienda lo llama por GET.
 */
export async function POST() {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);
  return new Response(null, { status: 204 });
}
