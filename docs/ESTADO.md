# Estado del proyecto — frontend (tienda + panel `/admin`)

Actualizado: 4 de octubre de 2026 · rama `claude/tender-heisenberg-w6jnxy`.

## 1. Resumen

| Área | Estado |
| --- | --- |
| Tienda (home, colecciones, producto, búsqueda, páginas, contacto, community) | **Conectada a la API**; todo el texto y las secciones salen del CMS (con valores por defecto si falta). |
| Carrito, descuentos, envío, checkout y pagos | **Conectados** (`/storefront/carts`, `/storefront/checkouts` con `Idempotency-Key`, pasarela simulada en QA / Wompi en producción, `/checkout/result`, `/orders/[n]`). |
| Cuenta de cliente (`/account/*`) | **Conectada** (registro, verificación, login con refresh `dept_ct`, recuperación, perfil, direcciones, pedidos); newsletter `/newsletter/confirmar` y `/newsletter/baja`. |
| Panel `/admin` | **Conectado** a `/auth/*` y `/admin/*` (ver [`ADMIN.md`](ADMIN.md)); sin datos simulados. |
| Entornos | QA (BD local) y producción (solo credenciales): [`ENTORNOS.md`](ENTORNOS.md). |
| Plan de producción | [`PLAN-PRODUCCION.md`](PLAN-PRODUCCION.md). |

## 2. Cómo está construida la integración

- `src/lib/api/*`: configuración por perfil, `sfGet` (servidor, caché ISR por etiquetas, reintentos ante 429/5xx), `apiFetch` (cliente), tipos de DTO, mapeos y mensajes de error en español.
- `src/lib/cms/*` + `components/cms/SectionRenderer`: render de secciones del CMS; `SiteProvider` entrega ajustes/menús a los componentes cliente.
- `app/api/revalidate` (webhook firmado HMAC → `revalidateTag`), `app/api/preview` y `exit-preview` (vista previa de borradores con token).
- `src/proxy.ts` aplica las redirecciones del CMS (`GET /storefront/redirects`, caché en memoria de 60 s, 301/302, conserva la query; no afecta a `/api`, `/admin` ni estáticos). Un cambio en `/admin/redirects` tarda hasta ~2 min en verse (60 s del backend + 60 s del proxy).
- Listados enriquecidos: los items de `/storefront/products`, `/storefront/collections/:handle` y `/storefront/search` ya traen `compareAtPrice`, `images[]`, `options[]` y `variants[]`; las tarjetas (tallas del Quick Add, precio tachado, foto al pasar el cursor, agotado, multi-opción) se construyen directo del listado (`lib/api/map.ts`) y **ya no se pide el detalle por producto**. Compatibilidad: si un item no trae `variants` (backend antiguo) o llega al tope de 50, se pide el detalle como antes. La ficha de producto sigue usando el detalle.
- Pedidos pendientes: `POST /storefront/orders/:n/cancel` (token en el cuerpo) desde `PendingPayment` ("Descartar y empezar de nuevo"), `/checkout/result` (pago rechazado) y `/orders/[n]` (pedido pendiente); siempre con confirmación en línea y el aviso "Si ya abriste la pasarela, no completes el pago" (Wompi). Tras cancelar se limpia el último pedido y el carrito local (que no se vacía hasta pagar) se recrea con las mismas líneas.
- Retorno de la pasarela: `/checkout/result?order=N` (Wompi añade `?id=`/`env`; se quitan de la URL). El token guardado solo se usa si es del mismo número; sin token (otro navegador) se muestra "Recibimos tu pedido #N… abre el enlace del correo" sin datos. El correo de confirmación trae `/orders/N?token=<firmado>`, que `/orders/[n]` acepta y conserva en `sessionStorage`.
- Productos se generan bajo demanda (ISR); home, layout, colecciones y páginas se prerenderizan, por lo que **el build necesita la API accesible**.
- En QA el backend debe subir `THROTTLE_LIMIT` (el build hace muchas peticiones desde una IP).

## 3. Pendiente

| Tema | Detalle |
| --- | --- |
| Zonas y tarifas de envío en tu BD | El checkout las necesita; créalas en `/admin/shipping`. |
| **BD del dueño: seed + contenido completo** | La tienda y el CMS esperan las secciones nuevas del CMS y los textos en español: en la BD del dueño hay que ejecutar, en este orden, las migraciones, `yarn content:seed` (rama `feature/content-seed`, commit `21c6682`), `yarn catalog:seed` si se quiere el catálogo demo y `yarn content:complete --publish-legal` (publica las páginas legales). Sin eso faltan secciones/páginas y el home sale con los valores por defecto. |
| Wompi real | Probado solo con pasarela simulada; falta sandbox/producción con llaves. |
| **Aprobación tardía de Wompi (decisión)** | La API no puede anular una transacción abierta en Wompi. Si el comprador cancela y luego paga, el pedido **no revive** (sigue `cancelled`, el stock no se vuelve a reservar), el pago queda `approved`, el pedido recibe la etiqueta `refund-pending` y el personal lo reembolsa desde `/admin/orders` (badge "Reembolso pendiente"). El front lo mitiga con la confirmación + aviso antes de cancelar y, si llega esa aprobación, `/checkout/result` muestra "Pedido cancelado: pago por reembolsar" con enlace a contacto. No se bloquea el pago en Wompi (no es posible). |
| Tests e2e automatizados | `tests/e2e/integration.spec.ts` ajustado a las rutas nuevas pero **no ejecutado**; no está en CI. |
| Backend (hallazgos) | `audit.diff` heterogéneo; `alt` en media existente; handle de colecciones eliminadas. |
| Despliegue | Ver `PLAN-PRODUCCION.md` (HTTPS, CORS, dominio, secretos, Wompi, correo). |

## 4. Verificación realizada (QA, BD local poblada)

- Tienda: home/colecciones/producto/páginas/404/sitemap con CMS real; compra completa con pago simulado hasta "Pago recibido" y carrito vacío.
- Cuenta: registro → verificación → login → perfil/direcciones → pedidos → cambio de contraseña → recuperación → newsletter confirmar/baja.
- Admin: login/redirección/logout; las 25 pantallas cargan sin errores de consola; flujos de edición persistentes por módulo (pedidos, productos, inventario, medios, CMS con publicar/restaurar y revalidación en la tienda, clientes, descuentos, envíos, marketing, correos, personal, auditoría, 2FA).
- Verificación 4 oct (backend nuevo `d6d5447` + seed, Playwright escritorio y 390 px): peticiones a la API por render en frío (dev, caché limpia) home 15 → 9, `/collections/all` 17 → 8, `/products/x` 14 → 9 (de ellas 1 es la plantilla `404` que el modo dev pide siempre y 5 son del chrome común: redirects, bundle y plantillas search/cart); compra aprobada con pago simulado; pedido pendiente → descartar cancela en servidor (estado `cancelled`, stock liberado, carrito intacto); rechazo → cancelar; `/orders/N?token=` del correo; `/checkout/result?order=N` sin token; colección manual (paginada, borrador/archivado, añadir/quitar/reordenar incremental con rollback, inteligente bloqueada); edición de variantes con 1 PATCH por variante; publicar con 409 forzado.
