# Huecos del backend que afectan al front

Lo que el storefront necesitaría de la API y hoy no existe. El front **no inventa** estos datos: usa el enriquecimiento
mínimo posible y lo documenta aquí. Evidencia tomada de la API de pruebas (`department_qa`) y de
`Department-backend/src/catalog/storefront/dto/*`.

## 1. Los listados no traen lo que pintan las tarjetas

`GET /storefront/products`, `GET /storefront/collections/:handle` y `GET /storefront/search` devuelven por producto solo
`{ id, handle, title, price, image, available }` (`StorefrontProductSummary`). Una tarjeta necesita además:

| Dato | Para qué | Dónde está hoy |
| --- | --- | --- |
| `compareAtPrice` | precio tachado + insignia "Oferta" | solo en `variants[]` de `GET /storefront/products/:handle` |
| segunda imagen | foto al pasar el ratón | solo en `media[]` del detalle |
| tallas (`variants[].id/title/available`) | "Añadir rápido" por talla | solo en el detalle |
| `tags` | ranking de "También te puede gustar" | solo en el detalle |

**Petición exacta:** añadir al item de `StorefrontProductSummary` (los tres endpoints) los campos
`compareAtPrice: number | null` (el de la variante más barata disponible), `images: { url, alt }[]` (las 2 primeras),
`variants: { id, title, price, compareAtPrice, available, optionValues }[]` y `tags: string[]`.

**Qué hace el front mientras tanto:** pide el detalle (`GET /storefront/products/:handle`, cacheado 60 s) SOLO de los
productos que va a mostrar (24 por página de colección, 4–6 en relacionados/campaña), en paralelo. Las búsquedas y "Más
buscado" no se enriquecen (usan los datos del listado).

## 2. No hay total de productos

`CursorPage` (`{ items, nextCursor, hasMore }`) no incluye `total`, y `GET /storefront/collections` no trae
`productCount`. Los contadores "NN piezas" (cabecera, mosaicos, campaña, cabecera de colección) se calculan recorriendo
el listado con `limit=100` (una llamada para cualquier catálogo normal) y se cachean 5 minutos.

**Petición exacta:** `total: number` en la respuesta de `GET /storefront/products` y de `GET /storefront/collections/:handle`
(`products.total`), o `productCount` en cada item de `GET /storefront/collections`.

## 3. Filtros del listado

`GET /storefront/products` acepta `collection`, `tag`, `q`, `sort` pero no `available=true|false`. El filtro "En stock /
Agotado" de la colección se hace en el navegador sobre las páginas ya cargadas ("Ver más" va cargando el resto), así que
con un catálogo paginado el filtro solo ve lo cargado. **Petición:** `available` (boolean) en `StorefrontProductsQueryDto`
y en `GET /storefront/collections/:handle`.

## 4. El catálogo no empuja etiquetas de revalidación

`POST /api/revalidate` solo recibe etiquetas de contenido (`content:*`, `redirects`); el backend no avisa de cambios de
catálogo. Por eso productos, colecciones, precios y disponibilidad se **revalidan por tiempo (60 s)** y los contadores
(5 min). **Petición:** que `RevalidationService` envíe también `catalog`, `catalog:product:<handle>` y
`catalog:collection:<handle>` al publicar/editar catálogo (el front ya etiqueta así sus lecturas).

## 5. Semilla de contenido

- Nada enlaza a `/pages/contact` (ni el menú principal, ni el de pie, ni la columna "Comunidad" del footer): la página
  existe y funciona pero solo se llega por URL. **Petición:** añadir `{ label: "Contacto", url: "/pages/contact" }` a
  `col-community` del layout o un ítem `nav-contact` al menú `footer`.
- Las tres colecciones sembradas (`all`, `men`, `women`) tienen el mismo título "Clothes"
  (`GET /storefront/collections`), así que la cabecera de `/collections/men` y `/collections/women` muestra "Clothes" y
  se distinguen solo por el `handle`. **Petición:** títulos "Men" / "Women" (o `seo.title`) en la semilla.
- El pie de página fija `© 2026 Daregular Dept.` en el texto del CMS; el respaldo del front usa el año actual.

## 6. Carrito, checkout y pagos

Evidencia: `Department-backend/src/commerce/{cart,checkout,payments,shipping,pricing}` y la API de pruebas (`department_qa`).
Estado tras las ramas `fix/backend-minor-gaps` (API) y `feat/front-endpoints-nuevos` (front): lo marcado **Resuelto** ya
está conectado en el front.

| # | Hueco | Estado |
| --- | --- | --- |
| 1 | Cotización con envío en `GET /storefront/carts/:id`. | **Resuelto.** El checkout pide `GET /api/cart?shippingRateId&department[&email]` (BFF → `?shippingRateId=&department=&email=`) y el resumen muestra `shippingTotal`, IVA y `total` del backend; el cliente ya no suma. |
| 2 | El `Quote` no decía si el IVA está incluido. | **Resuelto.** Se usa `taxIncluded` y `taxBreakdown` (carrito y checkout). |
| 3 | Las líneas del `Quote` no traían el `handle`. | **Resuelto.** Se usa `productHandle`; se eliminó el mapa `variantId → handle` de `localStorage` (la clave antigua se borra). |
| 4 | `GET /storefront/carts/:id` no indicaba `converted`. | **Resuelto.** Un carrito `converted` se descarta en el BFF (se borra la cookie `dept_cart`) y se responde vacío; el checkout sigue borrándola al crear el pedido. |
| 5 | Las líneas del pedido público no traían `variantId` ni había `payment.instructions`. | **Resuelto.** «Reintentar el pago» y «Volver al carrito» salen del pedido de la API con el token (`/orders/<n>?token=`), también sin la cookie; `dept_order_<n>` guarda solo el token. |
| 6 | `redirectUrl` de Wompi no lleva el número de pedido (Wompi solo añade `?id=`). | Abierto. El pedido se identifica por la cookie `dept_last_order`; en otro navegador la página pide el enlace de seguimiento o iniciar sesión. **Petición:** `redirect-url` con `?order=<n>`. |
| 7 | `GET /storefront/shipping-rates` exige `X-Cart-Token`. | Documentado en `docs/API.md` del backend; el BFF lo envía. |
| 8 | `DISCOUNT_INVALID` nunca traía `already_used` al aplicar el código. | **Resuelto.** El checkout envía `email` (si es válido) al aplicar el código y al cotizar; `already_used` se muestra en español. |
| 9 | Un pago `DECLINED`/`ERROR` deja el pedido `pending`. | Informativo: el front lo muestra como «no aprobado» y permite reintentar con la misma referencia. |
| 10 | El stock del catálogo de pruebas es limitado y las reservas de pedidos `pending` (30 min) lo consumen. | Informativo: las pruebas rotan tallas. |

## 7. Cuenta, direcciones e inventario del panel

- **Reenvío de verificación:** `POST /storefront/customers/auth/resend-verification` conectado (tras el registro y en el
  enlace vencido); ya no se remite a «olvidé mi contraseña». **Resuelto.**
- **Documento de dirección:** `PATCH …/addresses/:id` acepta `documentType`/`documentNumber` en `null`; el front los envía
  así al vaciarlos y solo exige el mínimo de 4 caracteres si hay valor. **Resuelto.**
- **Stock por variante en el editor de productos:** `GET /admin/inventory` filtra por `productId`/`variantId`;
  `useVariantLevels` ya no busca por título. **Resuelto.**
