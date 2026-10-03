import type * as T from "../types";

/** Imagen de relleno (SVG embebido) para no depender de recursos externos. */
export const ph = (label: string, hue = 0, w = 600, h = 750): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},12%,16%)'/><stop offset='1' stop-color='hsl(${hue},30%,32%)'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='50%' fill='rgba(255,255,255,.7)' font-family='sans-serif' font-size='${Math.round(w / 14)}' font-weight='700' text-anchor='middle'>${label.replace(/[<>&']/g, "")}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const daysAgo = (d: number, h = 0): string => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();
export const DEPARTMENTS = ["Amazonas","Antioquia","Arauca","Atlántico","Bogotá D.C.","Bolívar","Boyacá","Caldas","Caquetá","Casanare","Cauca","Cesar","Chocó","Córdoba","Cundinamarca","Guainía","Guaviare","Huila","La Guajira","Magdalena","Meta","Nariño","Norte de Santander","Putumayo","Quindío","Risaralda","San Andrés y Providencia","Santander","Sucre","Tolima","Valle del Cauca","Vaupés","Vichada"];

const PRODUCT_DEFS: [string, string, number, number | undefined, string, string[]][] = [
  ["Camiseta Oversize Classic", "Camisetas", 129000, undefined, "active", ["oversize", "algodon", "basicos"]],
  ["Hoodie Dept. Heavyweight", "Hoodies", 249000, 289000, "active", ["hoodie", "invierno", "heavyweight"]],
  ["Cargo Pants Utility", "Pantalones", 219000, undefined, "active", ["cargo", "utility"]],
  ["Gorra Dad Hat Red", "Accesorios", 89000, undefined, "active", ["gorra", "accesorios"]],
  ["Chaqueta Coach Nylon", "Chaquetas", 329000, 369000, "active", ["chaqueta", "nylon"]],
  ["Camiseta Graphic Vol. 2", "Camisetas", 139000, undefined, "draft", ["graphic", "nuevo"]],
  ["Shorts Mesh Court", "Shorts", 119000, undefined, "active", ["shorts", "verano"]],
  ["Tote Bag Canvas", "Accesorios", 59000, undefined, "archived", ["tote", "accesorios"]],
  ["Buzo Crewneck Washed", "Hoodies", 199000, undefined, "active", ["crewneck", "washed"]],
  ["Beanie Rib Knit", "Accesorios", 69000, undefined, "active", ["beanie", "invierno"]],
];

const SIZES = ["S", "M", "L", "XL"];
export const seedProducts = (): T.Product[] =>
  PRODUCT_DEFS.map(([title, type, price, compare, status, tags], i) => {
    const sized = type !== "Accesorios";
    const handle = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-$/g, "");
    const values = sized ? SIZES : ["Única"];
    return {
      id: `prd_${i + 1}`, handle, title, type, status: status as T.ProductStatus, tags, vendor: i % 3 === 0 ? "Daregular Dept." : i % 3 === 1 ? "Dept. Studio" : "Taller Medellín",
      description: `**${title}** — pieza de la colección actual. Confeccionada en Colombia con materiales de alta calidad.\n\n- Corte relajado\n- Lavado a máquina en frío\n- Hecho en Medellín`,
      seoTitle: `${title} | Daregular Dept.`, seoDescription: `Compra ${title} en Daregular Dept. Envíos a toda Colombia.`,
      options: [{ name: sized ? "Talla" : "Modelo", values }],
      variants: values.map((v, k) => ({ id: `var_${i + 1}_${k + 1}`, title: v, options: [v], price, compareAt: compare, sku: `DEPT-${(i + 1).toString().padStart(3, "0")}-${v}`, weight: 350, barcode: `770${i}${k}00012`, tracked: true, backorder: false, stock: (i * 7 + k * 5) % 23 })),
      images: [0, 1, 2].map((n) => ({ id: `img_${i + 1}_${n}`, url: ph(`${title.split(" ")[0]} ${n + 1}`, (i * 37 + n * 12) % 360), alt: `${title} vista ${n + 1}` })),
      metafields: [{ key: "material", value: "100% algodón" }],
      updatedAt: daysAgo(i + 1),
    };
  });

