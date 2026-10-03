# Panel de administración `/admin`

Vistas bajo `/admin` dentro de esta misma app Next.js, con el diseño de la tienda. **Conectado a la API real** (`/api/v1/auth/*` y `/api/v1/admin/*`); ya no hay datos simulados.

## Acceso y sesión
- `/admin/login` (correo + contraseña, y código de 2FA o de recuperación cuando la cuenta lo tiene). Sin sesión, `AuthGate` redirige al login con `?next=` (solo rutas internas).
- Access token en memoria; la sesión se restaura con `POST /auth/refresh` (cookie httpOnly `dept_rt`). Si el refresco falla, se vuelve al login.
- Permisos: `GET /auth/me` entrega las claves; `Sidebar`, `useCan` y `<Can>` las usan (mismas claves que el backend: `orders:read`, `content:publish`…).
- Crear el primer propietario en el backend: `OWNER_EMAIL=… OWNER_PASSWORD=… yarn owner:create`.

## Arquitectura
- `src/lib/admin/api-client.ts`: cliente `api.get/post/put/patch/delete/upload/download`, reintento tras refresh, `ApiError` (code, status, details, requestId).
- `src/lib/admin/query.ts`: `useApi` (GET con `select` para adaptar DTO→pantalla) y `useAction` (mutación con toast e invalidación).
- `src/lib/admin/api/*.ts`: un archivo por módulo (`orders`, `catalog`, `media`, `imports`, `content`, `admin`) con hooks y adaptadores `fromApi/toApi`.
- Concurrencia optimista: `version`/`If-Match` en pedidos, productos y documentos del CMS; ante 409/412 se recarga y se avisa.
- Editor de CMS: los formularios de sección se generan del JSON Schema de `GET /admin/content/section-types`; la vista previa es un iframe de la tienda real con token de borrador (`/api/preview`).

## Módulos
Dashboard, pedidos, productos, colecciones, inventario, medios, importador, contenido (ajustes `site`, menús, plantillas, páginas, versiones, publicar/programar), redirecciones, clientes, descuentos, envíos e impuestos, newsletter, mensajes de contacto, plantillas de correo, personal y roles, auditoría, mantenimiento y mi cuenta (contraseña y 2FA).

## Funciones del diseño original que la API no respalda (retiradas)
- Pedidos: orden por columna (el backend ordena por más reciente), lista de etiquetas global, reembolso automático en pasarela (solo se registra).
- Productos: stock en el editor (va en Inventario), volver a borrador, borrar metafields, facetas de etiqueta/proveedor/tipo.
- Colecciones: contador de productos en lista, "más vendido" como orden.
- Clientes: editar correo, columnas de pedidos/gasto en la lista. Personal: reset de contraseña/2FA y borrado (existe desactivar).
- Redirecciones: contador de visitas. Descuentos: código y tipo no editables tras crearlos.

## Notas para backend
- El detalle de producto no incluye `version` de variante (el front la sondea ante 409).
- Las respuestas vacías (200 sin cuerpo) y 202 se toleran en `api-client`.
- `audit.diff` tiene formas distintas según el módulo; el cambio de rol muestra UUID.
- Login con límite de intentos (429) tras varios inicios seguidos.
