# Plantillas de variables de entorno (solo marcadores, sin secretos reales)

| Archivo | Va en |
|---|---|
| `frontend.local.env` | `Department-frontend/.env.development` (o `.env.local`) |
| `frontend.production.env` | `Department-frontend/.env.production` o variables del servidor |
| `backend.local.env` | `Department-backend/.env` |
| `backend.production.env` | variables del servidor del backend (no commitear) |

Deben coincidir entre repos: `STOREFRONT_REVALIDATE_SECRET` y `STOREFRONT_SERVER_KEY`.
Tienda y API deben compartir dominio registrable (p. ej. `tu-dominio.com` y `api.tu-dominio.com`).
Detalle en `docs/ENTORNOS.md`.