export const seedCollections = (): T.Collection[] => [
  { id: "col_1", handle: "novedades", title: "Novedades", description: "Lo último en llegar.", kind: "smart", published: true, productIds: [], rules: [{ field: "tag", op: "equals", value: "nuevo" }], match: "any", sort: "newest", image: ph("Novedades", 10, 800, 500), seoTitle: "Novedades", seoDescription: "Lo último de Daregular Dept.", metafields: [] },
  { id: "col_2", handle: "hoodies", title: "Hoodies", description: "Capas para el frío.", kind: "manual", published: true, productIds: ["prd_2", "prd_9"], rules: [], match: "all", sort: "manual", image: ph("Hoodies", 200, 800, 500), seoTitle: "Hoodies", seoDescription: "Hoodies y buzos.", metafields: [] },
  { id: "col_3", handle: "accesorios", title: "Accesorios", description: "Gorras, beanies y más.", kind: "smart", published: true, productIds: [], rules: [{ field: "type", op: "equals", value: "Accesorios" }], match: "all", sort: "best-selling", image: ph("Accesorios", 300, 800, 500), seoTitle: "Accesorios", seoDescription: "Gorras y accesorios.", metafields: [] },
  { id: "col_4", handle: "verano-2026", title: "Verano 2026", description: "Cápsula de temporada.", kind: "manual", published: false, productIds: ["prd_7", "prd_1"], rules: [], match: "all", sort: "manual", image: ph("Verano", 40, 800, 500), seoTitle: "Verano 2026", seoDescription: "Cápsula de verano.", metafields: [] },
];

export const seedLocations = (): T.Location[] => [
  { id: "loc_1", name: "Bodega Medellín", city: "Medellín", active: true },
  { id: "loc_2", name: "Tienda Bogotá", city: "Bogotá", active: true },
];

const NAMES = ["Valentina Ríos", "Santiago Gómez", "Camila Restrepo", "Juan Pablo Ortiz", "Mariana López", "Andrés Cardona", "Laura Mejía", "Felipe Duarte", "Daniela Vargas", "Sebastián Torres", "Isabella Herrera", "Mateo Ramírez"];
const CITIES: [string, string][] = [["Medellín", "Antioquia"], ["Bogotá", "Bogotá D.C."], ["Cali", "Valle del Cauca"], ["Barranquilla", "Atlántico"], ["Bucaramanga", "Santander"], ["Cartagena", "Bolívar"]];
const addr = (name: string, i: number): T.Address => ({ name, line1: `Calle ${10 + i} # ${20 + i}-${30 + i}`, line2: i % 2 ? "Apto 502" : undefined, city: CITIES[i % 6][0], department: CITIES[i % 6][1], phone: `+57 300 ${1000000 + i * 13579}`.slice(0, 15) });

export const seedCustomers = (): T.Customer[] =>
  NAMES.map((name, i) => ({
    id: `cus_${i + 1}`, name, email: `${name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${i}@correo.co`, phone: addr(name, i).phone,
    tags: i % 4 === 0 ? ["vip"] : i % 5 === 0 ? ["mayorista"] : [], note: i % 3 === 0 ? "Prefiere entrega en horario de oficina." : "", marketing: i % 3 !== 2,
    ordersCount: 1 + (i % 5), totalSpent: (1 + (i % 5)) * 187000, createdAt: daysAgo(90 - i * 6), addresses: [addr(name, i)], anonymized: false,
  }));

