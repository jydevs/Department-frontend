/**
 * Configuración de entorno compartida (tienda y panel).
 *
 * Perfiles (ver docs/ENTORNOS.md):
 *  - qa          → backend y base de datos LOCALES (`yarn dev`, `.env.development`)
 *  - production  → backend y base de datos de PRODUCCIÓN (`yarn build && yarn start`, `.env.production`)
 *
 * El perfil lo marca `NEXT_PUBLIC_APP_ENV`; si no existe se deduce de NODE_ENV.
 * Para pasar a producción solo hay que rellenar las variables de `.env.production`.
 */
export type AppEnv = "qa" | "production";

const trim = (v: string | undefined): string | undefined => (v ? v.replace(/\/+$/, "") : undefined);

export const APP_ENV: AppEnv =
  process.env.NEXT_PUBLIC_APP_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "qa"
    ? process.env.NEXT_PUBLIC_APP_ENV
    : process.env.NODE_ENV === "production"
      ? "production"
      : "qa";

export const API_PREFIX = "/api/v1";

const LOCAL_HOST = /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?$)/i;

/**
 * En PRODUCCIÓN las URLs públicas son obligatorias: https, sin localhost y sin placeholders `<…>` (los de `.env.production`).
 * Lanza un error claro en el build/arranque en lugar de publicar una tienda rota. En QA no valida (hay valores por defecto).
 * Se evalúa con las variables ya inyectadas (`NEXT_PUBLIC_*` se sustituyen en el bundle del navegador).
 */
export function requireProductionUrl(name: string, value: string | undefined): string | undefined {
  if (APP_ENV !== "production") return value;
  const fail = (why: string): never => {
    throw new Error(
      `[config] ${name} no es válida para producción (${why}). Valor actual: ${JSON.stringify(value ?? null)}. ` +
        `Define ${name} con una URL https pública real (por ejemplo https://api.tu-dominio.com) en .env.production o en el entorno del build. Ver docs/ENTORNOS.md.`,
    );
  };
  if (!value) return fail("falta");
  if (/[<>]/.test(value)) return fail("contiene un placeholder <…> sin rellenar");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return fail("no es una URL");
  }
  if (u.protocol !== "https:") return fail("debe ser https");
  if (LOCAL_HOST.test(u.hostname)) return fail("apunta a localhost");
  return value;
}

/** URL del backend visible desde el NAVEGADOR (CORS + cookies). */
export const API_URL_PUBLIC = trim(requireProductionUrl("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL)) ?? "http://localhost:4000";

/** URL del backend para el SERVIDOR de Next (puede ser una URL interna distinta de la pública; en producción interna puede ser http). */
export const API_URL_SERVER = (() => {
  const v = process.env.API_URL;
  if (APP_ENV === "production" && v && /[<>]/.test(v)) {
    throw new Error(`[config] API_URL contiene un placeholder <…> sin rellenar (${JSON.stringify(v)}). Déjala sin definir o pon la URL interna real. Ver docs/ENTORNOS.md.`);
  }
  return trim(v) ?? API_URL_PUBLIC;
})();

/** Clave que el servidor Next presenta a la API para reenviar la IP del visitante (nunca se expone al navegador). */
export const STOREFRONT_SERVER_KEY = process.env.STOREFRONT_SERVER_KEY;

/** Segundos de caché del catálogo (el backend no avisa cambios de catálogo; el contenido sí, por etiquetas). */
export const CATALOG_REVALIDATE = Number(process.env.CATALOG_REVALIDATE_SECONDS ?? (APP_ENV === "qa" ? 5 : 60));

/** Llave pública de Wompi (checkout real). Vacía en QA con `PAYMENT_PROVIDER=mock`. */
export const WOMPI_PUBLIC_KEY = (() => {
  const v = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "";
  if (APP_ENV === "production" && /[<>]/.test(v)) {
    throw new Error(`[config] NEXT_PUBLIC_WOMPI_PUBLIC_KEY conserva el placeholder ${JSON.stringify(v)}. Pon la llave pública real (pub_prod_…) o déjala vacía. Ver docs/ENTORNOS.md.`);
  }
  return v;
})();
