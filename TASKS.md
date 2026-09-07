# TASKS — Frontend Daregular Dept. (Next.js)

Réplica del frontend de **daregulardept.com** a partir de las capturas de
referencia. Solo frontend. Stack: **Next.js 16 (App Router) + TypeScript +
Tailwind CSS v4 + yarn**. Mobile-first, accesibilidad básica (alt text,
contraste, HTML semántico).

## Reglas de trabajo

- Nunca commit ni push directo a `main`.
- Una rama por tarea: `feature/<slug>` (o `chore/…`, `fix/…`).
- Commits pequeños, en español: `feat: descripción corta`.
- Un PR por rama → **el humano revisa y aprueba antes de mergear**.
- Cada rama: `yarn lint` + `yarn typecheck` + `yarn build` en verde antes del PR.
- Imágenes: usar `<PlaceholderImage>` (ver `docs/ASSETS.md`). No añadir binarios pesados.

## Identidad de marca (resumen — la fuente pixel a pixel son las capturas)

- Fondo negro dominante, texto/UI blanco, **rojo `--dept-red`** como acento.
- Tipografía UI: condensada, mayúsculas, bold (Anton / Oswald).
- Cuerpo narrativo: sans regular (Inter).
- Logo: script decorativo — **dos variantes**: roja tipo grafiti (fondos
  oscuros/imagen) y negra script fina (páginas de cuenta / header sobre claro).
- Tokens de color en `src/app/globals.css` — valores muestreados, pendientes de
  código de marca oficial.

## Rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Home (7 secciones, ver abajo) |
| `/collections/all` | Catálogo "CLOTHES" — 8 artículos |
| `/collections/men` | Colección men |
| `/collections/women` | Colección women — 2 artículos |
| `/pages/contact` | "DAREGULAR MEMBERS" + modal de cuenta |
| Cart drawer | Overlay global — "TU CARRITO ESTÁ VACÍO" |
| Account modal | Overlay global — opciones de inicio de sesión |

---

## Backlog

Estado: ⬜ pendiente · 🟦 en progreso · ✅ PR abierto · ✔️ mergeado

### Tanda 0 — Fundación

| # | Rama | Tarea | Dep. | Estado |
| --- | --- | --- | --- | --- |
| 0 | `chore/scaffold-nextjs` | Scaffold Next.js + TS + Tailwind + yarn, tokens de diseño, fuentes, estructura de carpetas, `<PlaceholderImage>`, datos mock (`src/data`), stubs de `Header`/`NewsletterFooter`/`Logo`, `TASKS.md`, `docs/ASSETS.md`. | — | ✔️ #1 |

> Todo lo demás depende de que la Tanda 0 esté en `main`.

### Tanda 1 — Componentes hoja

| # | Rama | Tarea | Dep. | Estado |
| --- | --- | --- | --- | --- |
| 1 | `feature/navbar` | Header real: links HOME/CLOTHES/COMMUNITY a la izquierda, logo centrado, iconos búsqueda/cuenta/carrito a la derecha. Transparente sobre el hero en `/`; fondo claro + logo negro en páginas internas sin imagen. Menú accesible en mobile. | 0 | ✔️ #2 |
| 2 | `feature/newsletter-footer` | Footer global "ÚNETE A REGULAR MEMBERS ONLY." con input de correo + botón flecha. Se repite en todas las páginas (ya montado en `layout.tsx`). Estados focus/hover, validación básica de email, sin backend. | 0 | ✔️ #3 |
| 3 | `feature/product-card` | `<ProductCard>` + `<ProductGrid>`. Imagen sobre negro, barra inferior negra (nombre mayúsculas izq. / precio COP der.), badge opcional "Agotado" / "Oferta" (precio tachado + final). Formato de precio con `formatCOP`. Grid responsive. | 0 | ✔️ #4 |
| 4 | `feature/logo` | `<Logo>` con las dos variantes (roja grafiti / negra script) como SVG o tratamiento tipográfico afinado. Sustituye el stub. | 0 | ✔️ #5 |

### Tanda 2 — Secciones de Home

> `feature/home-stubs` monta las 6 secciones (stubs) en `src/components/home/` y en
> `src/app/page.tsx` en el orden correcto. Cada tarea de abajo rellena SOLO su
> componente — sin tocar `page.tsx` — para evitar conflictos.

