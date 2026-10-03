import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

/** Rutas privadas o sin valor para buscadores (panel, cuenta, compra, pedidos, API, newsletter). */
const PRIVATE_PATHS = ["/admin", "/account", "/checkout", "/orders", "/mock-checkout", "/api", "/newsletter"];

/** Disallow everything unless NEXT_PUBLIC_INDEXABLE=true (see lib/site.ts). */
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
