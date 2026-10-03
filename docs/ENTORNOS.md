# Entornos: QA y producción

La tienda y el panel (`/admin`) hablan con el mismo backend (`/api/v1`). Solo cambia a qué backend/base de datos apuntan.

| | QA | Producción |
|---|---|---|
| Base de datos | tu Postgres local (poblada) | Postgres de producción |
| Backend | `http://localhost:4000` | `https://api.tu-dominio.com` |
| Pagos | pasarela simulada (`PAYMENT_PROVIDER=mock`, página `/mock-checkout/...`) | Wompi (`PAYMENT_PROVIDER=wompi` + llaves) |
| Perfil Next | `.env.development` | `.env.production` |
| Caché | catálogo 5 s · contenido 10 s | catálogo 60 s · contenido 300 s (+ revalidación por webhook) |

## Frontend

- `yarn dev` → QA (lee `.env.development`).
- `yarn build:qa && yarn start:qa` → build de producción **contra QA** (para probar ISR/SSG).
- `yarn build && yarn start` → producción (lee `.env.production`).

### Pasar a producción (solo credenciales)
Rellena en `.env.production` (o en las variables del servidor; los secretos no se commitean):

1. `NEXT_PUBLIC_API_URL` (y `API_URL` si el servidor llega por otra ruta interna).
2. `STOREFRONT_REVALIDATE_SECRET` y `STOREFRONT_SERVER_KEY` (mismos valores que el backend).
3. `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` (`pub_prod_…`).
4. `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_INDEXABLE=true`.

La pasarela simulada y `/mock-checkout` quedan bloqueadas cuando `NEXT_PUBLIC_APP_ENV=production`: la página responde **404 desde el servidor**.

### Validación al construir/arrancar
Con `NEXT_PUBLIC_APP_ENV=production` (o `NODE_ENV=production` sin perfil explícito), `next build` y `next start` **fallan** con `[config] NEXT_PUBLIC_… no es válida para producción (…)` si `NEXT_PUBLIC_API_URL` o `NEXT_PUBLIC_SITE_URL`:
faltan, no son `https`, apuntan a `localhost` o conservan los marcadores `<…>` de `.env.production`/`.env.example`. También falla si `API_URL` o `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` conservan un `<…>`.
Es intencional: `.env.production` se entrega con placeholders para que un despliegue sin rellenar no salga silenciosamente roto. En QA se mantienen los valores por defecto de localhost.
`yarn build:qa` usa `.env.development` (perfil QA) y no valida.

### Despliegue con Docker
`next.config.ts` usa `output: "standalone"`. El `Dockerfile` (multi-stage, node 22-alpine, usuario no root, `node server.js`) se construye pasando las `NEXT_PUBLIC_*` como `--build-arg` (ver cabecera del archivo). Los secretos (`STOREFRONT_REVALIDATE_SECRET`, `STOREFRONT_SERVER_KEY`) solo se pasan al ejecutar (`-e`), nunca como `ARG`.

### Cabeceras de seguridad
- **CSP** (`next.config.ts`): `default-src 'self'`; scripts/estilos con `'unsafe-inline'` (hidratación de Next y `<style>` inline; en desarrollo además `'unsafe-eval'`); `connect-src` = propio + API (`NEXT_PUBLIC_API_URL`) + Wompi; `frame-src`/`form-action` = propio + Wompi; `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'self'` (el iframe de vista previa del panel es del mismo origen); en producción `upgrade-insecure-requests`. Si se añade otro origen (analítica, CDN de medios…), hay que añadirlo ahí.
- **HSTS**: `max-age=63072000; includeSubDomains`. Se quitó `preload` a propósito: entrar en la lista de preload del navegador es prácticamente irreversible y obliga a que TODOS los subdominios sean https. Añádelo solo cuando el dominio esté listo y se registre en hstspreload.org.
- **Redirecciones del CMS** a otros hosts: solo rutas internas y el propio sitio, salvo los hosts de `REDIRECT_ALLOWED_HOSTS` (separados por comas; los externos deben ser https).
- **Vista previa** (`/api/preview`): solo activa el modo borrador si el backend acepta el token; `POST /api/exit-preview` para salir.

## Backend (referencia)
La base de datos se define solo allí: `DATABASE_URL` (+ `DATABASE_SSL=true` si el proveedor lo exige), `CORS_ORIGINS` con la URL de la tienda, `STOREFRONT_URL` (destino del webhook `POST /api/revalidate`), `PAYMENT_PROVIDER` y llaves de Wompi.
En QA conviene subir `THROTTLE_LIMIT` (el build de Next hace muchas peticiones desde una sola IP).

## Notas
- El build necesita la API accesible (home, layout y colecciones se prerenderizan; los productos se generan bajo demanda). En CI (sin backend) se usa `scripts/ci-mock-api.mjs` + `API_URL=http://127.0.0.1:4010` (ver `.github/workflows/ci.yml`).
- El checkout requiere zonas y tarifas de envío creadas en el admin (`/admin/shipping`).
