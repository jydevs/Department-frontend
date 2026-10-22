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

| # | Hueco | Qué hace el front mientras tanto | Petición exacta |
| --- | --- | --- | --- |
| 1 | No hay cotización con envío: `GET /storefront/carts/:id` devuelve siempre `shippingTotal: 0`. El `Quote` con `shippingRateId`/`department` solo se usa dentro del checkout. | El resumen suma el precio de la tarifa que devuelve `/storefront/shipping-rates` y no muestra el IVA exacto hasta que existe el pedido (el total final lo fija el servidor). | Aceptar `?shippingRateId=&department=` en `GET /storefront/carts/:id` (o un `POST …/quote`). |
| 2 | El `Quote` no dice si el IVA está incluido (`prices_include_tax`). | Se infiere: `total == subtotal − descuento + envío`. | Añadir `pricesIncludeTax: boolean` (y `taxRatePercent`) al `Quote`. |
| 3 | Las líneas del `Quote` no traen el `handle` del producto. | Se guarda `variantId → handle` en `localStorage` (solo metadatos de presentación, nunca precios). Una línea añadida desde otro navegador no enlaza a su ficha. | `productHandle` en `QuoteLine`. |
| 4 | `GET /storefront/carts/:id` no indica `converted`: tras el checkout el carrito sigue respondiendo con sus líneas y las mutaciones dan 409 `CART_CONVERTED`. | Al crear el pedido, el BFF borra su cookie `dept_cart` (el carrito ya está convertido). | `convertedOrderNumber` (o 410) en `CartResponse`. |
| 5 | Las líneas del pedido público no traen `variantId` y el pedido no devuelve las instrucciones de pago: no se puede reabrir el pago ni recuperar el carrito desde la API. | El BFF guarda en la cookie httpOnly del pedido las instrucciones de pago (no secretas) y `[variantId, cantidad]` de su carrito. Sin esa cookie (otro navegador) no hay reintento. | `GET /storefront/orders/:n?token=` con `payment.instructions` mientras `status=pending`, y `variantId` en las líneas. |
| 6 | `redirectUrl` de Wompi es `${STOREFRONT_URL}/checkout/result` sin referencia ni número de pedido (Wompi solo añade `?id=`). | El pedido se identifica por la cookie `dept_last_order`. Si el comprador vuelve en otro navegador, la página pide el enlace de seguimiento o iniciar sesión. | Permitir `redirect-url` con `?order=<n>` o devolver `redirectUrl` que ya incluya el número de pedido. |
| 7 | `GET /storefront/shipping-rates` exige `X-Cart-Token` (no documentado en `docs/API.md`, que no lo lista como «Auth»). | El BFF lo envía. | Documentarlo. |
| 8 | `DISCOUNT_INVALID` en el carrito nunca trae `already_used` (necesita el email), solo aparece al pagar. | El checkout mapea el error a un mensaje claro. | Opcional: aceptar `email` al aplicar el código. |
| 9 | Un pago `DECLINED`/`ERROR` deja el pedido `pending` (decisión documentada del backend). | El front lo muestra como «no aprobado» (`pending` + `payment.status=declined|error`) y permite reintentar con la misma referencia. | — (solo informativo). |
| 10 | El stock del catálogo de pruebas es limitado y las reservas de pedidos `pending` (30 min) lo consumen: las pruebas automáticas agotan variantes. | Las pruebas rotan tallas. | — |
