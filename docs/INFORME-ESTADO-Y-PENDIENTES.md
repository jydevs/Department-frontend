# Informe: qué está hecho y qué falta

Fecha: 3 de octubre de 2026 · Rama (ambos repos): `claude/tender-heisenberg-w6jnxy`

## 1. Hecho y subido (frontend)

- **Tienda conectada a la API real:** catálogo, búsqueda, colecciones, producto, páginas, 404, sitemap y OG. Todo el contenido (ajustes, menús, plantillas, páginas) viene del CMS, con valores por defecto.
- **Compra completa:** carrito, descuentos, envío, checkout con `Idempotency-Key`, pasarela simulada (QA) y página de resultado. Probado de punta a punta.
- **Cuenta de cliente:** registro, verificación, login con refresh por cookie, recuperar contraseña, perfil, direcciones, pedidos; newsletter confirmar/baja. Sin mocks.
- **Panel `/admin` conectado:** login con 2FA y permisos; pedidos, dashboard, productos, colecciones, inventario, medios, importador, CMS (borradores, publicar, programar, versiones, vista previa real), redirecciones, clientes, descuentos, envíos e impuestos, newsletter, mensajes, correos, personal y roles, auditoría, mantenimiento y mi cuenta. 25 pantallas probadas sin errores de consola. Datos simulados eliminados.
- **Redirecciones del CMS** aplicadas en la tienda (`src/proxy.ts`).
- **Entornos:** QA (`.env.development`, BD local) y producción (`.env.production` con marcadores `<…>` para rellenar). Scripts `build:qa` y `start:qa`. Ver `docs/ENTORNOS.md`.
- **Seguridad ya corregida:** Next 16.3.8 (RCE en `next/og`), escape real del JSON-LD (XSS), `?next=` del login con `isSafePath`.
- **Documentación:** `ESTADO.md`, `ADMIN.md`, `ENTORNOS.md`, `PLAN-PRODUCCION.md`, README y TASKS actualizados.

## 2. Auditoría corregida (hecho y subido)

Corregidos los hallazgos de las cinco auditorías (seguridad, calidad, rendimiento/SEO/a11y, flujos de la tienda y panel):

- **Seguridad y despliegue:** CSP, `/api/preview` validado contra el backend, imágenes OG con allowlist/timeout/tope, vista previa de producto aislada (iframe sandbox), `/mock-checkout` 404 en producción, validación de variables de entorno, `output: standalone`, Dockerfile, CI con API simulada, proxy de redirecciones (stale-while-revalidate, `REDIRECT_ALLOWED_HOSTS`), webhook con límite de 16 KB.
- **Tienda:** build y runtime tolerantes a caídas de la API (sin cachear HTML degradado), menos peticiones por página, variantes multi-opción, precio de oferta por variante, SEO (canonical, JSON-LD, sitemap paginado, robots), h1, focus trap, CLS 0, imágenes, 404 en handles inválidos.
- **Carrito, checkout y cuenta:** errores y avisos en español, carrito sin carreras, pago rechazado con reintento, reanudar pago, IVA coherente, teléfono normalizado, descargar datos y eliminar cuenta, sesión estable ante cortes de red.
- **Panel admin:** sin fuga de caché entre usuarios, logout con token caducado, errores y validación en español, guardado de variantes sin pisar cambios ajenos, guardado parcial de producto recuperable, publicación del CMS sin falsos conflictos, colecciones manuales seguras, confirmaciones, permisos por ruta, accesibilidad (axe 0).
- **Backend (rama `claude/tender-heisenberg-w6jnxy` de `jydevs/department-backend`):** `version` de variante en el detalle admin, `customerId` en el checkout con token de cliente opcional, vinculación de pedidos de invitado al verificar correo, etiquetas `catalog:*` hacia la tienda tras cada cambio de catálogo. Smokes del repo pasan.
- **Verificación final:** `typecheck` y `lint` sin errores ni warnings; `build:qa` OK; sobre el build de producción, compra completa con pago simulado y 25 pantallas del admin sin errores de consola.

## 3. Pendiente técnico

1. **Abrir los PR** (frontend y backend) cuando quieras mezclar.
2. **Peticiones por página:** bajaron (/ 22→15, producto 19→13) pero no a ≤8, porque el listado de la API no trae segunda foto, oferta ni tallas. Se resolvería ampliando el listado en el backend.
3. **Backend sin endpoint:** listar miembros de colección manual (y añadir/quitar de forma incremental), `If-Match`/`version` en `/publish` y `/schedule`, cancelar un pedido pendiente, `redirectUrl` de Wompi con número de pedido, medio por id.
4. **Textos del CMS en inglés** (editar en `/admin`): hero ("Scroll", "Lookbook", "Uniforms for the unnoticed"), "New Arrivals", menú del footer ("Home", "Clothes"…), `priceLabel`/`availabilityLabel`, títulos de colección repetidos ("Clothes").
5. **Footer y legales:** añadir el enlace a `/pages/contact` y crear las páginas Términos, Privacidad, Envíos y devoluciones, Cambios y garantías.
6. **Sin probar:** `docker build` (no hay Docker en el entorno), 2FA con una cuenta real (solo simulado), Wompi real.
7. **Menores:** alt descriptivo por producto en `opengraph-image`, `qualities` en `next.config.ts` para bajar la calidad del hero, `ContactForm` con nivel de encabezado configurable, `content/templates/404` registra un 404 en consola.

## 4. Pendiente por decisión o por datos tuyos

- **Zonas y tarifas de envío en tu BD:** créalas en `/admin/shipping` (el checkout las necesita).
- **Wompi real:** solo está probada la pasarela simulada. Faltan llaves de sandbox/producción, `PAYMENT_PROVIDER=wompi` y probar el webhook.
- **Producción:** rellenar `.env.production`, dominio con HTTPS, `CORS_ORIGINS`, `STOREFRONT_URL`, secretos compartidos (`STOREFRONT_REVALIDATE_SECRET`, `STOREFRONT_SERVER_KEY`), correo transaccional real y la BD de producción (`DATABASE_URL`, `DATABASE_SSL`). Tienda y API deben compartir dominio registrable para la cookie de sesión.
- **Contenido en el CMS:** páginas legales (términos, privacidad, envíos, cambios; relevante por la Ley 1581), enlaces del footer a contacto y legales, y traducir textos sembrados en inglés ("New arrivals", "Lookbook", "Intentional design"…). Títulos de colección repetidos ("Clothes").
- **Backend (hallazgos menores sin asignar):** `audit.diff` con formatos distintos, endpoint admin para listar miembros de colección, `alt` en medios ya existentes, handles de colecciones eliminadas, URLs de medios absolutas atadas al host de la API, límite de login de 5 intentos por minuto (el `AUTH_THROTTLE_LIMIT` de QA no se aplica).
- **Pruebas automatizadas:** fuera de alcance por ahora. Faltan: instalar vitest y Playwright, tests de carrito, cliente HTTP, cuenta, checkout, firma HMAC del webhook y proxy de redirecciones, y un e2e de la compra. Los tests actuales no se ejecutan y no prueban código real.
- **Tus cambios locales del IDE (1000+):** revisa si hay integración sin subir antes de mezclar.

## 5. Datos de prueba que quedan en mi copia de QA (no en tu BD)

Pedidos 1005 a 1015, clientes `qa-*`, usuarios de staff de prueba desactivados y 8 unidades reservadas de Samo Hoodie XL. Es una base local desechable, aparte de la tuya.