const FIN: T.FinancialStatus[] = ["paid", "paid", "pending", "paid", "refund-pending", "paid", "partially-refunded", "paid", "refunded", "paid", "pending", "paid"];
const FUL: T.FulfillmentStatus[] = ["unfulfilled", "fulfilled", "unfulfilled", "partial", "unfulfilled", "fulfilled", "fulfilled", "unfulfilled", "cancelled", "fulfilled", "unfulfilled", "unfulfilled"];
export const seedOrders = (products: T.Product[], customers: T.Customer[]): T.Order[] =>
  Array.from({ length: 24 }, (_, i) => {
    const c = customers[i % customers.length];
    const lines: T.OrderLine[] = [0, 1].slice(0, 1 + (i % 2)).map((n) => {
      const p = products[(i + n * 3) % products.length];
      const v = p.variants[(i + n) % p.variants.length];
      const fulfilled = FUL[i % 12] === "fulfilled" ? 1 + (i % 2) : FUL[i % 12] === "partial" ? 1 : 0;
      return { id: `ln_${i}_${n}`, title: p.title, variant: v.title, sku: v.sku, qty: 1 + (i % 2), price: v.price, fulfilledQty: Math.min(fulfilled, 1 + (i % 2)), refundedQty: 0, image: p.images[0].url };
    });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const shipping = subtotal > 300000 ? 0 : 12000;
    const discount = i % 6 === 0 ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal + shipping - discount;
    const fin = FIN[i % 12], ful = FUL[i % 12];
    const at = daysAgo(Math.floor(i / 2), (i * 5) % 24);
    return {
      id: `ord_${i + 1}`, number: 1042 - i, createdAt: at, customer: { id: c.id, name: c.name, email: c.email, phone: c.phone },
      financial: fin, fulfillment: ful, lines, shippingAddress: c.addresses[0], billingAddress: c.addresses[0],
      subtotal, shipping, tax: 0, discount, total, paymentMethod: i % 3 === 0 ? "Nequi" : i % 3 === 1 ? "Tarjeta" : "PSE",
      discountCode: discount ? "BIENVENIDO10" : undefined,
      payments: fin === "pending" ? [] : [{ id: `pay_${i}`, method: i % 3 === 0 ? "Nequi" : "Tarjeta", amount: total, at, ref: `WOMPI-${10000 + i}` }],
      shipments: ful === "fulfilled" || ful === "partial" ? [{ id: `shp_${i}`, carrier: "Servientrega", tracking: `SV${900000 + i * 31}`, lineIds: lines.filter((l) => l.fulfilledQty).map((l) => ({ lineId: l.id, qty: l.fulfilledQty })), status: "active", createdAt: at }] : [],
      refunds: fin === "refunded" || fin === "partially-refunded" ? [{ id: `ref_${i}`, amount: fin === "refunded" ? total : lines[0].price, reason: "Talla incorrecta", restock: true, createdAt: at, lineIds: [] }] : [],
      timeline: [{ id: `ev_${i}_1`, at, text: "Pedido creado desde la tienda", actor: "Sistema" }, ...(fin !== "pending" ? [{ id: `ev_${i}_2`, at, text: `Pago recibido (${i % 3 === 0 ? "Nequi" : "Tarjeta"})`, actor: "Wompi" }] : [])],
      notes: i % 4 === 0 ? [{ id: `nt_${i}`, text: "Cliente pidió empaque de regalo.", at, author: "Laura (soporte)" }] : [],
      tags: i % 5 === 0 ? ["regalo"] : i % 7 === 0 ? ["prioridad"] : [],
    };
  });

export const seedDiscounts = (): T.Discount[] => [
  { id: "dsc_1", code: "BIENVENIDO10", kind: "percentage", value: 10, active: true, minSubtotal: 0, usageLimit: null, perCustomer: true, startsAt: daysAgo(60), endsAt: null, used: 48, redemptions: [{ orderNumber: 1042, customer: "Valentina Ríos", amount: 12900, at: daysAgo(1) }, { orderNumber: 1036, customer: "Laura Mejía", amount: 21900, at: daysAgo(4) }] },
  { id: "dsc_2", code: "ENVIOGRATIS", kind: "free-shipping", value: 0, active: true, minSubtotal: 200000, usageLimit: 500, perCustomer: false, startsAt: daysAgo(30), endsAt: daysAgo(-30), used: 112, redemptions: [] },
  { id: "dsc_3", code: "DEPT20K", kind: "fixed", value: 20000, active: false, minSubtotal: 150000, usageLimit: 100, perCustomer: true, startsAt: daysAgo(120), endsAt: daysAgo(10), used: 100, redemptions: [] },
];

export const seedZones = (): T.ShippingZone[] => [
  { id: "zn_1", name: "Ciudades principales", departments: ["Antioquia", "Bogotá D.C.", "Valle del Cauca", "Atlántico"], rates: [{ id: "rt_1", name: "Estándar", price: 12000, freeOver: 300000, eta: "2–4 días" }, { id: "rt_2", name: "Express", price: 22000, freeOver: null, eta: "24 h" }] },
  { id: "zn_2", name: "Resto del país", departments: ["Santander", "Bolívar", "Boyacá", "Cundinamarca", "Tolima", "Huila"], rates: [{ id: "rt_3", name: "Estándar", price: 18000, freeOver: 400000, eta: "4–7 días" }] },
];

