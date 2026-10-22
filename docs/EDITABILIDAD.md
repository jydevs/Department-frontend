# Editabilidad de la tienda desde el panel `/admin`

Qué se ve en la tienda y dónde se cambia. Rutas del panel relativas a `/admin`.
Contenido = documentos del CMS (`settings/site`, `template/*`, `page/*`, `menu/*`); catálogo = productos y colecciones.
Los campos de imagen del CMS (`ImageField`) aceptan una URL (`https://…` o `/ruta`) o **Elegir de la biblioteca** (subir / elegir en Biblioteca de medios).

Verificado con puppeteer (dev, BD scratch, 22-oct-2026): cambiar desde el panel y publicar/guardar se refleja en la tienda para
el hero (biblioteca), la imagen del editorial (URL), el logotipo, la imagen de la colección `men`, una imagen nueva en la galería
de `samo-hoodie`, el texto del logotipo dibujado, el favicon, la textura de grano, «Añadir rápido» y el total del carrito.
El contenido del CMS se refleja al instante (webhook de revalidación); el **catálogo tarda hasta ~60 s** (caché de datos, sin webhook).

## Imágenes

| Elemento visible | Dónde se edita | Campo |
| --- | --- | --- |
| Logotipo de la cabecera (imagen) | Contenido › Ajustes y tema › Marca | `brand.logoMediaUrl` «Logotipo (imagen)» |
| Logotipo dibujado (sin imagen, texto «Dept») | Ajustes y tema › Marca | `brand.logoText` «Texto del logotipo dibujado» |
| Variante del logotipo (rojo / negro) | Contenido › Plantillas › Cabecera y pie › Cabecera del sitio | `logoVariant` |
| Favicon (icono de la pestaña) | Ajustes y tema › Marca | `brand.faviconMediaUrl` (vacío → `/favicon.svg` incluido) |
| Imagen al compartir en redes (og-image de la portada y páginas) | Ajustes y tema › SEO | `seo.ogImageUrl` (vacío → foto del hero de Inicio). Título/antetítulo del cartel: `brand.tagline` y `announcement.text`; color de la franja: `theme.colors.accent` |
| og-image de un producto | Catálogo › Productos › (producto) › Medios | primera imagen del producto (+ título y precio) |
| og-image de una colección | Catálogo › Colecciones › (colección) › Imagen | imagen de la colección |
| Hero de Inicio (foto + foto móvil) | Plantillas › Inicio › Hero | `imageUrl`, `mobileImageUrl`, `imageAlt`, capa `overlayColor`/`overlayOpacity` |
| Banner «New Arrivals» | Plantillas › Inicio › Novedades | `imageUrl`, `imageAlt` |
| Tarjetas de colección Women / Men | Plantillas › Inicio › Banner dividido › Elementos (mosaicos) | `imageUrl`, `imageAlt`, `label`, `collectionHandle` |
| Imagen del editorial / manifiesto | Plantillas › Inicio › Editorial | `imageUrl`, `imageAlt`, `imageBadge` |
| Fondo de la campaña (opcional) | Plantillas › Inicio › Campaña | `imageUrl` |
| Fotos de productos (tarjetas, hover = 2.ª foto, galería de la ficha, búsqueda, carrito) | Catálogo › Productos › (producto) › Medios | orden = primera foto principal; «Añadir imágenes», arrastrar para reordenar, texto alternativo |
| Cabecera de colección (`/collections/x`) | Catálogo › Colecciones › (colección) › Imagen | imagen de la colección; si no tiene: Plantillas › Colección › Cabecera de colección › `imageUrl` |
| Lookbook de Community (10 fotos) | Contenido › Páginas › Community › Lookbook › Elementos | `imageUrl`, `alt`, `caption`, `aspect`, `productHandle` |
| Imágenes de cualquier página nueva | Contenido › Páginas › (página) | secciones hero / editorial / lookbook / banner… |
| Textura de grano sobre toda la tienda | Ajustes y tema › Tema | interruptor «Textura de grano» (`theme.grain`) |
| Iconos de las propuestas de valor | Plantillas › Inicio › Propuestas de valor › Elementos | `icon` (lista cerrada de 13 iconos) |

## Textos, enlaces, menús, tema

