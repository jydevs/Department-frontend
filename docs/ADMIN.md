# Panel de administración `/admin` (fase visual)

Panel de administración integrado en esta misma app Next.js como vistas bajo `/admin` (sin proyecto aparte). **Esta fase es solo visual:**
todas las pantallas funcionan contra una base de datos simulada en memoria (`src/lib/admin/mock`), sin llamar a ninguna API.
Los datos se reinician al recargar la página.

## Desarrollo

```bash
yarn install
yarn dev        # tienda: http://localhost:3000 · panel: http://localhost:3000/admin
                # sin login en esta fase: abre directo
yarn typecheck && yarn lint && yarn build
```

## Cómo conectar la API real después

- `src/lib/admin/api-client.ts` ya implementa el cliente (token en memoria, refresh por cookie, `ApiError`).
- Cada módulo expone sus hooks en `src/lib/admin/api/*.ts`; hoy usan `useMock`/`useAction` (`src/lib/admin/query.ts`).
  Para conectar, reemplaza el cuerpo de cada hook por `api.get/post/...` manteniendo la firma.
- `src/lib/admin/auth.tsx` entrega un usuario propietario fijo (no hay login en la fase visual); sustituir por `POST /auth/refresh` + `GET /auth/me` y reañadir la pantalla de login.
- Variable futura: `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:4000`).

## Pendiente / simulado

- Vista previa de plantillas: wireframe en vivo del borrador; el botón “Abrir en la tienda” usa un token simulado.
- 2FA: se muestra secreto + URI `otpauth` (sin QR todavía).
- Subida de medios: se guardan como data-URI en memoria.

## Estructura

- `src/app/admin/**` — rutas (`/admin/orders`, `/admin/content/templates/home`, …).
- `src/components/admin/**` — kit UI y componentes por módulo. `src/lib/admin/**` — datos simulados, hooks y utilidades.
- `src/components/layout/StoreChrome.tsx` oculta header/footer de la tienda dentro de `/admin`.
- Los estilos del panel viven al final de `globals.css`: las variables y clases propias (`.adm-*`) cuelgan de `.admin-root` y las reglas van en `@layer base/components` para no pisar utilidades de Tailwind. Los tokens de color (`bg-surface`, `text-muted`, `border-line`, `bg-accent`, …) se declaran en el `@theme` global; sus nombres no existen en la tienda, y sus valores solo se resuelven dentro de `.admin-root`.
- Reutilizan la identidad de la tienda (negro, rojo Dept., Anton/Oswald, esquinas rectas).
- `/admin` está en `Disallow` de `robots.txt` y con `noindex`. **No tiene autenticación ni control de permisos en esta fase** (sin base de datos de roles): hay que protegerlo antes de desplegarlo.
