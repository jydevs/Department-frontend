import { safeJsonLd } from "@/lib/jsonld";

/** Datos estructurados schema.org (uno o varios objetos) con el escapado seguro de `safeJsonLd`. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}
