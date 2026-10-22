import { notFound } from "next/navigation";

/**
 * Catch-all of the storefront: a URL that matches no route is turned into a regular `notFound()`, so the 404 is rendered
 * by `(site)/not-found.tsx` inside the storefront layout (with the CMS `template/404`). The storefront and the admin panel
 * are separate root layouts, and without this file Next would answer unmatched URLs with its built-in 404 page.
 */
export default function UnmatchedPage(): never {
  notFound();
}