| # | Rama | Tarea | Dep. | Estado |
| --- | --- | --- | --- | --- |
| 5 | `feature/hero-section` | Hero full-bleed: imagen fría azulada (placeholder), overlay "UNIFORMS FOR THE UNNOTICED." grande abajo-izquierda. | 0, stubs | ✔️ #7 |
| 6 | `feature/new-arrivals` | Sección con fondo de video (grano/VHS) — usar `<video>` con placeholder/póster. Texto centrado "NEW ARRIVALS" + subtítulo. | 0 | ✔️ #8 |
| 7 | `feature/split-banner` | Banner 50/50 WOMEN (fondo rosa grafiti) / MEN (grafiti multicolor). Cada mitad enlaza a `/collections/women` y `/collections/men`. Apila en mobile. | 0 | ✔️ #9 |
| 8 | `feature/campaign-section` | "RAGS TO RICHES – EXTENDED VERSION": título grande + `<ProductGrid>` con `getCampaignProducts()`. | 0, 3 | ✔️ #10 |
| 9 | `feature/editorial-block` | Bloque editorial: imagen grande izquierda + heading + 3 párrafos de copy (texto de la captura) a la derecha. Apila en mobile. | 0 | ✔️ #11 |
| 10 | `feature/value-props` | Fila de 3 valores con icono + título + subtítulo (INTENTIONAL DESIGN / MADE WITH CARE / A TEAM WITH A GOAL). Iconos SVG inline (ojo / corazón / persona). | 0 | ✔️ #12 |

### Tanda 3 — Composición y páginas internas

> `feature/tanda3-scaffold` monta: `FilterBar` + `CollectionView` stubs, ruta
> `/collections/[handle]` funcional, `AccountModal` + `CartDrawer` stubs, página
> `/pages/contact` con harness temporal de overlays. Cada tarea rellena su pieza.

| # | Rama | Tarea | Dep. | Estado |
| --- | --- | --- | --- | --- |
| 11 | `feature/home-page` | Revisión final de `/` ya ensamblada (por `home-stubs`): ritmo vertical, spacing entre secciones, responsive de conjunto. | 5–10 | ✔️ (via #6) |
| 12 | `feature/filter-bar` | `<FilterBar>`: dropdowns "Availability" y "Price" (izq.), contador "N artículos" + dropdown "Ordenar" (der.). Accesible; el filtrado real puede ser client-side simple. | 0, 3 | ✔️ #15 |
| 13 | `feature/collection-page` | Ruta `/collections/[handle]` (all/men/women) con `generateStaticParams`. Hero reducido desaturado + título grande, `<FilterBar>`, `<ProductGrid>`. | 3, 12 | ✔️ #16 |
| 14 | `feature/account-modal` | `<AccountModal>` overlay: "DAREGULAR MEMBERS" (h1) + botón azul "Iniciar sesión con shop", botón rojo oscuro "OTRAS OPCIONES DE INICIO DE SESIÓN", accesos "Pedidos" / "Perfil". Trap de foco, cierre con Esc. Página `/pages/contact` que lo usa. | 0, 4 | ✔️ #17 |
| 15 | `feature/cart-drawer` | `<CartDrawer>` lateral derecho: "TU CARRITO ESTÁ VACÍO", texto de login, botón rojo "SEGUIR COMPRANDO". Animación de entrada, overlay, cierre con Esc. Abierto desde el icono de carrito del header. | 0, 1 | ✔️ #18 |

### Tanda 4 — Estado global de overlays

| # | Rama | Tarea | Dep. | Estado |
| --- | --- | --- | --- | --- |
| 16 | `feature/overlay-state` | Contexto/estado (client) para abrir/cerrar cart drawer y account modal desde el header; bloqueo de scroll del body; integración final. | 1, 14, 15 | ✔️ #19 |

---

## Orden de ejecución

```
Tanda 0  →  (merge)  →  Tanda 1 (1,2,3,4 en paralelo)  →  (merge)
         →  Tanda 2 (5,6,7,9,10 en paralelo; 8 tras 3)  →  (merge)
         →  Tanda 3 (12 → 13; 14; 15; 11 al final)      →  (merge)
         →  Tanda 4 (16)
```

Tras cada rama terminada: resumen (qué se hizo, rama, link al PR) y **esperar
aprobación del humano** antes de la siguiente tanda.

> **Estado: las 4 tandas están mergeadas en `main`.** PRs de cierre extra:
> #13 (consolidación de la Tanda 2 a `main`), #14 (scaffold Tanda 3).

---

## Pendiente (fuera del alcance de estas tandas)

- **Assets reales**: todas las imágenes son `<PlaceholderImage>`. Faltan las
  fotos optimizadas (WebP/AVIF), los renders planos de producto, y los dos
  vectores del logotipo (rojo grafiti / negro script). Ver `docs/ASSETS.md`.
- **Backend**: newsletter, login ("Iniciar sesión con shop" / opciones), y
  "Pedidos / Perfil" son solo UI — llevan comentarios `TODO` en el código.
- **Códigos de marca**: los tokens de color en `globals.css` están muestreados
  de las capturas; sustituir por los hex oficiales.