export const seedSubscribers = (): T.Subscriber[] =>
  Array.from({ length: 18 }, (_, i) => ({ id: `sub_${i}`, email: `suscriptor${i}@correo.co`, status: i % 7 === 0 ? "unsubscribed" : "subscribed", source: i % 2 ? "footer" : "checkout", createdAt: daysAgo(i * 3) }));

export const seedMessages = (): T.ContactMessage[] => [
  { id: "msg_1", name: "Carolina Pérez", email: "caro@correo.co", subject: "Cambio de talla", body: "Hola, compré el hoodie en M y me queda grande. ¿Puedo cambiarlo por S?", status: "new", createdAt: daysAgo(0, 3) },
  { id: "msg_2", name: "Julián Mora", email: "julian@correo.co", subject: "¿Envían a San Andrés?", body: "Quisiera saber si hacen envíos a San Andrés y cuánto demoran.", status: "read", createdAt: daysAgo(1) },
  { id: "msg_3", name: "Paula Díaz", email: "paula@correo.co", subject: "Pedido #1031", body: "Mi pedido llegó incompleto, faltaba la gorra.", status: "replied", createdAt: daysAgo(3) },
  { id: "msg_4", name: "Esteban Cruz", email: "esteban@correo.co", subject: "Mayoristas", body: "Me interesa comprar al por mayor, ¿tienen lista de precios?", status: "archived", createdAt: daysAgo(9) },
];

export const seedEmailTemplates = (): T.EmailTemplate[] => [
  { id: "em_1", key: "order-confirmation", name: "Confirmación de pedido", subject: "Tu pedido {{order.number}} está confirmado", html: "<h1>¡Gracias, {{customer.name}}!</h1><p>Recibimos tu pedido {{order.number}} por {{order.total}}.</p>", text: "Gracias, {{customer.name}}. Recibimos tu pedido {{order.number}} por {{order.total}}.", variables: ["customer.name", "order.number", "order.total", "store.name"] },
  { id: "em_2", key: "shipping-update", name: "Pedido enviado", subject: "Tu pedido {{order.number}} va en camino", html: "<h1>¡Va en camino!</h1><p>Guía: {{shipment.tracking}} ({{shipment.carrier}}).</p>", text: "Tu pedido va en camino. Guía {{shipment.tracking}}.", variables: ["customer.name", "order.number", "shipment.tracking", "shipment.carrier"] },
  { id: "em_3", key: "password-reset", name: "Restablecer contraseña", subject: "Restablece tu contraseña", html: "<p>Usa este enlace: {{link}}</p>", text: "Usa este enlace: {{link}}", variables: ["customer.name", "link"] },
];

export const ALL_PERMISSIONS = ["staff:read", "staff:write", "roles:read", "roles:write", "audit:read", "settings:read", "settings:write", "products:read", "products:write", "collections:read", "collections:write", "inventory:read", "inventory:write", "orders:read", "orders:write", "customers:read", "customers:write", "content:read", "content:write", "content:publish", "media:write", "discounts:read", "discounts:write", "shipping:read", "shipping:write", "marketing:read", "marketing:write", "import:read", "import:write", "analytics:read"];
export const seedRoles = (): T.Role[] => {
  const nw = ALL_PERMISSIONS.filter((p) => p !== "roles:write");
  return [
    { key: "owner", name: "Propietario", description: "Acceso total.", permissions: ALL_PERMISSIONS },
    { key: "admin", name: "Administrador", description: "Todo excepto editar roles.", permissions: nw },
    { key: "editor", name: "Editor", description: "Contenido, productos y colecciones.", permissions: ["content:read", "content:write", "content:publish", "media:write", "products:read", "products:write", "collections:read", "collections:write", "inventory:read"] },
    { key: "fulfillment", name: "Logística", description: "Pedidos e inventario.", permissions: ["orders:read", "orders:write", "inventory:read", "inventory:write", "shipping:read"] },
    { key: "support", name: "Soporte", description: "Atención al cliente.", permissions: ["orders:read", "customers:read", "marketing:read"] },
    { key: "analyst", name: "Analista", description: "Solo lectura.", permissions: ALL_PERMISSIONS.filter((p) => p.endsWith(":read")) },
  ];
};
export const seedStaff = (): T.Staff[] => [
  { id: "stf_1", name: "Propietario Dept.", email: "owner@daregulardept.com", role: "owner", active: true, twoFactor: true, lastLogin: daysAgo(0, 1) },
  { id: "stf_2", name: "Laura Soporte", email: "laura@daregulardept.com", role: "support", active: true, twoFactor: false, lastLogin: daysAgo(1) },
  { id: "stf_3", name: "Camilo Bodega", email: "camilo@daregulardept.com", role: "fulfillment", active: true, twoFactor: false, lastLogin: daysAgo(2) },
  { id: "stf_4", name: "Sofía Contenido", email: "sofia@daregulardept.com", role: "editor", active: false, twoFactor: false, lastLogin: null },
];

