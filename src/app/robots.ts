import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

/** Private areas that must never be crawled even when the site is indexable. */
const PRIVATE_PATHS = ["/api/", "/checkout", "/account", "/orders/", "/mock-checkout", "/admin", "/newsletter"];

/** Disallow everything unless NEXT_PUBLIC_INDEXABLE=true (see lib/site.ts). */
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
