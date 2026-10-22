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

## Variables de entorno

Ver `.env.example`. Las principales:

| Variable | Default | Uso |
| --- | --- | --- |
| `API_URL` | `NEXT_PUBLIC_API_URL` | Origen de la API para el **servidor** de Next (puede ser interno, p. ej. `http://api:4000`). Nunca llega al navegador. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Origen **público** de la API (navegador: newsletter/contacto) y respaldo de `API_URL`. |
| `NEXT_PUBLIC_MEDIA_URL` | `NEXT_PUBLIC_API_URL` | Origen **público** de `/media/...` (imágenes subidas). Es el único host remoto que `next/image` acepta. |
| `STOREFRONT_REVALIDATE_SECRET` | — | Secreto HMAC del webhook `POST /api/revalidate` (sin él la ruta queda cerrada). |
| `STOREFRONT_SERVER_KEY` | — | `X-Storefront-Key`: permite reenviar la IP del visitante (`X-Visitor-Ip`) para el rate limit de la API. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Origen canónico (metadata, Open Graph, sitemap, JSON-LD). Sin `/` final. |
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

## Contenido y caché

Todo el contenido editorial (textos, menús, secciones, tema) sale del CMS de la API; el catálogo, de `/storefront/*`.

- **Contenido (CMS):** se cachea con etiquetas (`content:*`, `redirects`) y la API avisa a `POST /api/revalidate` al
  publicar, así que un cambio se ve al instante. Además caduca a los 60 s.
- **Catálogo (productos, colecciones, precios, stock):** se **revalida por tiempo (60 s)**, y los contadores "NN piezas"
  cada 5 min, porque el backend no empuja etiquetas de catálogo (ver `docs/BACKEND-GAPS.md`).
- **Vista previa:** `/api/preview?token=…` (enlace que genera el panel de administración) activa Draft Mode y guarda el
  token en una cookie httpOnly; el borrador se lee con `?preview=<token>`, sin caché, y `/api/preview/exit` lo desactiva.
- **Redirecciones:** `src/proxy.ts` aplica `/storefront/redirects` (caché en memoria de 60 s por instancia; si la API
  falla o tarda más de 1,5 s, la petición sigue sin redirigir).
- **Sin API:** menú, newsletter y pie vuelven a los textos originales (`src/lib/cms/fallback.ts`) y las páginas de
  contenido muestran un error con la marca en lugar de una pantalla en blanco.

## Cuenta del cliente

El navegador **no** habla con la API de clientes: lo hace un BFF de route handlers de Next bajo `/api/account/*`
(`src/app/api/account/**`, núcleo en `src/lib/account/server/`). La cookie de refresh de la API (`dept_ct`) tiene el
`Path` de la API y `SameSite=Lax`, así que no viaja entre orígenes distintos.

- **Sesión:** solo cookies httpOnly del front, `path=/`, `SameSite=Lax`, `Secure` en producción: `dept_at` (access token,
  ~15 min) y `dept_rt_c` (refresh). Ningún token llega a JavaScript del navegador ni al cuerpo de las respuestas.
- **Refresh transparente:** si falta `dept_at` (o la API da 401) el BFF rota el refresh y propaga las cookies nuevas.
  Las peticiones simultáneas con la misma cookie comparten **una** rotación (la API trata un refresh reutilizado como robo y
  cierra la sesión). El mapa de rotaciones vive en memoria del proceso: con varias instancias de Next detrás de un balanceador
  hace falta afinidad de sesión o un almacén compartido.
- **CSRF:** las mutaciones exigen `Content-Type: application/json` y `Origin` (o `Sec-Fetch-Site`) del propio sitio.
  Todas las respuestas llevan `Cache-Control: no-store`. Se reenvían `X-Visitor-Ip` / `X-Storefront-Key` como en `lib/api/http.ts`.
- **Páginas** (todas `noindex`): `/account/login`, `register`, `verify-email?token=` (pide contraseña nueva: el enlace
  prueba el buzón y fija la contraseña), `forgot-password`, `reset-password?token=`; protegidas (`proxy.ts` + `AccountArea`,
  redirigen a `/account/login?next=<ruta interna>`): `/account`, `/account/addresses`, `/account/orders[/<n>]`,
  `/account/privacy`. Newsletter: `/newsletter/confirmar?token=` y `/newsletter/baja?token=` (pregunta antes de dar de baja).
  Son exactamente los enlaces que envía la API por correo (`STOREFRONT_URL` = `NEXT_PUBLIC_SITE_URL`).
- **Estado en el cliente:** `useCustomer()` (`src/lib/account/useCustomer.tsx`), provisto en `app/layout.tsx`. El servidor
  solo comprueba si las cookies existen para no pedir `/api/account/me` a los visitantes anónimos.
