import { apiBase } from "@/lib/api/config";
import type { ApiRedirect } from "@/lib/api/types";

/**
 * CMS redirects (`GET /storefront/redirects`) for the proxy (`src/proxy.ts`).
 *
 * - Cached in memory for 60 s PER INSTANCE (a revalidation webhook does not reach it: a change shows up within a minute).
 * - FAILS OPEN: if the API is down or takes longer than 1.5 s, the request simply continues (the stale list is kept
 *   while there is one) – a redirect is never worth blocking a page for. A failure is remembered for 10 s so an
 *   outage does not add the timeout to every request.
 */

export interface RedirectRule {
  to: string;
  status: 301 | 302;
}

const TTL_MS = 60_000;
const FAILURE_BACKOFF_MS = 10_000;
const TIMEOUT_MS = 1500;
const MAX_RULES = 5000;

let rules: Map<string, RedirectRule> = new Map();
let validUntil = 0;
let inflight: Promise<void> | null = null;

/** Same normalisation the backend applies to `from`: lowercase, collapsed slashes, no trailing slash. */
export function normalizeRequestPath(pathname: string): string {
  let p = pathname.toLowerCase().replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.length === 0 ? "/" : p;
}

function isInternalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\s\u0000-\u001f]/.test(value);
}

/** Keeps only well-formed rules: `from` = `/…`, `to` = `/…` or `https://…`, status 301 / 302. */
export function parseRules(list: unknown): Map<string, RedirectRule> {
  const map = new Map<string, RedirectRule>();
  if (!Array.isArray(list)) return map;
  for (const raw of list.slice(0, MAX_RULES) as Partial<ApiRedirect>[]) {
    if (!raw || typeof raw.from !== "string" || typeof raw.to !== "string") continue;
    if (!isInternalPath(raw.from)) continue;
    const to = raw.to.trim();
    const internalTarget = isInternalPath(to);
    if (!internalTarget && !(to.startsWith("https://") && !/[\s\u0000-\u001f]/.test(to))) continue;
    const from = normalizeRequestPath(raw.from);
    if (internalTarget && normalizeRequestPath(to.split(/[?#]/)[0]) === from) continue; // self-redirect
    map.set(from, { to, status: raw.status === 302 ? 302 : 301 });
  }
  return map;
}

async function refresh(): Promise<void> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.STOREFRONT_SERVER_KEY) headers["X-Storefront-Key"] = process.env.STOREFRONT_SERVER_KEY;
    const res = await fetch(`${apiBase()}/storefront/redirects`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`redirects ${res.status}`);
    rules = parseRules(await res.json());
    validUntil = Date.now() + TTL_MS;
  } catch {
    // keep whatever list we had (possibly empty) and retry soon
    validUntil = Date.now() + FAILURE_BACKOFF_MS;
  }
}

/** The redirect registered for this path, or null (also when the API is unavailable). */
export async function findRedirect(pathname: string): Promise<RedirectRule | null> {
  if (Date.now() >= validUntil) {
    inflight ??= refresh().finally(() => {
      inflight = null;
    });
    await inflight;
  }
  return rules.get(normalizeRequestPath(pathname)) ?? null;
}
