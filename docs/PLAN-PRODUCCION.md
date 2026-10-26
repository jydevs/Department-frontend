# Plan de implementación a producción: Daregular Dept. (frontend + backend)

## Resumen ejecutivo

- **Backend: bastante avanzado, pero nunca se ha desplegado.** [VERIFICADO] Tiene 27 controladores, RBAC deny-by-default, 2FA, Wompi con firma e idempotencia, CMS con borrador/publicar/programar, Habeas Data, importador y CI con smoke contra Postgres 16. Las brechas que bloquean producción son de integración y operación: medios solo en disco local, sin conciliación con Wompi, reembolsos solo "manuales", 2FA no obligatorio y Docker sin probar.
- **Frontend: todo es simulado.** [VERIFICADO] El panel `/admin` usa un mock en memoria y no tiene autenticación. La tienda usa `src/data/products.ts` y un carrito en localStorage. El checkout no cobra. El login de cliente guarda `"mock-jwt-token"` en localStorage. Faltan las rutas que el backend sí espera: `/api/revalidate`, `/api/preview`, `/checkout/result`, `/orders/[n]`, `/account/forgot-password` y `/newsletter/{confirmar,baja}`.
- **Ruta más corta y segura.** Lanzar un MVP de tienda en este orden:
  1. Catálogo + carrito + checkout Wompi + correos transaccionales + cuenta básica, con el CMS de la home.
  2. Panel conectado solo en los módulos operativos: login con 2FA, pedidos, productos, inventario, medios, contenido y descuentos.
  3. Lo demás del panel (marketing, analítica, importador desde la UI, auditoría avanzada) se publica por detrás de un flag o después del lanzamiento.
- **Infraestructura objetivo.** Un VPS con Docker Compose (Caddy con TLS → Next + API + Postgres 16), backups externos con restauración probada y Cloudflare delante. Protección adicional de `/admin` en el borde con Cloudflare Access.
- **Plazo con 1–2 devs full-stack + 1 persona de negocio:** 7–8 semanas en escenario optimista, 11–13 en realista. Camino crítico: infra → auth del panel → tienda↔API (carrito/checkout) → Wompi sandbox → migración de datos y ensayo → cutover.

---

## A. Diagnóstico del estado actual

### A.1 Qué está listo [VERIFICADO]

| Área | Estado | Evidencia |
|---|---|---|
| API REST `/api/v1` | Completa para el MVP | `docs/API.md` §10, `src/**/**.controller.ts` (27) |
| Config de producción validada | Muy estricta | `src/config/env.ts`: en prod exige https en URLs/CORS, `DATABASE_SSL`, `TRUST_PROXY`, SMTP, Wompi `pub_prod_` y mock apagado |
| Auth personal | Login, refresh rotativo en cookie `dept_rt` (`Path=/api/v1/auth`, `SameSite=Lax`), bloqueo, 2FA TOTP con 8 códigos de recuperación | `src/identity/auth/auth.controller.ts`, `auth.service.ts` |
| Roles/permisos | Roles de sistema sincronizados al arrancar (`RoleSyncService`) | `src/identity/role-sync.service.ts`, `permissions.ts` |
| Wompi | Firma de integridad para el widget, verificación del checksum del webhook sobre el cuerpo crudo, deduplicación (`processed_events`) | `src/commerce/payments/wompi.provider.ts`, `payment-events.service.ts` |
| Checkout | `Idempotency-Key` obligatorio, reservas de stock con expiración (`ORDER_RESERVATION_MINUTES`) | `docs/API.md` §5, `orders.scheduler.ts` |
| CMS | Documentos `settings/menu/template/page`, versiones, programación (scheduler 30 s con `SKIP LOCKED`), preview tokens, revalidación saliente firmada con HMAC | `src/cms/content/*` |
| Correo | Outbox en Postgres + worker, plantillas editables, transporte `log`/`smtp` | `src/mail/*` |
| Habeas Data | `data-export`, borrado/anonimización, `erasure_suppressions` | `src/customers/customer-erasure.service.ts` |
| Importador Shopify | CSV de productos y clientes, `dryRun`, límites de tamaño | `src/imports/*` |
| CI backend | lint + typecheck + build + migraciones + owner + smoke | `.github/workflows/ci.yml` |
| Panel (UI) | 33 pantallas completas sobre el mock, con firma de hooks estable | `src/app/admin/(app)/**`, `src/lib/admin/api/*.ts` |
| Tienda (UI) | Diseño completo, SEO base (sitemap, robots, JSON-LD, OG), cabeceras de seguridad, CI (lint, typecheck, build) | `next.config.ts`, `src/app/sitemap.ts`, `.github/workflows/ci.yml` |

### A.2 Qué es simulado o está roto [VERIFICADO salvo indicación]

| # | Hallazgo | Archivo | Impacto |
|---|---|---|---|
| 1 | `/admin` público: usuario owner fijo con `ALL_PERMISSIONS` | `src/lib/admin/auth.tsx` | **Bloqueante** |
| 2 | Todos los hooks del panel leen y escriben en `db()` en memoria. Hay páginas que importan el mock directamente | `src/lib/admin/api/*.ts`; `customers/page.tsx` (export CSV con `db()`), `shipping/page.tsx` y `OrderDialogs.tsx` (`DEPARTMENTS`) | Bloqueante para operar |
| 3 | El catálogo de la tienda es estático (17 productos) y el carrito es de localStorage, indexado por `handle+size` (no `variantId`) | `src/data/products.ts`, `src/lib/cart.ts` | Bloqueante |
| 4 | Checkout de mentira: suma IVA 19 % **encima** del subtotal (el backend usa IVA incluido), usa 99.000 por defecto con el carrito vacío y la zona "bogota" está fija | `src/app/checkout/page.tsx` | Bloqueante |
| 5 | El login de cliente guarda `localStorage.auth_token = "mock-jwt-token"` | `src/app/account/login/page.tsx` | Bloqueante y mala práctica |
| 6 | El newsletter muestra "éxito" aunque la API falle (`catch { setState("success") }`) | `src/components/layout/NewsletterFooter.tsx` | UX/legal |
| 7 | El contacto envía `phone`, pero el DTO es `strictObject` sin ese campo → 400 `VALIDATION_ERROR` siempre | `ContactForm.tsx` vs `src/marketing/marketing.dto.ts` | Formulario roto |
| 8 | `.env.production` está commiteado con `http://179.236.227.89:4000/api/v1`. El `api-client` **vuelve a añadir** `/api/v1` (queda `/api/v1/api/v1`), igual que ContactForm y Newsletter. Además, la API en producción no arranca con URLs http, e `INDEXABLE=true` sobre una IP | `.env.production`, `src/lib/admin/api-client.ts` | Bloqueante de despliegue |
| 9 | Faltan las rutas del front a las que la API envía tráfico o enlaces: `/api/revalidate`, `/api/preview` (`preview.service.ts`), `/checkout/result` (redirect de Wompi), `/orders/:n` (`order-mail.ts`), `/account/forgot-password`, `/newsletter/confirmar` y `/newsletter/baja` (`newsletter.service.ts`). No existe `src/app/api` | — | Bloqueante |
| 10 | Tests decorativos: `tests/unit` usa vitest y `tests/e2e` Playwright, pero **ninguno está en `package.json`**. El test unitario prueba un mock de `fetch`. El E2E espera `data-testid` y una API que no existen. CI no los ejecuta | `tests/`, `playwright.config.ts` | Rehacer |
| 11 | Sin CSP. El layout del admin tiene un `<script>` inline (`THEME_SCRIPT`) | `next.config.ts`, `src/app/admin/layout.tsx` | Seguridad |
| 12 | No hay Dockerfile del front ni `output: "standalone"` | `next.config.ts` | Infra |

### A.3 Brechas del backend para producción [VERIFICADO]