export const seedAudit = (): T.AuditEntry[] => sortAudit([
  ...Array.from({ length: 14 }, (_, i): T.AuditEntry => ({ id: `au_g${i}`, at: daysAgo(4 + i), actor: i % 2 ? "camilo@daregulardept.com" : "owner@daregulardept.com", action: i % 3 === 0 ? "order.fulfill" : i % 3 === 1 ? "discount.update" : "customer.update", entity: i % 3 === 0 ? "order" : i % 3 === 1 ? "discount" : "customer", entityId: `x_${i}`, before: { status: "a" }, after: { status: "b" }, ip: "190.24.1.10" })),
  { id: "au_1", at: daysAgo(0, 1), actor: "owner@daregulardept.com", action: "product.update", entity: "product", entityId: "prd_2", before: { price: 229000, status: "draft" }, after: { price: 249000, status: "active" }, ip: "190.24.1.10" },
  { id: "au_2", at: daysAgo(0, 4), actor: "laura@daregulardept.com", action: "order.note", entity: "order", entityId: "ord_1", before: null, after: { note: "Cliente pidió empaque de regalo." }, ip: "181.52.8.3" },
  { id: "au_3", at: daysAgo(1), actor: "owner@daregulardept.com", action: "content.publish", entity: "template", entityId: "home", before: { version: 4 }, after: { version: 5 }, ip: "190.24.1.10" },
  { id: "au_4", at: daysAgo(2), actor: "camilo@daregulardept.com", action: "inventory.adjust", entity: "variant", entityId: "var_1_2", before: { stock: 10 }, after: { stock: 14 }, ip: "186.80.4.77" },
  { id: "au_5", at: daysAgo(3), actor: "owner@daregulardept.com", action: "staff.create", entity: "staff", entityId: "stf_4", before: null, after: { email: "sofia@daregulardept.com", role: "editor" }, ip: "190.24.1.10" },
]);
const sortAudit = (l: T.AuditEntry[]): T.AuditEntry[] => l.sort((a, b) => b.at.localeCompare(a.at));

export const seedImports = (): T.ImportJob[] => [
  { id: "imp_1", kind: "products", file: "products_export.csv", dryRun: false, status: "done", total: 120, processed: 120, errors: [] },
  { id: "imp_2", kind: "customers", file: "customers.csv", dryRun: true, status: "failed", total: 40, processed: 40, errors: [{ row: 7, message: "Correo inválido" }, { row: 19, message: "Teléfono con formato incorrecto" }] },
];

export const seedRedirects = (): T.Redirect[] => [
  { id: "rd_1", from: "/products/hoodie-viejo", to: "/products/hoodie-dept-heavyweight", permanent: true, hits: 214 },
  { id: "rd_2", from: "/sale", to: "/collections/novedades", permanent: false, hits: 37 },
];

export const seedMedia = (): T.MediaItem[] =>
  ["hero-home", "campana-otono", "lookbook-1", "lookbook-2", "logo-dept", "banner-envios", "editorial-taller", "og-default"].map((name, i) => ({
    id: `med_${i + 1}`, url: ph(name, (i * 47) % 360, 800, 600), alt: name.replace(/-/g, " "), name: `${name}.jpg`, size: 180000 + i * 91000, type: "image/jpeg", createdAt: daysAgo(i * 4),
    usages: i < 3 ? [{ kind: "template", label: "Inicio" }] : i === 4 ? [{ kind: "settings", label: "Ajustes · logo" }] : [],
  }));