| Elemento visible | Dónde se edita |
| --- | --- |
| Nombre de marca, eslogan, descripción | Ajustes y tema › Marca |
| Colores (fondo, texto, acento y matices, grises) y tipografías | Ajustes y tema › Tema (vista previa en vivo) |
| Título y descripción SEO por defecto, plantilla del `<title>` | Ajustes y tema › SEO |
| Redes sociales del pie, correo de contacto, WhatsApp | Ajustes y tema › Redes / Tienda |
| Barra de anuncios (frases, enlace, colores, velocidad, activar) | Ajustes y tema › Anuncios |
| Menú principal (cabecera y menú móvil) | Contenido › Menús › Menú principal |
| Menú del pie (columna «Tienda») | Contenido › Menús › Menú del pie de página |
| Etiquetas y accesibilidad de la cabecera (Buscar, Cuenta, Carrito, menú móvil, contador de productos) | Plantillas › Cabecera y pie › Cabecera del sitio |
| Newsletter (titular, textos, botón, mensajes) | Plantillas › Cabecera y pie › Boletín |
| Pie (frase de marca, texto, columnas de enlaces, columna Cuenta, columna Legal, wordmark gigante, copyright, texto inferior, «volver arriba») | Plantillas › Cabecera y pie › Pie de página |
| Secciones de Inicio (hero, marquesina, novedades, banner, campaña, editorial, valores): textos, botones, enlaces, orden, visibilidad | Plantillas › Inicio |
| Cabecera de colección (antetítulo, contador, pestañas) y filtros/orden/vacío/«Ver más»/etiquetas de tarjetas | Plantillas › Colección |
| Título y descripción de cada colección / producto, precios, tallas | Catálogo › Colecciones / Productos |
| Ficha de producto (migas, Talla, Cantidad, botones, avisos, barra fija) y «Te puede interesar» | Plantillas › Producto |
| Panel de búsqueda (textos, sugerencias, nº de populares) | Plantillas › Búsqueda |
| Carrito lateral (títulos, vacío, botones, subtotal, descuento, envío, IVA, total, nota de IVA, aviso de no disponible, caja de código de descuento) | Plantillas › Carrito |
| Página 404 (código, marquesina, textos y botones) | Plantillas › Error 404 |
| Community, Contacto (formulario: etiquetas y mensajes), páginas legales | Contenido › Páginas |
| Redirecciones de URL | Contenido › Redirecciones |
| Correos transaccionales | Marketing › Plantillas de correo |

## Lo que queda NO editable (y por qué)

| Elemento | Motivo |
| --- | --- |
| Área de cliente (`/account/*`: login, registro, recuperar contraseña, pedidos, direcciones, privacidad), panel desplegable de Cuenta de la cabecera | Microcopia funcional y mensajes de validación/seguridad; habría que crear un diccionario de textos (i18n) en el CMS. Pendiente si se quiere. |
| Checkout (`/checkout`, resultado, pasarela simulada) y estado de pedido (`/orders/x`) | Igual: textos transaccionales ligados a validaciones y estados del pedido. La caja de descuento del checkout usa los textos por defecto del carrito. |
| Páginas de confirmación/baja del newsletter | Textos funcionales del flujo de doble opt-in. |
| Página de error inesperado (`error.tsx`, «Algo salió mal») | Es el límite de error de React: debe pintarse sin depender de la API/CMS (puede ser justo lo que falló). |
| 404 de respaldo | Solo se usa si la API no responde; el 404 normal es `template/404` (editable). |
| Avisos del carrito devueltos por la API (stock, código inválido…) | Vienen del backend (`src/lib/cart/messages.ts` los traduce); son mensajes de error, no contenido. |
| Textos solo para lectores de pantalla («Precio:», «Migas de pan», «Cerrar aviso»…) | Accesibilidad interna; no se ven. |
| Forma del logotipo dibujado (fuente script, inclinación) | Es el sustituto del logo vectorial; se cambia subiendo una imagen en `brand.logoMediaUrl` (y la fuente decorativa en Tema). |
| Patrón de la textura de grano (SVG en `globals.css`) | Decorativo; solo se puede activar/desactivar. |
| Diseño/maquetación de cada sección (tamaños, espaciados, animaciones) | Es código; el panel elige secciones, su orden, variantes y opciones previstas. |
| Moneda (COP) e idioma (es-CO) | Fijos por diseño de la tienda. |

## Bases ya sembradas

Los campos nuevos (`brand.logoText`, `brand.faviconMediaUrl`, `theme.grain`, etiquetas de tarjetas, «Ver más», textos del carrito)
se añaden solos a una base existente al arrancar la API o con `yarn content:seed` (`ensureEditableDefaults` en el backend):
solo si faltan, con el valor que la tienda ya mostraba, sin tocar lo editado. Si un documento no los tiene, la tienda usa
esos mismos valores por defecto, así que el aspecto no cambia en ningún caso.
