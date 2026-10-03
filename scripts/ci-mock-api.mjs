#!/usr/bin/env node
// API simulada mínima SOLO para el build de CI (no hay backend en CI). Contesta "vacío"/404 a las lecturas del catálogo
// y del CMS que `next build` hace al prerenderizar, de modo que la tienda se construye con sus valores por defecto.
// Uso: node scripts/ci-mock-api.mjs [puerto=4010]   →   API_URL=http://127.0.0.1:4010 yarn build
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 4010);
const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const notFound = (res, path) => send(res, 404, { statusCode: 404, error: "Not Found", code: "NOT_FOUND", message: `Mock CI: ${path}` });

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://mock");
  const path = pathname.replace(/^\/api\/v1/, "");
  if (path === "/ready") return send(res, 200, { status: "ready" });
  if (path === "/storefront/products") return send(res, 200, { items: [], nextCursor: null, hasMore: false });
  if (["/storefront/collections", "/storefront/content/pages", "/storefront/redirects"].includes(path)) return send(res, 200, []);
  return notFound(res, path);
}).listen(port, "127.0.0.1", () => console.log(`Mock API de CI escuchando en :${port}`));