/* ---------------- Contenido ---------------- */
const F = (key: string, label: string, type: T.SchemaField["type"], extra: Partial<T.SchemaField> = {}): T.SchemaField => ({ key, label, type, ...extra });
const common = {
  heading: F("heading", "Título", "string", { max: 300, required: true }),
  cta: F("ctaLabel", "Texto del botón", "string", { max: 60 }),
  ctaHref: F("ctaHref", "Enlace del botón", "url"),
  align: F("alignment", "Alineación", "enum", { options: ["left", "center", "right"] }),
  image: F("imageUrl", "Imagen", "image", { required: true }),
  alt: F("imageAlt", "Texto alternativo", "string", { max: 300 }),
};
export const SECTION_TYPES: T.SectionType[] = [
  { type: "announcement-bar", label: "Barra de anuncio", settings: [F("text", "Texto", "string", { max: 300 }), F("href", "Enlace", "url"), F("backgroundColor", "Color de fondo", "color"), F("textColor", "Color del texto", "color"), F("dismissible", "Se puede cerrar", "boolean")], blockTypes: [] },
  { type: "hero", label: "Hero", settings: [F("eyebrow", "Antetítulo", "string", { max: 100 }), common.heading, F("subheading", "Subtítulo", "text", { max: 300 }), common.image, common.alt, F("mobileImageUrl", "Imagen móvil", "image"), common.cta, common.ctaHref, F("secondaryCtaLabel", "Botón secundario", "string", { max: 60 }), F("secondaryCtaHref", "Enlace secundario", "url"), F("overlayOpacity", "Opacidad del velo", "number", { min: 0, maxValue: 1 }), common.align, F("height", "Altura", "enum", { options: ["medium", "large", "full"] })], blockTypes: [] },
  { type: "marquee", label: "Marquesina de texto", settings: [F("speed", "Velocidad", "enum", { options: ["slow", "normal", "fast"] }), F("backgroundColor", "Color de fondo", "color"), F("textColor", "Color del texto", "color")], blockTypes: [{ type: "item", label: "Texto", fields: [F("text", "Texto", "string", { max: 120, required: true })] }], maxBlocks: 20 },
  { type: "new-arrivals", label: "Novedades", settings: [common.heading, F("subheading", "Subtítulo", "text", { max: 300 }), F("collectionHandle", "Colección", "collection", { required: true }), F("limit", "Cantidad", "number", { min: 1, maxValue: 24 }), F("columns", "Columnas", "enum", { options: ["2", "3", "4"] }), common.cta, common.ctaHref], blockTypes: [] },
  { type: "split-banner", label: "Banner dividido", settings: [common.heading, F("text", "Texto", "text", { max: 300 }), common.image, common.alt, F("imagePosition", "Posición de la imagen", "enum", { options: ["left", "right"] }), common.cta, common.ctaHref, F("backgroundColor", "Color de fondo", "color")], blockTypes: [] },
  { type: "value-props", label: "Propuestas de valor", settings: [F("heading", "Título", "string", { max: 300 }), F("columns", "Columnas", "enum", { options: ["2", "3", "4"] })], blockTypes: [{ type: "item", label: "Ítem", fields: [F("icon", "Icono", "enum", { options: ["truck", "shield", "refresh", "credit-card", "heart", "star", "gift", "chat", "leaf", "clock"] }), F("title", "Título", "string", { max: 80, required: true }), F("text", "Texto", "text", { max: 300 })] }], maxBlocks: 8 },
  { type: "campaign", label: "Campaña", settings: [F("eyebrow", "Antetítulo", "string", { max: 100 }), common.heading, F("text", "Texto", "text", { max: 300 }), common.image, common.alt, F("collectionHandle", "Colección", "collection"), common.cta, common.ctaHref, common.align], blockTypes: [] },
  { type: "editorial", label: "Editorial", settings: [common.heading, F("body", "Contenido (Markdown)", "markdown", { max: 5000, required: true }), F("imageUrl", "Imagen", "image"), common.alt, F("layout", "Diseño", "enum", { options: ["text-only", "image-left", "image-right"] })], blockTypes: [] },
  { type: "lookbook", label: "Lookbook", settings: [F("heading", "Título", "string", { max: 300 }), F("layout", "Diseño", "enum", { options: ["grid", "carousel"] })], blockTypes: [{ type: "photo", label: "Foto", fields: [F("imageUrl", "Imagen", "image", { required: true }), F("alt", "Texto alternativo", "string", { max: 300, required: true }), F("caption", "Pie de foto", "string", { max: 200 }), F("productHandle", "Producto", "product")] }], maxBlocks: 24 },
  { type: "newsletter", label: "Boletín", settings: [common.heading, F("text", "Texto", "text", { max: 300 }), F("placeholder", "Placeholder", "string", { max: 80 }), F("buttonLabel", "Texto del botón", "string", { max: 60 }), F("successMessage", "Mensaje de éxito", "string", { max: 200 }), F("backgroundColor", "Color de fondo", "color")], blockTypes: [] },
  { type: "rich-text", label: "Texto enriquecido", settings: [F("heading", "Título", "string", { max: 300 }), F("body", "Contenido (Markdown)", "markdown", { max: 5000, required: true }), common.align, F("maxWidth", "Ancho máximo", "enum", { options: ["narrow", "normal", "wide"] })], blockTypes: [] },
  { type: "footer", label: "Pie de página", settings: [F("showNewsletter", "Mostrar boletín", "boolean"), F("showSocial", "Mostrar redes", "boolean"), F("copyright", "Copyright", "string", { max: 200 }), F("backgroundColor", "Color de fondo", "color")], blockTypes: [{ type: "column", label: "Columna", fields: [F("title", "Título", "string", { max: 60, required: true }), F("links", "Enlaces", "links")] }], maxBlocks: 6 },
];

