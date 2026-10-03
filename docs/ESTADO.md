# Estado del proyecto — frontend (tienda + panel `/admin`)

Actualizado: 3 de octubre de 2026 · rama de trabajo `claude/tender-heisenberg-w6jnxy`.

## 1. Resumen

| Área | Estado |
| --- | --- |
| Tienda pública (`/`, colecciones, producto, carrito, búsqueda, contacto, community, cuenta, checkout) | **Terminada a nivel visual**, con datos locales: catálogo en `src/data/products.ts`, carrito en `localStorage`, login/registro simulados y checkout sin envío real. **Solo newsletter y contacto llaman a la API** (ver §1.1). |
| Panel de administración `/admin` | **Terminado a nivel visual** (31 pantallas) con datos simulados en memoria (`src/lib/admin/mock`). **No consume la API** y **no tiene login** (ver §4). |
| Conexión tienda ↔ API | **No iniciada** (solo reconocimiento del contrato, ver §5). |
| Conexión panel ↔ API | **No iniciada**; el cliente HTTP (`src/lib/admin/api-client.ts`) y la firma de los hooks están listos para sustituir los mocks módulo a módulo. |
| Plan de producción | Redactado: [`PLAN-PRODUCCION.md`](PLAN-PRODUCCION.md). |

### 1.1 Qué ya estaba conectado en `main` antes de esta rama (no se repite)

Revisado en el código el 3-oct-2026 (commit `727701f`, “conexion de componentes…”) y probado contra la API local:

| Pieza | Estado real |
| --- | --- |
| Newsletter (`NewsletterFooter.tsx`) | `POST /api/v1/storefront/newsletter` → **202 OK**. Pero el `catch` muestra “éxito” aunque la API falle (errores silenciados) y no hay página de confirmación (`/newsletter/confirmar`, `/newsletter/baja`). |
| Contacto (`ContactForm.tsx`) | `POST /api/v1/storefront/contact` → **400 `VALIDATION_ERROR`**: el formulario envía `phone`, que el esquema estricto del backend no admite (“Unrecognized key: phone”). Sin `phone` responde 202. Hoy el formulario siempre cae en error. |
| Precios | `formatCOP()` (solo formato; los precios vienen de `src/data/products.ts`). |
| Carrito | `localStorage` + catálogo local; **no** usa la API de carrito. |
| Login / registro / verificación / reset (`src/app/account/*`) | UI; login y registro guardan `"mock-jwt-token"` en `localStorage`. **No** llaman a la API. |
| Checkout (`src/app/checkout/page.tsx`) | Formulario de maqueta con IVA calculado en el cliente; **no** crea pedidos ni pagos. |
| `tests/e2e/integration.spec.ts` | Especificación escrita contra `data-testid` (`product-grid`, `product-card`, …) que el código actual no define; no está en CI. |
| `.env.production` | `NEXT_PUBLIC_API_URL`, llave pública de Wompi, URL del sitio e indexación. |

Todo lo demás (catálogo, CMS, carrito, checkout, pagos, cuenta, panel) **no estaba conectado** en el repositorio remoto. Si existe trabajo de integración adicional en un clon local sin subir, hay que publicarlo en una rama para construir sobre él en lugar de rehacerlo.

## 2. Qué se hizo (historial de la rama)

Commits en orden (todos pushed a `origin/claude/tender-heisenberg-w6jnxy`):

1. `feat(admin)` ×4 — fundamento (kit UI, shell, dashboard, pedidos), productos/colecciones/inventario/medios, contenido (plantillas, páginas, ajustes, menús, redirecciones), resto de módulos.
2. `feat: mover el panel admin a la app principal (/admin)` — sin carpeta ni app aparte; `StoreChrome` oculta header/footer de la tienda dentro de `/admin`.
3. `feat(admin): aplicar el diseño de la tienda…` — mismo lenguaje visual (negro, rojo Dept., Anton/Oswald, esquinas rectas, filetes finos, celdas que se invierten, ticker).
4. `feat(admin): quitar el login…` — acceso directo mientras no hay base de roles.
5. `feat(admin): pulir estilo, accesibilidad y uso táctil…` — diálogo propio para etiqueta masiva, objetivos táctiles ≥ 24 px (40 px en lo más usado), menú móvil.
6. Tres commits `fix(admin)` tras la **auditoría con Opus** (seguridad de enlaces/CSV, lógica de pedidos/stock/anonimización, borradores y autoguardado, foco y Escape en diálogos, estilos en capas, robots, títulos).
7. `docs: plan de implementación…` — `docs/PLAN-PRODUCCION.md`.

