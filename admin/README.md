# Dept. Admin (fase visual)

Panel de administración de Daregular Dept. (Next.js 16 · React 19 · Tailwind v4). **Esta fase es solo visual:**
todas las pantallas funcionan contra una base de datos simulada en memoria (`src/lib/mock`), sin llamar a ninguna API.
Los datos se reinician al recargar la página.

## Desarrollo

```bash
yarn install
yarn dev        # http://localhost:3001  (login demo: cualquier correo + contraseña de 4+ caracteres)
yarn typecheck && yarn lint && yarn build
```

## Cómo conectar la API real después

- `src/lib/api-client.ts` ya implementa el cliente (token en memoria, refresh por cookie, `ApiError`).
- Cada módulo expone sus hooks en `src/lib/api/*.ts`; hoy usan `useMock`/`useAction` (`src/lib/query.ts`).
  Para conectar, reemplaza el cuerpo de cada hook por `api.get/post/...` manteniendo la firma.
- `src/lib/auth.tsx` simula la sesión; sustituir por `POST /auth/refresh` + `GET /auth/me`.
- Variables: ver `.env.example` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STOREFRONT_URL`).

## Pendiente / simulado

- Vista previa de plantillas: wireframe en vivo del borrador; el botón “Abrir en la tienda” usa un token simulado.
- 2FA: se muestra secreto + URI `otpauth` (sin QR todavía).
- Subida de medios: se guardan como data-URI en memoria.
