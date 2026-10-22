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

## Carrito, checkout y pagos

- **Carrito en el servidor.** El carrito vive en la API (`/storefront/carts`). El navegador nunca la llama: usa las rutas
  de Next `/api/cart/**` (BFF), que guardan el id y el token del carrito en la cookie httpOnly `dept_cart` (30 días,
  `Secure` en producción, `SameSite=Lax`). Las mutaciones exigen `Content-Type: application/json` y un `Origin` igual al
  host (protección CSRF) y nunca se cachean. Los precios, descuentos e IVA los dicta siempre la cotización de la API.
  `src/lib/cart.ts` conserva su API pública (`useCart`, `addToCart`, `setLineQty`, `removeFromCart`).
- **Checkout** (`/checkout`): contacto, dirección de envío (32 departamentos + Bogotá D.C.), tarifas por departamento
  (`/storefront/shipping-rates`), facturación opcional, código de descuento y aceptación obligatoria de Términos y
  Privacidad. `POST /api/checkout` llama a `POST /storefront/checkouts` con `Idempotency-Key` (una por cuerpo distinto,
  reutilizada en reintentos). El token de acceso del pedido se guarda en la cookie httpOnly `dept_order_<n>` (3 días),
  nunca en `localStorage`.
- **Resultado** (`/checkout/result`, destino de `redirect-url` de Wompi) y **seguimiento** (`/orders/<n>?token=…`):
  consultan el estado cada 2 s hasta 30 s mientras el pago está pendiente. Un pago rechazado permite reabrir la pasarela
  con la misma referencia; un pedido cancelado/expirado permite recuperar el carrito.
- **Pasarela mock (solo desarrollo).** Con `PAYMENT_PROVIDER=mock` y `MOCK_PAYMENTS_ENABLED=true` en el backend, el pago
  redirige a `/mock-checkout/<referencia>` (aprobar / rechazar). Esa ruta y `/api/checkout/mock-payment` devuelven 404
  con `NODE_ENV=production` o con `NEXT_PUBLIC_PAYMENT_PROVIDER=wompi`.

### Activar Wompi

Las llaves **solo van en el backend** (`WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`,
`PAYMENT_PROVIDER=wompi`, `MOCK_PAYMENTS_ENABLED=false`, `STOREFRONT_URL` = el origen público de esta tienda) y el webhook
de Wompi debe apuntar a la API. En este front no se pone ninguna llave:

1. `NEXT_PUBLIC_SITE_URL` = origen público de la tienda (debe coincidir con `STOREFRONT_URL` del backend: la cookie del
   pedido se lee en `/checkout/result`, que Wompi abre en ese origen).
2. `API_URL` / `NEXT_PUBLIC_API_URL` = la API.
3. (Opcional) `NEXT_PUBLIC_PAYMENT_PROVIDER=wompi` para ocultar del todo el simulador.

El front arma `https://checkout.wompi.co/p/` con `public-key`, `currency`, `amount-in-cents`, `reference`,
`signature:integrity` y `redirect-url`, usando exactamente los campos que devuelve el backend. Wompi vuelve a
`/checkout/result?id=<transacción>` y el estado real lo confirma el webhook (la página lo consulta en la API).
