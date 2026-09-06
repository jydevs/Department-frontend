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

## Estructura

```
src/
  app/                 rutas (App Router)
  components/
    layout/            Header, NewsletterFooter, Logo, overlays
    home/              secciones de la home
    product/           ProductCard, ProductGrid, FilterBar
    ui/                primitivas (PlaceholderImage, …)
  data/                catálogo mock + tipos
  lib/                 utilidades (formato de precios, clsx)
docs/ASSETS.md         estado de imágenes / fuentes / tokens
TASKS.md               backlog y plan de ramas
```

## Imágenes

Todo slot de imagen usa `<PlaceholderImage>` hasta cablear los assets reales.
Ver [`docs/ASSETS.md`](docs/ASSETS.md).

## Flujo de contribución

Ver [`TASKS.md`](TASKS.md). Una rama por tarea, un PR por rama, revisión humana
antes de mergear. Nunca push directo a `main`.
