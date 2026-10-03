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

/** URL del backend visible desde el NAVEGADOR (CORS + cookies). */
export const API_URL_PUBLIC = trim(process.env.NEXT_PUBLIC_API_URL) ?? "http://localhost:4000";

/** URL del backend para el SERVIDOR de Next (puede ser una URL interna distinta de la pública). */
export const API_URL_SERVER = trim(process.env.API_URL) ?? API_URL_PUBLIC;

/** Clave que el servidor Next presenta a la API para reenviar la IP del visitante (nunca se expone al navegador). */
export const STOREFRONT_SERVER_KEY = process.env.STOREFRONT_SERVER_KEY;

/** Segundos de caché del catálogo (el backend no avisa cambios de catálogo; el contenido sí, por etiquetas). */
export const CATALOG_REVALIDATE = Number(process.env.CATALOG_REVALIDATE_SECONDS ?? (APP_ENV === "qa" ? 5 : 60));

/** Llave pública de Wompi (checkout real). Vacía en QA con `PAYMENT_PROVIDER=mock`. */
export const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "";