## 3. Calidad verificada

- `yarn typecheck`, `yarn lint` (0 errores; 3 avisos preexistentes de la tienda: `CartDrawer`, `ProductInfo`, `tests/unit/api-client.test.ts`) y `yarn build` en verde.
- 31 rutas de `/admin` cargan sin errores de consola; sin scroll horizontal en móvil (390 px) ni tablet (820 px).
- axe-core (WCAG 2 A/AA) en tema oscuro y claro: sin violaciones.
- Flujos comprobados en navegador: autoguardado de borradores y persistencia del SEO, aviso de cambios sin guardar, Escape por capas, foco del menú móvil, anonimización (cliente y pedidos), reembolso con reposición, validación de enlaces (`/\host`, tabulaciones).
- Auditoría Opus: sin críticos; altos corregidos. **Lo que NO se corrigió por depender de permisos/roles** (decisión: no hay base de roles todavía): protección de `/admin`, guarda de permisos por ruta, bloqueo del último propietario.

## 4. Limitaciones conocidas (fase visual)

- `/admin` es público: **no desplegar** hasta tener autenticación (ver `PLAN-PRODUCCION.md`, Fase 2). Está en `Disallow` de `robots.txt` y con `noindex`.
- Los datos del panel se reinician al recargar la página (mock en memoria).
- Vista previa de plantillas = wireframe del borrador; “Abrir en la tienda” deshabilitado sin `NEXT_PUBLIC_STOREFRONT_URL`/token real.
- 2FA muestra secreto + URI `otpauth` (sin QR). Medios subidos = data-URI en memoria.
- Programación de publicaciones: simulada (se aplica al consultar el documento).

## 5. Contrato con el backend (reconocido para la integración)

Backend en `Department-backend` (NestJS, `/api/v1`). Hallazgos relevantes para conectar el front:

**CMS (la tienda debe pasar a estar dirigida por contenido)**
- Documentos: `settings/site`, `menu/main|footer`, `template/layout|home|collection|product|search|cart|404`, `page/community|contact` (semilla en `src/cms/seed/default-content.ts` de la rama `feature/content-seed` del backend, aún sin merge a `main`).
- Cada plantilla es una lista de secciones (`hero`, `marquee`, `new-arrivals`, `split-banner`, `campaign`, `editorial`, `value-props`, `site-header`, `footer`, `newsletter`, `collection-hero`, `product-grid`, `product-detail`, `search-panel`, `cart-drawer`, `contact-form`, `page-header`, `cta-banner`, `lookbook`, `error-hero`, …) cuyos ajustes reproducen **todos los textos** hoy fijos en los componentes. Catálogo completo y esquemas: `docs/CMS-SECTIONS.md` de esa misma rama y `GET /api/v1/admin/content/section-types` (JSON Schema).
- Lecturas públicas cacheables: `GET /storefront/content/{settings|menus/:key|templates/:key|pages|pages/:key|bundle}`.
- Revalidación saliente: `POST {STOREFRONT_URL}/api/revalidate` (HMAC `x-signature`, `ts` anti-replay). Etiquetas: `content:<kind>:<key>` y `content:pages`.
- Vista previa: `POST /admin/content/preview-tokens` → `{STOREFRONT_URL}/api/preview?token=…` + `?preview=<token>` en las lecturas.
- La clave de ajustes es `site` (el mock del panel usa `main`); las plantillas incluyen `layout` (cabecera + newsletter + pie).

