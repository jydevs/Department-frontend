# Estado del proyecto — frontend (tienda + panel `/admin`)

Actualizado: 3 de octubre de 2026 · rama `claude/tender-heisenberg-w6jnxy`.

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
- Productos se generan bajo demanda (ISR); home, layout, colecciones y páginas se prerenderizan, por lo que **el build necesita la API accesible**.
- En QA el backend debe subir `THROTTLE_LIMIT` (el build hace muchas peticiones desde una IP).

## 3. Pendiente

| Tema | Detalle |
| --- | --- |
| Redirecciones del CMS en la tienda | Falta aplicar `GET /storefront/redirects` (proxy/middleware). |
| Zonas y tarifas de envío en tu BD | El checkout las necesita; créalas en `/admin/shipping`. |
| Wompi real | Probado solo con pasarela simulada; falta sandbox/producción con llaves. |
| Tests e2e automatizados | `tests/e2e/integration.spec.ts` ajustado a las rutas nuevas pero **no ejecutado**; no está en CI. |
| Backend (hallazgos) | `version` de variante en el detalle de producto; `audit.diff` heterogéneo; listar miembros de colección; `alt` en media existente; handle de colecciones eliminadas. |
| Despliegue | Ver `PLAN-PRODUCCION.md` (HTTPS, CORS, dominio, secretos, Wompi, correo). |

## 4. Verificación realizada (QA, BD local poblada)

- Tienda: home/colecciones/producto/páginas/404/sitemap con CMS real; compra completa con pago simulado hasta "Pago recibido" y carrito vacío.
- Cuenta: registro → verificación → login → perfil/direcciones → pedidos → cambio de contraseña → recuperación → newsletter confirmar/baja.
- Admin: login/redirección/logout; las 25 pantallas cargan sin errores de consola; flujos de edición persistentes por módulo (pedidos, productos, inventario, medios, CMS con publicar/restaurar y revalidación en la tienda, clientes, descuentos, envíos, marketing, correos, personal, auditoría, 2FA).
