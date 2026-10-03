# Daregular Dept. — Frontend

Réplica del frontend de [daregulardept.com](https://daregulardept.com) construida
con **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**. Solo frontend.

> La variante `www.` del dominio muestra una landing "Opening soon" de Shopify
> protegida con contraseña — es un placeholder, no el diseño real.

## Requisitos

- Node.js ≥ 20.9
- yarn 1.x (`corepack enable` o `npm i -g yarn`)

## Desarrollo

```bash
yarn install
yarn dev          # http://localhost:3000
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `yarn dev` | Servidor de desarrollo |
| `yarn build` | Build de producción |
| `yarn start` | Sirve el build |
| `yarn lint` | ESLint |
| `yarn typecheck` | `tsc --noEmit` |

## Panel de administración (`/admin`)

Panel integrado en esta misma app (vistas bajo `/admin`, sin proyecto aparte), con el mismo diseño de la tienda.
**Fase visual:** funciona con datos simulados y sin login (aún no consume la API). Ver [`docs/ADMIN.md`](docs/ADMIN.md).

```bash
yarn dev          # tienda http://localhost:3000 · panel http://localhost:3000/admin
```

## Variables de entorno

| Variable | Default | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Origen canónico (metadata, Open Graph, sitemap, JSON-LD). Sin `/` final. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | URL del backend (la usará la integración; hoy solo la lee `src/lib/admin/api-client.ts`, sin uso). |
| `NEXT_PUBLIC_INDEXABLE` | `false` | `true` permite indexación. Por defecto el sitio es `noindex` y `robots.txt` bloquea todo (es una réplica). |

## SEO y producción

- `robots.txt` y `sitemap.xml` generados (`src/app/robots.ts`, `sitemap.ts`).
- Imagen Open Graph global y por producto (`opengraph-image.tsx`, 1200×630).
- JSON-LD `Product` y `canonical` en cada ficha.
- `error.tsx` / `global-error.tsx` con la marca; cabeceras de seguridad en `next.config.ts`.
- CI (`.github/workflows/ci.yml`): lint + typecheck + build en cada PR.

## Estructura

```
src/
  app/                 rutas (App Router)
  components/
    layout/            Header, NewsletterFooter, Logo, overlays
    home/              secciones de la home
    product/           ProductCard, ProductGrid, FilterBar
    ui/                primitivas (PlaceholderImage, …)
    admin/             kit UI y módulos del panel /admin
  app/admin/           rutas del panel
  data/                catálogo mock + tipos
  lib/                 utilidades (formato de precios, clsx)
  lib/admin/           datos simulados, hooks y utilidades del panel
docs/ESTADO.md         estado actual, contrato con el backend y hoja de ruta de la integración
docs/ADMIN.md          panel /admin (fase visual)
docs/PLAN-PRODUCCION.md plan para llevar frontend y backend a producción
docs/ASSETS.md         estado de imágenes / fuentes / tokens
TASKS.md               backlog y plan de ramas
```

## Imágenes

Todo slot de imagen usa `<PlaceholderImage>` hasta cablear los assets reales.
Ver [`docs/ASSETS.md`](docs/ASSETS.md).

## Flujo de contribución

Ver [`TASKS.md`](TASKS.md). Una rama por tarea, un PR por rama, revisión humana
antes de mergear. Nunca push directo a `main`.
