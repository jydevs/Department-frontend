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

La pasarela simulada y `/mock-checkout` quedan bloqueadas cuando `NEXT_PUBLIC_APP_ENV=production`.

## Backend (referencia)
La base de datos se define solo allí: `DATABASE_URL` (+ `DATABASE_SSL=true` si el proveedor lo exige), `CORS_ORIGINS` con la URL de la tienda, `STOREFRONT_URL` (destino del webhook `POST /api/revalidate`), `PAYMENT_PROVIDER` y llaves de Wompi.
En QA conviene subir `THROTTLE_LIMIT` (el build de Next hace muchas peticiones desde una sola IP).

## Notas
- El build necesita la API accesible (home, layout y colecciones se prerenderizan; los productos se generan bajo demanda).
- El checkout requiere zonas y tarifas de envío creadas en el admin (`/admin/shipping`).
