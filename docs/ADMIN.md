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
- Concurrencia optimista: `version`/`If-Match` en pedidos, productos, variantes y documentos del CMS; ante 409/412 se recarga y se avisa. Publicar y programar contenido envían `version` (la del borrador revisado) en el cuerpo: la garantía final es del servidor (409 `CONCURRENT_UPDATE` → se relee y se abre el diálogo de conflicto con el diff; la relectura previa se mantiene como mejora). Variantes: el detalle admin trae `version` por variante y se hace 1 PATCH por variante modificada; ante 409 se relee, se fusionan los campos no tocados y un cambio ajeno sobre un campo tocado es conflicto real (no se pisa). Solo con un backend antiguo sin `version` en el detalle se sondea con PATCH vacíos.
- Editor de CMS: los formularios de sección se generan del JSON Schema de `GET /admin/content/section-types`; la vista previa es un iframe de la tienda real con token de borrador (`/api/preview`).

## Módulos
Dashboard, pedidos, productos, colecciones, inventario, medios, importador, contenido (ajustes `site`, menús, plantillas, páginas, versiones, publicar/programar), redirecciones, clientes, descuentos, envíos e impuestos, newsletter, mensajes de contacto, plantillas de correo, personal y roles, auditoría, mantenimiento y mi cuenta (contraseña y 2FA).

## Colecciones manuales (miembros)
- La lista de productos de una colección **manual** usa los endpoints incrementales `GET/POST/DELETE /admin/collections/:id/products` y `PATCH …/reorder`: muestra todos los estados (badges Borrador/Archivado; la tienda solo muestra los activos), se pagina de 50 en 50 con "Cargar más" y cada acción (añadir, quitar, arrastrar o teclado: espacio + flechas) se aplica al instante, sin depender de "Guardar" y sin reemplazar nunca la lista completa. Si el reordenado falla se revierte y se avisa.
- Las colecciones **inteligentes** no tienen edición manual (el backend responde 409 `COLLECTION_NOT_MANUAL`); una colección nueva o recién cambiada de tipo debe guardarse antes de añadir productos. El orden manual solo se aplica en la tienda si el "Orden de productos" es Manual.

## Funciones del diseño original que la API no respalda (retiradas)
- Pedidos: orden por columna (el backend ordena por más reciente), lista de etiquetas global, reembolso automático en pasarela (solo se registra).
- Productos: stock en el editor (va en Inventario), volver a borrador, borrar metafields, facetas de etiqueta/proveedor/tipo.
- Colecciones: contador de productos en lista, "más vendido" como orden.
- Clientes: editar correo, columnas de pedidos/gasto en la lista. Personal: reset de contraseña/2FA y borrado (existe desactivar).
- Redirecciones: contador de visitas. Descuentos: código y tipo no editables tras crearlos.

## Notas para backend
- Las respuestas vacías (200 sin cuerpo) y 202 se toleran en `api-client`.
- `audit.diff` tiene formas distintas según el módulo; el cambio de rol muestra UUID.
- Login con límite de intentos (429) tras varios inicios seguidos.
- La BD del dueño necesita el seed del CMS (`yarn content:seed`) y `yarn content:complete --publish-legal` para tener todas las secciones y páginas legales (ver `ESTADO.md`).