const sec = (id: string, type: string, settings: Record<string, T.JsonValue>, blocks?: T.Section["blocks"]): T.Section => ({ id, type, enabled: true, settings, blocks });
const homeSections = (): T.Section[] => [
  sec("s_ann", "announcement-bar", { text: "Envío gratis en compras superiores a $300.000", href: "/collections/novedades", backgroundColor: "#d10000", textColor: "#ffffff", dismissible: false }),
  sec("s_hero", "hero", { eyebrow: "Colección Otoño", heading: "Hecho para los que no siguen reglas", subheading: "Piezas heavyweight diseñadas en Medellín.", imageUrl: ph("hero-home", 0, 800, 600), imageAlt: "Modelo con hoodie", ctaLabel: "Comprar ahora", ctaHref: "/collections/novedades", overlayOpacity: 0.25, alignment: "left", height: "large" }),
  sec("s_marq", "marquee", { speed: "normal", backgroundColor: "#000000", textColor: "#ffffff" }, [{ id: "b1", type: "item", settings: { text: "DAREGULAR DEPT." } }, { id: "b2", type: "item", settings: { text: "HECHO EN COLOMBIA" } }]),
  sec("s_new", "new-arrivals", { heading: "Novedades", subheading: "Lo último en llegar", collectionHandle: "novedades", limit: 8, columns: "4", ctaLabel: "Ver todo", ctaHref: "/collections/novedades" }),
  sec("s_vp", "value-props", { heading: "Por qué Dept.", columns: "3" }, [{ id: "v1", type: "item", settings: { icon: "truck", title: "Envíos a todo el país", text: "En 2–4 días hábiles." } }, { id: "v2", type: "item", settings: { icon: "refresh", title: "Cambios fáciles", text: "30 días para cambiar tu talla." } }, { id: "v3", type: "item", settings: { icon: "shield", title: "Pago seguro", text: "Tarjeta, PSE y Nequi." } }]),
  sec("s_nl", "newsletter", { heading: "Únete al Dept.", text: "Drops y descuentos antes que nadie.", placeholder: "Tu correo", buttonLabel: "Suscribirme", backgroundColor: "#111111" }),
];