**Catálogo / carrito / checkout**
- Listados de tienda devuelven `{ id, handle, title, price, image, available }` con cursor; la ficha incluye variantes (`optionValues`), `media`, `seo`. Imágenes con ruta relativa `/images/...` (carpeta `public/` del front) o URL absoluta `/media/:key`.
- Carrito: `POST /storefront/carts` → `{ id, token }` (token una sola vez, cabecera `X-Cart-Token`); líneas por `variantId`; respuesta con `quote` (subtotal, impuestos, total, avisos). `GET /storefront/shipping-rates?cartId&department` requiere el token y **zonas/tarifas creadas** (la semilla no las incluye).
- Checkout: `POST /storefront/checkouts` con `Idempotency-Key` y `X-Cart-Token` → `{ orderNumber, accessToken, total, payment }`. Con Wompi: redirigir con `publicKey`/`signatureIntegrity`/`redirectUrl` (`/checkout/result`). Con `PAYMENT_PROVIDER=mock`: `checkoutUrl` = `/mock-checkout/<reference>` y `POST /storefront/dev/mock-payment` simula el webhook.
- Rutas que el backend espera en el front y **aún no existen**: `/api/revalidate`, `/api/preview`, `/checkout/result`, `/mock-checkout/[reference]`, `/orders/[n]`, `/account/forgot-password`, `/newsletter/{confirmar,baja}`.

**Panel**
- Auth del personal: `POST /auth/login` → `accessToken` (memoria) + cookie `dept_rt` (httpOnly, `Path=/api/v1/auth`); `GET /auth/me` devuelve permisos. Front y API deben ser el mismo sitio (dominio registrable) para `SameSite=Lax`.
- Los tipos del mock del panel (`src/lib/admin/types.ts`) se diseñaron antes de leer los DTO reales: cada módulo necesitará un adaptador (nombres de campos, paginación offset/cursor, `version`/`If-Match`).
- El editor de secciones debe generar sus formularios desde el JSON Schema de `section-types`, no desde el catálogo manual de `mock/seed.ts`.

## 6. Entorno local verificado (sandbox, sin Docker)

```bash
# Backend
cd Department-backend && yarn install
yarn db:start                 # Postgres embebido :5433 (no arranca como root: ejecútalo con un usuario normal)
yarn migration:run
OWNER_EMAIL=owner@dept.test OWNER_PASSWORD='<contraseña fuerte>' yarn owner:create
yarn catalog:seed && yarn content:seed   # requieren la rama feature/content-seed del backend (no está en main)
yarn build && node dist/main.js          # :4000 · GET /ready → {"status":"ready","database":"up"}
```
`.env` mínimo de desarrollo: `DATABASE_URL`, `DATABASE_SSL=disable`, `CORS_ORIGINS=http://localhost:3000,http://localhost:3001`, `PAYMENT_PROVIDER=mock`, `AUTH_THROTTLE_LIMIT=1000` (solo desarrollo). 

## 7. Siguientes pasos (hoja de ruta de la integración)

| # | Bloque | Contenido |
| --- | --- | --- |
| F1 | Fundación API | `src/lib/api/` (config `API_URL`/`NEXT_PUBLIC_API_URL`, tipos, fetch de servidor con `next.tags`, cliente de navegador, errores). |
| F2 | Catálogo | Sustituir `src/data/products.ts` por la API: colecciones, ficha, búsqueda, sitemap, OG. |
| F3 | CMS | `/api/revalidate`, `/api/preview`, lectura de plantillas/menús/ajustes; refactor de componentes para recibir los ajustes de cada sección (valores por defecto = textos actuales); redirecciones. |
| F4 | Carrito y pagos | Carrito por API, checkout, `/checkout/result`, `/mock-checkout`, `/orders/[n]`, Wompi sandbox. |
| F5 | Cuenta | Registro/login/verificación/recuperación de cliente, pedidos y direcciones, newsletter y contacto reales. |
| F6 | Panel | Login + permisos + 2FA, y reemplazo de mocks por API módulo a módulo (adaptadores). |
| F7 | Cierre | E2E contra la API real, retirar mocks, docs y despliegue (ver `PLAN-PRODUCCION.md`). |

## 8. Revisión del repositorio (notas)

- `.env.production` está versionado con valores públicos (`NEXT_PUBLIC_*`); no debe contener secretos. Revisar antes del despliegue.
- `tests/` contiene un test unitario y un E2E previos (no forman parte de `yarn lint/typecheck/build`); `playwright.config.ts` existe.
- El README y `TASKS.md` describen la tienda original; el panel y la integración se documentan aquí y en [`ADMIN.md`](ADMIN.md).