| Brecha | Detalle |
|---|---|
| Medios | Solo `LocalDiskStorage`; el driver S3/R2 está pendiente (`src/cms/media/storage.driver.ts`). Obliga a **una sola instancia** con volumen |
| Conciliación Wompi | `WOMPI_API_URL` **no se usa en ningún sitio** (solo en `env.ts`). No hay sondeo de transacciones si un webhook se pierde: el pedido queda "pending" hasta expirar y libera stock aunque el cliente haya pagado |
| Reembolsos | `providerStatus: "manual"`: el dinero se devuelve a mano en el dashboard de Wompi (`refunds.service.ts:111`) |
| 2FA | Opcional para todos los roles; no hay obligación por rol (`auth.service.ts:71`) |
| Login de cliente | No exige email verificado (hallazgo abierto de H-1 en SECURITY-REVIEW) |
| Importador | Solo `products` y `customers`. **No hay pedidos históricos ni redirecciones** (contradice PLAN §1.5). Las imágenes quedan como URLs externas de `cdn.shopify.com` (L-7) |
| Docker | "NOT tested locally" (Dockerfile y compose). `owner:create` requiere ts-node y no va en la imagen |
| `ADMIN_URL`/CORS | Pensados para una app admin separada en `:3001` (PLAN decisión #3); hoy el panel vive en la tienda |
| Rate limit | En memoria por instancia |
| Supresión Habeas Data | No hay endpoint para borrar una supresión (se hace con SQL a mano) |

### A.4 Mapa de brechas panel ↔ API (módulo por módulo)

Las rutas de la API del cuadro de abajo están [VERIFICADO]. "Trabajo" es el esfuerzo de conectar ese módulo.

| Módulo del panel | Hook(s) | Endpoint(s) | Trabajo | Brecha clave |
|---|---|---|---|---|
| Auth/cuenta | `auth.tsx`, `useRecoveryCodes` | `/auth/login, refresh, me, logout, 2fa/*, change-password` | M | Rehacer la pantalla de login (manejar `TWO_FACTOR_REQUIRED`) y la guarda de rutas. Mostrar QR del `otpauth`. Los códigos de recuperación los devuelve `2fa/enable`; no se generan en el cliente |
| Pedidos | `orders.ts` | `/admin/orders*` | L | Estados distintos (ver desajustes). Faltan "todas las etiquetas" y "alertas". Hay endpoint de timeline |
| Productos | `catalog.ts` | `/admin/products*` + `/variants`, `/options`, `/media`, `/metafields` | **XL** | El mock guarda el producto completo en una llamada; la API exige orquestar 4–6 llamadas con `version`. Falta un endpoint de facetas (tags/vendors/types) |
| Colecciones | `catalog.ts` | `/admin/collections*`, `/preview-rules`, `PUT /:id/products` | M | Reglas y orden con otros enums |
| Inventario | `useLevels`, `useAdjustStock` | `/admin/inventory`, `/adjust`, `/locations` | M | La API es por **ubicación** (`locationId` obligatorio, `reason` enum); el mock tiene stock único y un reparto por ubicación inventado |
| Medios | `media.ts` | `/admin/media` (multipart), `PATCH`, `DELETE`, `/usages` | S | Progreso de subida (XHR) y URLs desde `PUBLIC_URL` |
| Contenido | `content.ts` | `/admin/content/*` | L | Tipos de sección en JSON Schema (ver desajustes). La programación se cancela por `versionId`. Bloqueo optimista con `If-Match`. Preview real |
| Redirecciones | `content.ts` | `/admin/redirects*` | S | Mapeo de campos (`permanent`/`hits`) [SUPUESTO] |
| Clientes | `admin.ts` | `/admin/customers*`, `/export`, `/:id/erase` | M | `useAnonymize` → `erase`. Export desde el servidor. Falta un endpoint de facetas de etiquetas |
| Descuentos | `admin.ts` | `/admin/discounts*`, `/:id/redemptions` | S–M | `title` obligatorio, enums y nombres distintos |
| Envíos/impuestos | `admin.ts` | `/admin/shipping/zones`, `/rates`, `/admin/taxes` | M | Zonas y tarifas son recursos separados. Impuestos requiere `settings:write` y un `label` |
| Marketing | `admin.ts` | `/admin/newsletter`, `/contact-messages` | S | Export de newsletter desde el servidor |
| Correos | `admin.ts` | `/admin/email-templates/:key`, `/preview`, `/test-send` | S | Indexar por `key`, no por `id` |
| Equipo/roles | `admin.ts` | `/admin/staff*`, `GET /admin/roles` | M | **No hay** edición de roles ni reset de contraseña de staff en la API |
| Auditoría | `fetchAudit` | `/admin/audit-logs` (cursor) | S | Filtros `entityType`/`actorId`, no texto libre `actor`/`action` |
| Importador | `useStartImport` | `/admin/import/jobs` (multipart) | S | Subir el archivo (no filas parseadas en el cliente) |
| Mantenimiento | `useMaintenanceRuns` | `POST /admin/maintenance/run` | S | No hay listado de ejecuciones previas (solo la respuesta) |
| Dashboard/analítica | `useAnalytics`, `useAlerts` | `/admin/analytics/overview, sales, top-products, customers` | M | Las alertas hay que componerlas (`inventory?lowStock=true`, `orders?…`) |

Tallas: S ≤ 1 d, M 1–3 d, L 3–5 d, XL 5–8 d.

### A.5 Tienda ↔ API

| Pieza | Estado front | API | Trabajo |
|---|---|---|---|
| Catálogo/colecciones | Estático | `/storefront/products`, `/collections`, `/search` (cursor) | Capa `lib/storefront` con `fetch` + `next: { tags }` |
| Home/CMS | JSX fijo | `/storefront/content/bundle`, `templates/:key`, `settings`, `menus/:key` | Registro `type → componente` (los tipos coinciden: `hero`, `marquee`, `new-arrivals`, `split-banner`, `value-props`, `campaign`, `editorial`, `lookbook`, `newsletter`, `rich-text`, `footer`, `announcement-bar`) |
| Carrito | localStorage | `/storefront/carts` + `X-Cart-Token` | Route handlers de Next guardan el token en una cookie httpOnly |
| Checkout | Stub | `/storefront/shipping-rates`, `POST /storefront/checkouts` (`Idempotency-Key`) → instrucciones de Wompi (`publicKey`, `signatureIntegrity`, `redirectUrl`) | Widget de Wompi y `/checkout/result` |
| Pedido invitado | No existe | `GET /storefront/orders/:n?token=` | `/orders/[n]` |
| Cuenta de cliente | Mock | `/storefront/customers/*` (cookie `dept_ct`) | Login, registro, verificación, reset, forgot, me, direcciones, pedidos, export, borrado |
| Newsletter/contacto | Llamadas directas con bugs (#6, #7) | `/storefront/newsletter`, `/contact` | Corregir y añadir las páginas de confirmación y baja |
| Revalidación/preview | No existe | Saliente `POST /api/revalidate` (HMAC); `POST /admin/content/preview-tokens` → `/api/preview?token=` | Implementar según `docs/API.md` §7 |
| Redirecciones | No existe | `GET /storefront/redirects` | `src/proxy.ts` (Next 16) con caché |
| Rate limit por visitante | — | `X-Storefront-Key` + `X-Visitor-Ip` solo desde el servidor | Añadirlos en los fetch de servidor |

---

## Desajustes panel ↔ API (ejemplos concretos) [VERIFICADO]

| Área | Panel (mock, `src/lib/admin/types.ts` y hooks) | API (DTO del backend) |
|---|---|---|
| Base URL | `NEXT_PUBLIC_API_URL` **sin** `/api/v1` (el cliente lo añade) | `.env.production` lo trae **con** `/api/v1` → doble prefijo |
| Estados de pedido | `financial`: `pending/paid/refunded/partially-refunded/refund-pending`; `fulfillment`: `…/cancelled` | `status`: `pending/open/completed/cancelled/expired`; `paymentStatus`: `pending/paid/failed/partially_refunded/refunded`; `fulfillmentStatus`: `unfulfilled/partial/fulfilled` (`orders-admin.dto.ts:8-10`). No existe `refund-pending`; la cancelación es un `status`, no un fulfillment. Guiones frente a guion bajo |
| Reembolso | `{amount, reason, restock, qty: Record<lineId, n>}` | `{amount, lines:[{orderLineId, quantity}], restock, …}`; solo registra (`providerStatus:"manual"`) |
| Producto | `description` (Markdown), `type`, `images[]`, `metafields[]` embebidos, `updatedAt` | `descriptionHtml` (saneado), `productType`, `media[]` (`PUT /:id/media`), metafields aparte, `version` para concurrencia |
| Variante | `compareAt`, `tracked`, `backorder`, `weight`, `options: string[]`, `stock` | `compareAtPrice`, `trackInventory`, `allowBackorder`, `weightGrams`, `optionValueIds: uuid[]`; sin stock (va en inventario por ubicación) |
| Inventario | `{variantId, delta, reason: string libre}` | `{variantId, locationId, delta \| setTo, reason: received\|correction\|sold\|returned\|damaged\|restock\|other, note}` |
| Colección | `kind`, `sort: best-selling\|price-asc…`, reglas con campo `title` y op `equals` | `type`, `sortOrder: manual\|title\|newest\|price_asc\|price_desc` (sin `best-selling`), campos `tag\|vendor\|type\|price` (sin `title`), ops `eq\|neq\|gt\|lt\|contains` |
| Descuento | `kind: percentage\|fixed\|free-shipping`, `active`, `perCustomer`, `used`, `redemptions[]`; sin título | `type: percent\|fixed\|free_shipping`, `title` **obligatorio**, `isActive`, `oncePerEmail`, código de 3–40 (panel 3–30), redenciones en `/:id/redemptions` |
| Envíos | Zona con `rates[]` anidadas; tarifa `{price, freeOver, eta: string}` | Zonas y tarifas separadas (`zoneId`); `{price, freeOverSubtotal, minDays, maxDays, isActive, position}`; departamento `"*"` = todo el país |
| Impuestos | `{rate, included}`, guardado con `shipping:write` en la UI [SUPUESTO sobre la UI] | `{ratePercent, pricesIncludeTax, label}`, `PUT /admin/taxes` exige `settings:write` |
| Staff | `{name, role (key), active, twoFactor, lastLogin}` | `{fullName, roleId (uuid), isActive, totpEnabled}`; al crear devuelve `password` (no `tempPassword`) |
| Roles | Editables (`roles:write` en el mock) | Solo `GET /admin/roles`; no hay CRUD de roles ni `POST /staff/:id/reset-password` |
| Analista | Mock: todos los `*:read` (incluye `settings:read`, `import:read`) | API: lista explícita sin `settings:read` ni `import:read` (`docs/API.md` §2) |
| Secciones CMS | `SectionType{settings: SchemaField[], blockTypes[].fields, maxBlocks}` con etiquetas en español | `GET /section-types` → `{settingsSchema: JSONSchema, blockTypes[].schema: JSONSchema}` (`registry.ts:listSectionTypes`), sin `label` por campo ni tipo de widget (`image`, `collection`, `color`…) |
| Programación | `scheduledAt` en el documento; cancelar por `kind/key` | Versión programada; cancelar con `DELETE …/schedule/:versionId` |
| Preview | Token simulado | `{token, url, expiresAt}` válido 1 h y para 1 documento |
| Auditoría | Filtros de texto `actor/action/entity`, cursor numérico | `entityType`, `actorId`, cursor opaco `{items, nextCursor, hasMore}` |
| Paginación | `pageSize` 10 | Offset `{items,total,page,pageSize,totalPages}`, por defecto 25 (compatible) |
| Importador | Filas parseadas en el cliente (`rows: string[]`) | `multipart` con `file` + `type` + `dryRun`; respuesta 202 |
| Correos | Por `id` | Por `key` (`TEMPLATE_KEYS`) |
| Contacto (tienda) | Envía `phone` | `strictObject` sin `phone` → 400 |

**Recomendación:**
- Generar tipos con `openapi-typescript` desde `docs/openapi.json`.
- Crear una capa `src/lib/admin/mappers/*.ts` (DTO ↔ tipo de UI) para que las pantallas casi no cambien.
- Ajustar en la UI los enums que no existen en la API (quitar `best-selling`, el campo `title` en reglas y `refund-pending`) en vez de añadirlos al backend.
- Para las secciones, la opción más barata es añadir en el backend metadatos de UI por campo (`.meta({label, widget})`, que Zod 4 exporta en `toJSONSchema`) y escribir un adaptador JSON Schema → `SchemaField`.

---

## B. Plan por fases

Responsables: BE = backend, FE = frontend, DO = devops, QA, NEG = negocio. Esfuerzo en días-persona (dp).

### Fase 0: Decisiones y fundamentos (semana 1)

| Tarea | Repo | Detalle | Dep. | dp | Riesgo | Resp. |
|---|---|---|---|---|---|---|
| 0.1 Decisiones de producto | — | Ver sección H (hosting, correo, dominios, devoluciones, MVP) | — | 1–2 | Alto si se retrasa | NEG + tech lead |
| 0.2 Topología de dominios | — | `daregulardept.com` (tienda y `/admin`) + `api.daregulardept.com`; mismo sitio registrable, así funciona `SameSite=Lax` de `dept_rt`/`dept_ct` | 0.1 | 0.5 | Medio | Tech lead |
| 0.3 Limpieza del front | FE | Sacar `.env.production` de git (y quitarlo del `!.env.production` del `.gitignore`), crear `.env.example`, unificar la base URL (sin `/api/v1`), borrar o reemplazar `tests/unit` y el E2E roto | — | 0.5–1 | Bajo | FE |
| 0.4 Contrato de tipos | FE | `openapi-typescript` → `src/lib/api/schema.d.ts`; script `yarn api:types` | — | 0.5 | Bajo | FE |
| 0.5 Merge de las ramas `claude/tender-heisenberg-w6jnxy` | ambos | PR y revisión del panel (13 commits) a `main` | — | 0.5 | Bajo | Tech lead |

**Criterio de salida:** decisiones firmadas, dominios comprados con DNS en Cloudflare, `main` limpio.

### Fase 1: Infraestructura, base de datos, secretos y CI/CD (semanas 1–2)

| Tarea | Repo | Detalle | Dep. | dp | Riesgo | Resp. |
|---|---|---|---|---|---|---|
| 1.1 VPS base | infra | Ubuntu LTS, usuario no root, SSH por llave, UFW (80/443), fail2ban, Docker, actualizaciones desatendidas | 0.1 | 1 | Medio | DO |
| 1.2 Compose de producción | BE (nuevo `deploy/`) | Caddy (TLS automático) → `web` (Next standalone :3000) + `api` (:4000) + `postgres:16` (red interna, sin puertos publicados). Volúmenes `pgdata` y `uploads`. Validar el Dockerfile del backend ("no probado") | 1.1 | 2–3 | **Alto** | DO + BE |
| 1.3 Dockerfile del front | FE | `output: "standalone"`, multi-stage, usuario no root, `HEALTHCHECK`. Las `NEXT_PUBLIC_*` se inyectan en el build: una imagen por entorno o runtime config | — | 1 | Medio | FE/DO |
| 1.4 Entornos | infra | `staging` (mismo VPS u otro pequeño, `staging.daregulardept.com`, Wompi sandbox, `NODE_ENV=production` con claves de prueba **no** arranca: usar `development` en staging o un flag) y `prod` | 1.2 | 1 | Medio | DO |
| 1.5 Secretos | infra | `.env` por entorno fuera del repo (permisos 600) o SOPS/age en el repo de deploy. Generar los secretos con `openssl` (ver README backend). Copia de `ENCRYPTION_KEY` en un gestor de contraseñas | 1.4 | 0.5 | Alto (pérdida) | DO |
| 1.6 Backups | infra | `pg_dump` diario + WAL o `pgbackrest`/`restic` hacia R2/B2 (fuera del VPS), retención 7d/4s/6m. Incluye el volumen `uploads`. **Restauración probada** en staging y documentada | 1.2 | 1.5–2 | **Alto** | DO |
| 1.7 CI/CD | ambos | Front: añadir Playwright (job aparte) e imagen a GHCR. Back: el CI ya existe; añadir build y push de la imagen. Deploy por SSH o Actions: `docker compose pull` → `migration:run:prod` (contenedor one-off) → `up -d` → smoke de `/ready`. Fijar actions por SHA (L-9 abierto) | 1.2 | 2 | Medio | DO |
| 1.8 Observabilidad | infra | Logs JSON de pino → Loki/Grafana Cloud o Better Stack. Uptime de `/health`, `/ready` y la home. Alertas por 5xx, disco > 80 %, backup fallido y certificado | 1.2 | 1–1.5 | Medio | DO |
| 1.9 Bootstrap | BE | Owner en prod: `owner:create` necesita ts-node. Opción: compilar el script a `dist/scripts` o ejecutarlo desde un checkout por túnel SSH a Postgres | 1.2 | 0.5 | Bajo | BE |

**Criterio de salida:** staging accesible por https con API `/ready` OK, migraciones aplicadas por el pipeline, restauración de backup cronometrada y dashboards y alertas funcionando.

### Fase 2: Auth y permisos del panel (semana 2–3). Hoy `/admin` es público

| Tarea | Repo | Detalle | Dep. | dp | Riesgo | Resp. |
|---|---|---|---|---|---|---|
| 2.1 AuthProvider real | FE | `auth.tsx`: al montar, `POST /auth/refresh` → `GET /auth/me`; estados `loading/anon/authed`; `setAccessToken`; renovar antes de `expiresIn`. Logout | 1.x | 1.5 | Medio | FE |
| 2.2 Login + 2FA | FE | Pantalla `/admin/login` con email/contraseña y luego TOTP (`TWO_FACTOR_REQUIRED`) o código de recuperación. Manejo de 429 con `Retry-After` | 2.1 | 1 | Bajo | FE |
| 2.3 Guarda de rutas | FE | Layout `(app)` redirige a login si `anon`. `useCan` usa los `permissions` de `/auth/me`. Ocultar navegación según permisos (`src/lib/admin/nav.ts`) | 2.1 | 0.5–1 | Bajo | FE |
| 2.4 2FA obligatorio por rol | BE | Añadir `requires2fa` (o lista en `permissions.ts`) para owner/admin. En login sin TOTP: emitir un token de "solo enrolamiento" que solo permita `2fa/setup|enable`. Migración + smoke | — | 1.5–2 | Medio | BE |
| 2.5 Cuenta: 2FA con QR | FE | QR del `otpauth` (lib `qrcode`), mostrar los recovery codes que devuelve `2fa/enable`; cambio de contraseña | 2.1 | 0.5–1 | Bajo | FE |
| 2.6 Protección en el borde | infra | Cloudflare Access (gratis hasta 50 usuarios) sobre `daregulardept.com/admin*`, o allowlist de IP o basic auth en Caddy. Defensa en profundidad: el bundle del panel no se sirve a anónimos | 1.x | 0.5 | Bajo | DO |
| 2.7 Endpoints de equipo faltantes | BE | `POST /admin/staff/:id/reset-password` (auditado, solo owner/admin). Decidir si los roles se editan (PLAN dice "editables"; recomendado **no** para el MVP: ocultar la edición en la UI) | — | 1 | Bajo | BE |

**Criterio de salida:** sin sesión, `/admin` no muestra nada (y el borde lo bloquea). Owner/admin no pueden operar sin 2FA. Un usuario `support` no ve "Equipo" y la API devuelve 403.

### Fase 3: Panel ↔ API por módulos (semanas 3–6, por riesgo y valor)

Patrón común (FE, 2 dp de base):
- `useApiQuery`/`useApiMutation` en `query.ts`, en sustitución de `useMock`/`usePaged`/`useAction`, conservando toasts e invalidaciones.
- Mapeo de errores por `code` (`CONCURRENT_UPDATE` → "recarga").
- Envío de `If-Match`.
- Mappers. Borrar `src/lib/admin/mock` al final.

| Orden | Módulo | Trabajo concreto | dp | Riesgo |
|---|---|---|---|---|
| 1 | Productos + variantes + media | Orquestador de guardado (crear → options → variantes diff → media → metafields) con manejo de fallos parciales. Facetas: BE añade `GET /admin/products/facets` (0.5 dp) o se derivan. Eliminar Markdown → editor de HTML simple saneado | 5–7 | **Alto** |
| 2 | Inventario + ubicaciones | Selector de ubicación obligatorio, enum de motivo, `setTo` para conteo | 2 | Medio |
| 3 | Pedidos | Mapear los 3 ejes de estado, fulfillments y cancelaciones, reembolso por líneas (texto: "devolver en Wompi manualmente"), notas, timeline, edición de contacto (`PATCH`). Etiquetas: endpoint BE o lista libre | 3–4 | **Alto** |
| 4 | Medios | Upload multipart con progreso, dedupe (200 vs 201), usos | 1 | Bajo |
| 5 | Contenido (plantillas, páginas, ajustes, menús) | Adaptador de section types (+ BE `.meta` con etiquetas y widget, 1–1.5 dp), versiones, programar y cancelar por `versionId`, `If-Match`, preview real | 4–5 | Alto |
| 6 | Colecciones | Enums, `PUT /:id/products` para el orden, `preview-rules` | 1.5–2 | Medio |
| 7 | Descuentos | Campo título, enums, redenciones | 1 | Bajo |
| 8 | Envíos e impuestos | Zonas y tarifas separadas, días min/max, departamentos o `"*"`, impuestos con `label` y permiso `settings:write` | 1.5–2 | Medio |
| 9 | Clientes | Listado, detalle con pedidos, `PATCH`, `erase` (confirmación fuerte), export del servidor (`api.download`) | 1.5 | Medio (Habeas Data) |
| 10 | Dashboard/analítica | 4 endpoints + alertas compuestas | 1.5 | Bajo |
| 11 | Equipo | Mapeo `fullName/roleId`, contraseña inicial, reset (2.7) | 1 | Medio |
| 12 | Marketing y correos | Newsletter (export del servidor), mensajes, plantillas por `key`, preview, test-send | 1.5 | Bajo |
| 13 | Auditoría | Cursor opaco, filtros por entidad y actor (selector de staff) | 0.5–1 | Bajo |
| 14 | Importador | Upload multipart, polling de `/jobs/:id`, errores por fila | 1 | Medio |
| 15 | Mantenimiento | Ejecutar y mostrar el resumen; quitar el "historial" o guardarlo en local | 0.5 | Bajo |

**Total Fase 3:** unos 30–38 dp (FE ~26–32, BE ~3–5). **MVP mínimo** del panel: módulos 1–8 (~20–25 dp). Del 9 al 15 pueden salir en la semana +1/+2 tras el lanzamiento; hasta entonces se ocultan con un flag en `nav.ts`. La anonimización y el export también se pueden atender con soporte manual.

**Criterio de salida por módulo:**
- Flujo manual en staging contra la API real.
- Errores 403/409/422 visibles y entendibles.
- `grep -r "mock/" src/app src/components` vacío al cerrar la fase.

### Fase 4: Tienda pública ↔ API/CMS (semanas 3–6, en paralelo con la Fase 3 si hay 2 devs)

| Tarea | Detalle | Dep. | dp | Riesgo |
|---|---|---|---|---|
| 4.1 Cliente storefront de servidor | `src/lib/storefront/*.ts`: `fetch` con `next: { tags: ["product:<handle>", "collection:<h>", "content:<kind>:<key>"] }` alineados con los tags que emite la API [SUPUESTO: verificar los nombres exactos en `revalidation.service.ts`]. Cabeceras `X-Storefront-Key`/`X-Visitor-Ip` | 1.x | 2 | Medio |
| 4.2 PDP, colecciones, búsqueda | Sustituir `src/data/products.ts`. Tallas desde las opciones y variantes reales, disponibilidad, `descriptionHtml` renderizado (ya saneado por la API; añadir `sanitize-html` o DOMPurify en servidor como defensa). Paginación por cursor, filtros y orden | 4.1 | 4–5 | Medio |
| 4.3 Home y páginas por CMS | Registro de secciones → componentes existentes (`src/components/home/*`) parametrizados. Menús y settings. 404 de CMS | 4.1 | 4–5 | Medio |
| 4.4 `/api/revalidate` y `/api/preview` | Según `docs/API.md` §7 (HMAC con tiempo constante, anti-replay de 5 min). Preview con `draftMode()` y `?preview=` | 4.1 | 1 | Bajo |
| 4.5 Redirecciones | `src/proxy.ts` que consulta `/storefront/redirects` (caché en memoria de 60 s + revalidación) y responde 301/302 | 4.1 | 1 | Medio |
| 4.6 Carrito servidor | Route handlers `/api/cart/*` o server actions; `X-Cart-Token` en cookie httpOnly `Secure SameSite=Lax`. Migrar el carrito de localStorage (handle+talla → `variantId`) al primer uso. Drawer optimista | 4.1 | 3–4 | Alto |
| 4.7 Checkout | Datos de contacto y dirección (departamentos), `shipping-rates`, código de descuento, `Idempotency-Key` (UUID al abrir el checkout, persistido en sessionStorage), totales **de la API** (quitar el IVA del cliente), widget de Wompi | 4.6, 5.1 | 4–5 | **Alto** |
| 4.8 Resultado y pedido | `/checkout/result` (lee la `id` de la transacción de Wompi, consulta el pedido por número y token, estados "procesando" con polling corto) y `/orders/[n]` | 4.7 | 1.5–2 | Medio |
| 4.9 Cuenta de cliente | `login`, `register` (con consentimiento), `verify-email`, `forgot-password` (página nueva, la API enlaza ahí), `reset-password`, perfil, direcciones, pedidos, export y borrar cuenta. Token en memoria + refresh con `dept_ct`. Eliminar `localStorage.auth_token` | 4.1 | 4–5 | Medio |
| 4.10 Newsletter y contacto | Corregir el swallow de errores y quitar `phone` (o añadirlo al DTO del backend). Consentimiento explícito y enlace a la política. Páginas `/newsletter/confirmar` y `/newsletter/baja` | — | 1 | Bajo |
| 4.11 Sitemap dinámico | Productos, colecciones y páginas desde la API; canonical; JSON-LD con precio y disponibilidad reales | 4.2 | 0.5–1 | Bajo |

**Total:** unos 26–32 dp (FE).

**Criterio de salida:**
- Publicar una plantilla en el panel cambia la home en menos de 10 s sin redeploy.
- La vista previa muestra el borrador.
- Una compra sandbox completa crea un pedido `paid` y descuenta stock.

### Fase 5: Pagos y correo (semanas 5–7)

| Tarea | Repo | Detalle | dp | Riesgo |
|---|---|---|---|---|
| 5.1 Wompi sandbox de extremo a extremo | BE+FE | Llaves `pub_test`, URL de eventos `https://api-staging…/webhooks/wompi`. Probar APPROVED, DECLINED, VOIDED, ERROR, PSE, Nequi y Bancolombia, montos con IVA y descuentos, `amount_in_cents = total*100` | 2 | Alto |
| 5.2 **Conciliación** | BE | Nuevo job (reutiliza el patrón de `orders.scheduler.ts` con `SKIP LOCKED`): para pedidos `pending` con más de 5 min y menos que `ORDER_RESERVATION_MINUTES`, `GET {WOMPI_API_URL}/transactions?reference=` (o por id) y aplicar el mismo `payment-events.service` idempotente. Antes de expirar un pedido, consultar Wompi. Alerta si llega un pago APPROVED para un pedido `expired` (stock ya liberado) | 2–3 | **Alto** |
| 5.3 Webhook robusto | BE | En prod, rechazar `environment !== "prod"` (revisar `environmentMatches`). Responder 200 rápido. Métrica de eventos con firma inválida | 0.5 | Medio |
| 5.4 Reembolsos | BE+NEG | MVP: proceso manual en el dashboard de Wompi + registro en el panel (ya existe). Runbook. Fase posterior: API de reembolsos/anulaciones de Wompi si la cuenta la tiene habilitada [SUPUESTO] | 0.5 | Medio |
| 5.5 Proveedor de correo | DO+BE | SMTP transaccional (ver H). Dominio de envío `mail.daregulardept.com` con SPF, DKIM y DMARC (`p=quarantine` tras 2 semanas). `MAIL_FROM` | 1 | Medio |
| 5.6 Plantillas | NEG+BE | Revisar copys y enlaces de confirmación, envío, cancelación, reembolso, verificación, reset, bienvenida y newsletter (`src/mail/default-templates.ts`). Prueba en Gmail, Outlook e iOS | 1–1.5 | Bajo |

**Criterio de salida:**
- 20 compras sandbox sin discrepancias.
- Webhook caído durante 10 min → la conciliación corrige el estado.
- Correos entregados en bandeja de entrada (mail-tester ≥ 9/10).

### Fase 6: QA, seguridad, rendimiento, accesibilidad, SEO (semanas 7–8)

Ver secciones D y E. Esfuerzo: 6–9 dp (QA/FE/BE).

**Criterio de salida:** checklist go/no-go de la sección I en verde.

### Fase 7: Migración de datos, ensayo, cutover y rollback (semanas 8–9)

Ver sección F. Esfuerzo: 5–8 dp + NEG.

---

## C. Infraestructura y despliegue

**Arquitectura objetivo (MVP, una instancia por la restricción de medios e importador, L-8):**

```
Cloudflare (DNS, proxy, WAF, Access en /admin*, caché de /_next/static y /media/*)
   │ https
VPS ── Caddy (TLS de origen, HSTS, compresión, límite global por IP)
        ├─ daregulardept.com      → web (Next 16 standalone, :3000)  [tienda + /admin]
        └─ api.daregulardept.com  → api (NestJS, :4000)  [/api/v1, /media, /webhooks/wompi, /health, /ready]
       postgres:16 (red interna) · volumen uploads · backups → R2/B2 (otra región)
staging.daregulardept.com / api-staging… (mismo stack, Wompi sandbox)
```

- **Dominios y cookies.**
  - `dept_rt` usa `Path=/api/v1/auth` y `dept_ct` usa `Path=/api/v1/storefront/customers`, ambas httpOnly, `SameSite=Lax` y `Secure` en prod [VERIFICADO].
  - Con `daregulardept.com` ↔ `api.daregulardept.com` son mismo sitio, así que los `fetch(..., {credentials:"include"})` las envían.
  - No hace falta `Domain=`: la cookie es host-only de la API, que es lo deseable.
  - **No** desplegar sobre la IP `179.236.227.89` con http: la API se niega a arrancar en prod y `Secure` lo impide.
  - Alternativa: proxy same-origin (`daregulardept.com/api/v1/*` → API mediante rewrite de Caddy), que simplifica CORS. Si se elige, `PUBLIC_URL` y las rutas de cookie no cambian.
- **Variables de entorno.** `CORS_ORIGINS=https://daregulardept.com,https://www.daregulardept.com`, con `STOREFRONT_URL` y `ADMIN_URL` apuntando a `https://daregulardept.com`. El panel ya no vive en `:3001`.
- **TRUST_PROXY.** Con Cloudflare + Caddy son 2 saltos. Mejor aún: Caddy reescribe `X-Forwarded-For` con `CF-Connecting-IP` y restringe el origen a las IP de Cloudflare.
- **Base de datos.** PostgreSQL 16 [VERIFICADO] (`pg`, TypeORM, migraciones en `src/database/migrations`, 7 en total).
  - Aunque esté en el mismo VPS, `DATABASE_SSL` debe ser `require` en prod (`env.ts`): habilitar `ssl=on` en Postgres con un certificado autofirmado.
  - Alternativa: Postgres gestionado (Neon o Supabase), que da TLS y backups PITR. Ver H.
  - Ajustar `DATABASE_POOL_MAX`.
- **Medios.** Disco local en el volumen `/data/uploads` para el MVP, con Cloudflare cacheando `/media/*` (ya responde `immutable` durante 1 año). Fase posterior: driver R2 detrás de `StorageDriver` (2–3 dp BE), que habilita varias instancias.
- **Cron y colas.** Los schedulers corren dentro del proceso [VERIFICADO]: no hace falta Redis ni cola externa. Basta con que el contenedor de la API esté siempre arriba (`restart: unless-stopped`). Las publicaciones programadas dependen de eso: alertar si `/health` cae.
- **Logs, métricas y alertas.** Pino JSON con request-id. Uptime de `/ready` y de la home. Alertas por:
  - tasa de 5xx > 1 %;
  - webhook Wompi con 401 repetidos;
  - outbox con más de 50 mensajes `failed`;
  - pedidos `pending` > 30 min;
  - disco, backup y certificado.
- **CI/CD.**
  - Front: lint + typecheck + build ya existen; añadir Playwright smoke contra staging tras el deploy.
  - Back: el CI ya incluye el smoke.
  - Ambos: imagen etiquetada con SHA (`GIT_SHA` se expone en `/version`), deploy a staging automático y a prod manual con aprobación.
- **Despliegue sin caída.** Dos réplicas tras Caddy no son posibles por los medios en disco, así que:
  - API: migraciones compatibles hacia atrás (expand/contract) antes del `up -d`. Caddy con `lb_try_duration` absorbe los ~5–10 s de reinicio.
  - Web: es sin estado, así que es posible blue/green con dos contenedores alternando.
- **Rollback.** Volver al tag de imagen anterior; `migration:revert` solo si la migración no es destructiva (regla: nada destructivo en el mismo release). Snapshot del VPS y `pg_dump` previos a cada release mayor.

---

## D. Seguridad

1. **Protección de `/admin`:**
   - auth real (Fase 2);
   - 2FA obligatorio para owner/admin (2.4);
   - Cloudflare Access o allowlist (2.6);
   - `noindex` (ya está en `src/app/admin/layout.tsx`) y `Disallow: /admin` (ya está en `robots.ts` con indexación activa);
   - rate limit de login 5/min (ya en la API) + límite en Cloudflare.
   - Subdominio `admin.` frente a ruta: para el MVP, mantener la ruta y protegerla en el borde. Separar a subdominio solo si se quiere una CSP distinta o aislar cookies.
2. **CSP y cabeceras:**
   - CSP con nonce mediante `proxy.ts` (Next 16 lo soporta); mover `THEME_SCRIPT` a nonce o a una cookie.
   - `connect-src` hacia la API y `*.wompi.co`; `script-src`/`frame-src` hacia `checkout.wompi.co` (widget) [SUPUESTO: dominios exactos según la doc de Wompi].
   - Empezar en `Report-Only` una semana.
   - `X-Frame-Options: DENY` en `/admin`.
3. **SECURITY-REVIEW.md** [VERIFICADO]: H-1 y M-1…M-5 corregidos. Abiertos o parciales:

   | ID | Qué queda abierto | Acción |
   |---|---|---|
   | H-1 (defensa) | El login no exige email verificado | Exigir la verificación para `/me/addresses` y `/me/data-export` (BE 0.5 dp) |
   | M-4 (parcial) | Faltan los prefijos `prod_` de los secretos y el rechazo de eventos `test` en prod | Ver 5.3 |
   | L-6 | Parseo síncrono del CSV | Aceptable: importar fuera de horas pico |
   | L-7 | Imágenes externas de Shopify | Migrarlas a `/media` antes del cutover (ver F) o allowlist de `cdn.shopify.com` |
   | L-8 | CSV en disco local | Aceptable con una instancia |
   | L-9 | Actions sin fijar por SHA | Fijarlas por SHA |
   | M-2 | Limitación de re-registro | Runbook SQL o endpoint admin |

   Además, la revisión **no auditó el front**: hacer una revisión ligera del front (XSS en `descriptionHtml`, almacenamiento de tokens, CSP).
4. **Habeas Data (Ley 1581 / Decreto 1377):**
   - Política de tratamiento y aviso de privacidad (NEG + abogado).
   - Casillas de consentimiento separadas para marketing en registro, checkout y newsletter (doble opt-in ya existe).
   - Canal de consultas y reclamos (correo y plazos de 10/15 días hábiles).
   - Registro ante la SIC (RNBD) si aplica [SUPUESTO: depende de los activos de la empresa].
   - El panel usa `erase` con confirmación.
   - Revisar que los logs no lleven PII (la API ya lo cuida).
   - Analítica web solo con un banner de cookies si se usa GA o Meta Pixel.
5. **PCI.** Usar solo el widget o checkout de Wompi (`redirectUrl`): ningún dato de tarjeta toca nuestros servidores. Queda en SAQ A. No registrar los cuerpos del webhook completos.
6. **Dependencias.** `yarn audit` (o `npm audit --omit=dev`) en CI, Dependabot y Renovate semanal, Next y Nest al último patch antes del go-live. `embedded-postgres` (beta) es solo de desarrollo.
7. **Secretos.** Nada sensible en `NEXT_PUBLIC_*`. Solo `WOMPI_PUBLIC_KEY` es pública. `STOREFRONT_SERVER_KEY` y `STOREFRONT_REVALIDATE_SECRET` solo en el servidor Next. Rotación documentada.
8. **Validación de enlaces y HTML.**
   - El panel ya valida URLs seguras (`isSafeUrl`, `isSafePath`) y la API sanea `descriptionHtml` y valida secciones con Zod.
   - En la tienda, renderizar los `href` del CMS con `isSafeUrl` y `rel="noopener"` en externos.
   - Markdown del editorial con un renderer sin HTML crudo.

---

## E. Calidad

**Estrategia:** el cliente decidió "sin tests unitarios" y el backend usa smoke (decisión #4). Propuesta mínima pero real:
- Añadir `@playwright/test` al front.
- Reducir `projects` a Chromium + Mobile Safari.
- `webServer` contra el build de producción.
- Ejecutarlo en CI contra staging tras cada deploy y en local contra la API de desarrollo (`MOCK_PAYMENTS_ENABLED=true`).

| # | E2E crítico | Entorno |
|---|---|---|
| 1 | Compra completa: PDP → talla → carrito → checkout → Wompi sandbox con tarjeta APPROVED 4242… → `/checkout/result` → pedido `paid` en el panel → correo en outbox | staging (sandbox real) y CI (mock-payment) |
| 2 | Pago rechazado (DECLINED) → pedido no pagado y stock liberado tras la expiración | CI con mock |
| 3 | Login staff + 2FA (TOTP generado con `otplib` en el test) + guarda de permisos (`support` no ve Equipo) | CI |
| 4 | Publicar plantilla: editar el hero → publicar → la home muestra el texto nuevo (revalidación) + vista previa con token | CI |
| 5 | Reembolso parcial con reposición → estado `partially_refunded` y stock +n | CI |
| 6 | Ajuste de stock en una ubicación → la PDP muestra "Agotado" al llegar a 0 | CI |
| 7 | Redirección 301 de una URL antigua de Shopify | CI |

Esfuerzo: 4–6 dp (QA/FE). Se mantienen los smoke del backend.

**Otras pruebas:**
- **Carga básica:** k6 contra staging con 50 usuarios virtuales en navegación + 5 checkouts/min durante 10 min. Objetivo: p95 < 500 ms en la API, sin 5xx y sin sobreventa (verificar la reserva concurrente de la última unidad). 1 dp.
- **Accesibilidad:** axe en Playwright sobre home, PDP, carrito, checkout, login y 2–3 pantallas del panel. Teclado en el drawer y en los diálogos.
- **Lighthouse/CWV:** objetivos en móvil LCP < 2,5 s, CLS < 0,1, INP < 200 ms (hoy el rendimiento está en 89 según TASKS.md). Imágenes por `next/image` con `remotePatterns` hacia `api.daregulardept.com/media` (falta configurarlo en `next.config.ts`).
- **SEO:** `NEXT_PUBLIC_SITE_URL=https://daregulardept.com`. `INDEXABLE=true` solo en prod (nunca en staging ni en la IP). Sitemap dinámico, canonical, JSON-LD `Product`/`Offer` con disponibilidad real, `BreadcrumbList`, 301 desde las URLs de Shopify (`/products/*`, `/collections/*` coinciden; `/pages/*`, `/blogs/*`, `/collections/*/products/*` → `/products/*`, `/account/*`) y Search Console con envío del sitemap el día del cutover.

---

## F. Datos y migración desde Shopify

| Paso | Detalle | Resp. | dp |
|---|---|---|---|
| F.1 Inventario de datos | Export de Shopify: productos (CSV), clientes (CSV), pedidos (CSV), lista de URLs (sitemap actual), imágenes. ¿Hay pedidos o clientes reales? La landing de `www.` está "Opening soon" según el README del front: confirmar el volumen | NEG | 0.5 |
| F.2 Productos | `POST /admin/import/jobs type=products dryRun=true` en staging → revisar errores por fila → import real. Validar handles (para conservar URLs), tallas como opciones, SKU únicos, precios en COP enteros, `Status` presente (M-3 corregido, pero incluir la columna igual) | BE+NEG | 1 |
| F.3 Imágenes | El importador deja URLs de `cdn.shopify.com` (L-7). Antes de cerrar Shopify, **descargarlas y subirlas a `/media`**: script nuevo (BE 1–1.5 dp) que recorre `product_media` externos, descarga, hace `POST /admin/media` (dedupe) y reemplaza. Si no, las imágenes se rompen al cancelar Shopify | BE | 1–1.5 |
| F.4 Clientes | Import con `dryRun`. Consentimiento solo en clientes nuevos (M-1). Cuentas como invitados: comunicar "restablece tu contraseña". Supresiones respetadas | BE+NEG | 0.5 |
| F.5 Pedidos históricos | **No soportado.** Recomendación: no migrarlos al sistema transaccional; guardar el CSV de Shopify como archivo (soporte y contabilidad). Opcional fase 2: tabla `legacy_orders` de solo lectura en el perfil del cliente | NEG | — |
| F.6 Redirecciones 301 | No hay importador: script que lee el sitemap de Shopify y la lista de handles cambiados → `POST /admin/redirects` (o SQL). Probar con el E2E #7 y `curl -I` en lote | BE | 0.5–1 |
| F.7 Contenido CMS | Cargar home, menús, settings y páginas legales (privacidad, términos, cambios y devoluciones, envíos) en el CMS y publicar | NEG+FE | 1–2 |
| F.8 Ensayo general en staging | Restaurar backup → importar todo → compras sandbox → verificar redirecciones y SEO → cronometrar el proceso | Todos | 1 |
| F.9 Cutover | T-72 h: TTL DNS 300 s. T-24 h: congelar catálogo en Shopify. T-0: import final (delta de stock), cambiar el registro DNS en Cloudflare, Wompi en prod (llaves `pub_prod`, URL de eventos), compra real de bajo monto con reembolso manual, Search Console | Todos | 0.5 |
| F.10 Rollback | Mantener Shopify activo (sin cancelar el plan) 2–4 semanas. Criterios de rollback: pagos fallando > 15 min, checkout caído, error de precios. Acción: revertir el DNS (TTL 300 s) y conciliar a mano los pedidos creados en el nuevo sistema durante la ventana | Tech lead | — |

---

## G. Operación post-lanzamiento

- **Runbooks** (en `docs/runbooks/` del backend):
  1. Pago aprobado y pedido no pagado: conciliación manual (`mark-paid` con referencia).
  2. Reembolso: Wompi dashboard + registro en el panel.
  3. Restaurar backup.
  4. Rotar secretos.
  5. API caída o scheduler parado (las publicaciones programadas no salen).
  6. Correo no entregado (outbox `failed`).
  7. Solicitud de Habeas Data (export y erase; supresión para re-registro).
  8. Rollback de release.
  9. Alta y baja de personal con 2FA.
- **On-call:** con equipo pequeño, un dev de guardia por semana en horario extendido (8–22 h) durante las primeras 2 semanas. Alertas a Telegram o Slack con prioridad. NEG atiende al cliente final.
- **Backups:** verificación automática diaria (checksum y tamaño) y restauración mensual en staging.
- **Primeras 2 semanas:**
  - Días 1–3: revisión diaria (09:00) de pedidos `pending` > 30 min frente al dashboard de Wompi, outbox, errores 5xx y stock negativo o sobreventa.
  - Semana 1: hotfixes, ajustes de CSP (pasar de Report-Only a enforce), Search Console (errores 404 → nuevas 301).
  - Semana 2: módulos del panel diferidos (9–15), DMARC a quarantine, primer informe de CWV de campo, retro.

---

## H. Riesgos y decisiones abiertas

### H.1 Riesgos priorizados

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | Pagos aprobados sin reflejarse (webhook perdido) → stock liberado y sobreventa | Media | Alto | 5.2 conciliación + alerta |
| 2 | Panel expuesto sin auth si se despliega la rama actual | Alta si se despliega hoy | Crítico | Fase 2 + Access. **No desplegar `/admin` antes** |
| 3 | Infra de Docker nunca probada | Alta | Alto | Fase 1 primero, en staging |
| 4 | Guardado de producto multi-llamada → estados parciales | Media | Medio | Orquestador idempotente y mensajes claros; si no, endpoint BE de "upsert completo" (2–3 dp) |
| 5 | Imágenes atadas a Shopify | Alta | Alto | F.3 |
| 6 | Pérdida de datos por un solo VPS | Baja-media | Crítico | Backups externos probados; considerar Postgres gestionado |
| 7 | Incumplimiento de Habeas Data (sin política ni consentimiento) | Media | Alto (multas SIC) | Política + casillas + runbook |
| 8 | Correos en spam | Media | Medio | SPF/DKIM/DMARC y proveedor dedicado |
| 9 | Reembolsos manuales inconsistentes | Media | Medio | Runbook + campo de referencia en la nota |
| 10 | Una sola instancia: el rate limit y los medios limitan la escala | Baja (volumen inicial) | Medio | Aceptado para el MVP; driver R2 después |
| 11 | Facturación electrónica DIAN fuera de alcance (PLAN §11) | Alta | Legal/fiscal | NEG confirma con el contador si la factura se emite desde otro software |
| 12 | SEO: pérdida de ranking en el cambio | Media | Medio | 301 completas, sitemap, staging `noindex` |

### H.2 Decisiones para el dueño del producto (con recomendación)

| Decisión | Opciones | Recomendación |
|---|---|---|
| **Base de datos de roles/permisos** (hoy no existe en dev) | (a) Usar el modelo existente del backend (`roles` y `staff_users` en Postgres, roles de sistema sincronizados al arrancar, owner con `owner:create`); (b) diseñar uno nuevo | **(a)**: ya está implementado y auditado. Solo hay que migrar la BD (`migration:run`) y crear el owner en cada entorno. Roles fijos en el MVP (no editables); 2FA obligatorio para owner/admin |
| **Hosting definitivo** | VPS propio (ya hay uno) con Postgres local; VPS + Postgres gestionado (Neon/Supabase); PaaS (Railway/Render, recomendado en el README del backend) | **VPS + Postgres gestionado con PITR** si el presupuesto lo permite (unos USD 20–30/mes extra). Si no, VPS con Postgres local y backups externos probados. Cloudflare delante siempre |
| **Proveedor de correo** | Resend, Postmark, Amazon SES, SMTP de Google Workspace | **Postmark o Resend** por SMTP (el backend usa `SMTP_URL`): entregabilidad alta y configuración rápida. SES si se prioriza costo |
| **Política de devoluciones y envíos** | Plazos, quién paga el envío de vuelta, cambios de talla, zonas, tarifas y gratis desde X COP, transportadora | NEG define antes de la semana 4: alimenta zonas y tarifas (`/admin/shipping`), páginas legales y plantillas. Recomendado: tarifa plana nacional + Bogotá diferenciada, gratis sobre un umbral, cambios en 30 días y retracto de 5 días hábiles (Estatuto del Consumidor, Ley 1480) |
| **MVP frente a después** | — | **MVP:** tienda dinámica, carrito, checkout Wompi, correo transaccional, cuenta (login, registro, pedidos, direcciones), newsletter y contacto, CMS (plantillas, páginas, menús, settings), panel con auth y 2FA, pedidos, productos, inventario, medios, colecciones, descuentos, envíos e impuestos. **Después:** clientes avanzado, marketing, analítica completa, auditoría con filtros, importador desde la UI (se usa vía API o curl en la migración), driver R2, reembolsos por API, pedidos históricos, DIAN |
| Panel: misma app o separado | `/admin` en la tienda (actual) frente a `Department-admin` (PLAN decisión #3) | Mantener `/admin` en la misma app (ya construido) y actualizar `PLAN.md`, `ADMIN_URL` y CORS |
| Pedidos históricos de Shopify | Migrar o archivar | Archivar el CSV y no migrar al sistema transaccional |
| `phone` en el contacto | Quitarlo del front o añadirlo al DTO | Añadirlo al DTO como opcional (útil por WhatsApp) |

---

## I. Checklist go/no-go y cronograma

### I.1 Checklist go/no-go (todo verificable)

**Infra**
- [ ] `https://daregulardept.com` y `https://api.daregulardept.com/ready` responden 200; certificado válido; HSTS.
- [ ] La API arranca con `NODE_ENV=production` (la validación de `env.ts` pasa: Wompi prod, SMTP, SSL de BD, `TRUST_PROXY`, secretos).
- [ ] Backup de anoche existe fuera del VPS y la restauración en staging se probó (fecha y duración registradas).
- [ ] Alertas probadas: se tumba la API y llega el aviso en menos de 5 min.

**Seguridad**
- [ ] `/admin` sin sesión → login (y bloqueado por Access); owner y admin tienen 2FA activo.
- [ ] `curl /api/v1/admin/orders` sin token → 401; con rol `support` en `PUT /admin/taxes` → 403.
- [ ] `DOCS_ENABLED` apagado (`/docs` → 404); `/storefront/dev/mock-payment` → 404.
- [ ] CSP activa sin errores en consola en los flujos críticos; `yarn audit` sin críticos o altos.
- [ ] Ningún secreto en el repo (`git grep` de `pub_prod`, `prv_`, `SMTP`); `.env.production` fuera de git.

**Funcional**
- [ ] Los 7 E2E en verde contra staging; smoke del backend en verde.
- [ ] Compra real en prod (bajo monto) → pedido `paid`, correo recibido y reembolso manual registrado.
- [ ] Webhook simulado caído → la conciliación corrige en menos de 10 min.
- [ ] Publicar en el CMS se refleja en la tienda en menos de 10 s; la vista previa funciona.
- [ ] `grep -r "lib/admin/mock\|data/products" src` sin usos en producción.

**Datos y SEO**
- [ ] Catálogo importado: conteo de productos, variantes y stock coincide con Shopify; las imágenes salen de `/media`.
- [ ] 100 % de las URLs del sitemap de Shopify devuelven 200 o 301 (script).
- [ ] `robots.txt` permite indexar en prod y no en staging; el sitemap está enviado.

**Legal y negocio**
- [ ] Política de privacidad, términos, envíos y devoluciones publicadas; consentimientos en formularios.
- [ ] SPF, DKIM y DMARC OK; mail-tester ≥ 9.
- [ ] Runbooks escritos; guardia asignada; Shopify sigue activo como respaldo.

### I.2 Cronograma (2 devs full-stack A y B + NEG)

| Semana | Optimista (7–8 sem) | Realista (11–13 sem) |
|---|---|---|
| 1 | F0 + F1 (A: VPS y compose; B: limpieza del front, tipos OpenAPI, Dockerfile del front) | F0, inicio de F1 |
| 2 | F1 cierre (backups, CI/CD, observabilidad) + F2 (B) | F1 (problemas de Docker y TLS esperables) |
| 3 | A: F4.1–4.3 (catálogo, CMS); B: F3 productos | F1 cierre + F2 |
| 4 | A: F4.6 carrito + 4.4/4.5; B: inventario, pedidos | A: F4 catálogo y CMS; B: F3 productos |
| 5 | A: F4.7–4.8 checkout + F5.1/5.2 (con BE); B: contenido, medios, colecciones | A: F4 carrito y revalidación; B: productos, inventario |
| 6 | A: F4.9 cuenta + 4.10/4.11; B: descuentos, envíos, 2.4/2.7 (BE) | A: checkout; B: pedidos, medios |
| 7 | F5 correo + F6 QA, seguridad y rendimiento (ambos); NEG: legales y contenido | A: Wompi + conciliación; B: contenido, colecciones |
| 8 | F7 ensayo + cutover | A: cuenta de cliente; B: descuentos, envíos, 2FA obligatorio |
| 9 | — | F5 correo + E2E |
| 10 | — | F6 QA, seguridad, carga, SEO |
| 11 | — | F7 migración + ensayo general |
| 12–13 | — | Colchón por hallazgos + cutover; los módulos diferidos del panel siguen después del lanzamiento |

**Camino crítico:** F1 (infra validada) → F2 (auth) → F4.6/4.7 (carrito y checkout) → F5.1/5.2 (Wompi sandbox y conciliación) → F7 (imágenes, redirecciones, ensayo) → cutover.

Con **un solo dev**, multiplicar por ~1,7. En ese caso, priorizar la tienda y pagos, y un panel mínimo: auth, pedidos, productos, inventario y contenido.

---

### Archivos clave para la implementación
- /home/user/Department-frontend/src/lib/admin/query.ts (sustituir `useMock`/`usePaged`/`useAction` por las variantes de API) y /home/user/Department-frontend/src/lib/admin/api/*.ts (catalog, orders, content, admin, media)
- /home/user/Department-frontend/src/lib/admin/auth.tsx y /home/user/Department-frontend/src/lib/admin/api-client.ts (auth real; base URL)
- /home/user/Department-frontend/src/lib/cart.ts, /home/user/Department-frontend/src/app/checkout/page.tsx, /home/user/Department-frontend/src/data/products.ts (tienda ↔ API) y /home/user/Department-frontend/.env.production / /home/user/Department-frontend/next.config.ts
- /home/user/Department-backend/src/config/env.ts, /home/user/Department-backend/docker-compose.yml, /home/user/Department-backend/Dockerfile (despliegue)
- /home/user/Department-backend/src/commerce/payments/wompi.provider.ts y /home/user/Department-backend/src/commerce/orders/orders.scheduler.ts (conciliación de Wompi); /home/user/Department-backend/src/identity/auth/auth.service.ts (2FA obligatorio); /home/user/Department-backend/src/cms/sections/registry.ts (metadatos de UI de las secciones)
- Referencias: /home/user/Department-backend/docs/API.md, /home/user/Department-backend/docs/SECURITY-REVIEW.md, /home/user/Department-frontend/docs/ADMIN.md
