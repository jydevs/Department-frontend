import type * as T from "../types";
import * as S from "./seed";

/** Base de datos simulada en memoria (se reinicia al recargar la página). */
interface Db {
  products: T.Product[]; collections: T.Collection[]; locations: T.Location[]; adjustments: T.StockAdjustment[];
  customers: T.Customer[]; orders: T.Order[]; discounts: T.Discount[]; zones: T.ShippingZone[]; taxRate: number; taxIncluded: boolean;
  subscribers: T.Subscriber[]; messages: T.ContactMessage[]; emails: T.EmailTemplate[];
  roles: T.Role[]; staff: T.Staff[]; audit: T.AuditEntry[]; imports: T.ImportJob[];
  redirects: T.Redirect[]; media: T.MediaItem[]; content: T.ContentDoc[];
  maintenance: { ranAt: string; summary: string }[];
}
let _db: Db | null = null;
export const db = (): Db => {
  if (_db) return _db;
  const products = S.seedProducts(), customers = S.seedCustomers();
  _db = {
    products, collections: S.seedCollections(), locations: S.seedLocations(), adjustments: [], customers, orders: S.seedOrders(products, customers),
    discounts: S.seedDiscounts(), zones: S.seedZones(), taxRate: 19, taxIncluded: true, subscribers: S.seedSubscribers(), messages: S.seedMessages(),
    emails: S.seedEmailTemplates(), roles: S.seedRoles(), staff: S.seedStaff(), audit: S.seedAudit(), imports: S.seedImports(),
    redirects: S.seedRedirects(), media: S.seedMedia(), content: S.seedContent(), maintenance: [],
  };
  return _db;
};

export const sleep = (ms = 220): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** Ejecuta `fn` tras una latencia simulada. */
export async function wait<R>(fn: () => R, ms = 220): Promise<R> {
  await sleep(ms);
  return fn();
}
export function paginate<I>(items: I[], page: number, pageSize: number): T.Page<I> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize, totalPages };
}
export const nid = (p: string): string => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const now = (): string => new Date().toISOString();