export const seedContent = (): T.ContentDoc[] => {
  const mk = (kind: T.DocKind, key: string, title: string, content: T.JsonValue, o: Partial<T.ContentDoc> = {}): T.ContentDoc => ({
    kind, key, title, draft: content, published: content, version: 3, dirty: false, scheduledAt: null, publishedAt: daysAgo(2),
    versions: [{ id: `${key}_v3`, number: 3, at: daysAgo(2), actor: "owner@daregulardept.com", content, label: "Publicado" }, { id: `${key}_v2`, number: 2, at: daysAgo(9), actor: "sofia@daregulardept.com", content: content, label: "Publicado" }], ...o,
  });
  const settings = { brand: { name: "Daregular Dept.", tagline: "Streetwear hecho en Colombia", logoMediaUrl: ph("logo-dept", 0, 400, 200) }, theme: { colors: { background: "#000000", foreground: "#ffffff", accent: "#d10000", muted: "#8a8a8a", border: "#2a2a2a" }, fonts: { heading: "Inter", body: "Inter" } }, seo: { titleTemplate: "%s | Daregular Dept.", defaultDescription: "Streetwear hecho en Colombia.", ogImageUrl: ph("og-default", 0, 1200, 630) }, social: { instagram: "https://instagram.com/daregulardept", tiktok: "https://tiktok.com/@daregulardept", facebook: "", youtube: "", pinterest: "", x: "" }, announcement: { enabled: true, text: "Envío gratis en compras superiores a $300.000", href: "/collections/novedades" }, store: { currency: "COP", locale: "es-CO", contactEmail: "hola@daregulardept.com", whatsapp: "+573001234567" } } satisfies T.JsonValue;
  const mainMenu: T.MenuItem[] = [{ id: "m1", label: "Novedades", link: { type: "collection", handle: "novedades" } }, { id: "m2", label: "Ropa", link: { type: "url", url: "/collections/all" }, children: [{ id: "m2a", label: "Hoodies", link: { type: "collection", handle: "hoodies" } }, { id: "m2b", label: "Camisetas", link: { type: "collection", handle: "camisetas" } }] }, { id: "m3", label: "Accesorios", link: { type: "collection", handle: "accesorios" } }, { id: "m4", label: "Nosotros", link: { type: "page", handle: "nosotros" } }];
  const footerMenu: T.MenuItem[] = [{ id: "f1", label: "Envíos", link: { type: "page", handle: "envios" } }, { id: "f2", label: "Cambios y devoluciones", link: { type: "page", handle: "cambios" } }];
  const tpl = (sections: T.Section[]): T.JsonValue => ({ sections } as unknown as T.JsonValue);
  const home = homeSections();
  return [
    mk("settings", "main", "Ajustes y tema", settings as T.JsonValue),
    mk("menu", "main", "Menú principal", { items: mainMenu } as unknown as T.JsonValue),
    mk("menu", "footer", "Menú del pie", { items: footerMenu } as unknown as T.JsonValue),
    mk("template", "home", "Inicio", tpl(home), { dirty: true, draft: tpl([...home.slice(0, 5), sec("s_lb", "lookbook", { heading: "Lookbook", layout: "grid" }, [{ id: "p1", type: "photo", settings: { imageUrl: ph("lookbook-1", 20), alt: "Look 1", caption: "Look 1" } }]), home[5]]) }),
    mk("template", "collection", "Colección", tpl([sec("c_h", "rich-text", { heading: "Colección", body: "Explora nuestras piezas.", alignment: "left", maxWidth: "normal" })])),
    mk("template", "product", "Producto", tpl([sec("p_vp", "value-props", { heading: "", columns: "3" }, [{ id: "pv1", type: "item", settings: { icon: "truck", title: "Envío rápido", text: "2–4 días" } }])])),
    mk("template", "cart", "Carrito", tpl([]), { dirty: false }),
    mk("template", "search", "Búsqueda", tpl([])),
    mk("template", "404", "Página 404", tpl([sec("e_h", "rich-text", { heading: "Página no encontrada", body: "Lo que buscas no existe.", alignment: "center", maxWidth: "narrow" })]), { scheduledAt: daysAgo(-3) }),
    mk("page", "nosotros", "Nosotros", tpl([sec("n_e", "editorial", { heading: "Nuestra historia", body: "Nacimos en **Medellín** en 2019.\n\nHacemos ropa para quienes no siguen reglas.", imageUrl: ph("editorial-taller", 30, 800, 600), imageAlt: "Taller", layout: "image-right" })]), { seoTitle: "Nosotros", seoDescription: "Conoce la historia de Daregular Dept." }),
    mk("page", "envios", "Envíos", tpl([sec("v_r", "rich-text", { heading: "Envíos", body: "Enviamos a todo el país con Servientrega.", alignment: "left", maxWidth: "normal" })]), { seoTitle: "Envíos", seoDescription: "Información de envíos." }),
    mk("page", "cambios", "Cambios y devoluciones", tpl([sec("c_r", "rich-text", { heading: "Cambios", body: "Tienes 30 días para cambiar tu prenda.", alignment: "left", maxWidth: "normal" })]), { published: null, publishedAt: null, versions: [], version: 0, dirty: true, seoTitle: "Cambios", seoDescription: "" }),
  ];
};

export const salesByDay = (): { day: string; value: number; prev: number }[] =>
  Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 864e5);
    const base = 800000 + Math.round(Math.sin(i / 3) * 250000) + (i % 7 === 5 ? 400000 : 0);
    return { day: d.toISOString().slice(0, 10), value: base + i * 12000, prev: Math.round(base * 0.85) };
  });
