/**
 * Serializa datos estructurados (schema.org) para incrustarlos en `<script type="application/ld+json">`.
 * Solo es la salida de `JSON.stringify` con `<`, `>`, `&` y los separadores Unicode escapados, de modo que
 * ningún texto del catálogo/CMS puede cerrar la etiqueta ni inyectar HTML.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/** schema.org BreadcrumbList a partir de [{ name, url }] (url absoluta; el último elemento va sin enlace si no se indica). */
export function breadcrumbLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}
