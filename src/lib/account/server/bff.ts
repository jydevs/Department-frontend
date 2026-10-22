import "server-only";
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MARGIN_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "../config";
import { errorMessage } from "../errors";
import type { BffError } from "../types";
import { csrfViolation } from "./csrf";
import { upstream, type UpstreamResult } from "./upstream";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 64 * 1024;

/* ── responses ───────────────────────────────────────────── */

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(data, { status, headers: { ...NO_STORE, ...headers } });
}

export function fail(status: number, code: string, extra: Partial<BffError> = {}): NextResponse {
  const body: BffError = { code, message: extra.message ?? errorMessage(code, status), ...extra };
  const headers: Record<string, string> = {};
  if (extra.retryAfter) headers["Retry-After"] = String(extra.retryAfter);
  return json(body, status, headers);
}

/** Turns a failed API answer into the error the browser gets. Upstream messages are English: the UI shows its own copy. */
export function errorFrom(up: UpstreamResult): NextResponse {
  if (up.status === 0 || up.status >= 500) return fail(503, "SERVICE_UNAVAILABLE");
  const body = (up.body ?? {}) as { code?: unknown; details?: unknown };
  const code = typeof body.code === "string" ? body.code : up.status === 429 ? "RATE_LIMITED" : up.status === 401 ? "UNAUTHORIZED" : "BAD_REQUEST";
  const extra: Partial<BffError> = {};
  if (Array.isArray(body.details)) {
    const fields: Record<string, string[]> = {};
    for (const item of body.details as { path?: unknown; message?: unknown }[]) {
      if (typeof item?.path !== "string" || typeof item?.message !== "string") continue;
      (fields[item.path] ??= []).push(item.message);
    }
    if (Object.keys(fields).length > 0) extra.fields = fields;
  }
  if (up.retryAfter) extra.retryAfter = up.retryAfter;
  return fail(up.status, code, extra);
}

/* ── cookies ─────────────────────────────────────────────── */

const secure = (): boolean => process.env.NODE_ENV === "production";

export interface SessionTokens {
  accessToken: string;
  expiresIn: number;
  /** null: the API reused a token rotated <20 s ago and sent no new cookie; the browser keeps the one it has */
  refreshToken: string | null;
}

/** httpOnly cookies, never readable by page scripts. Path `/` so every page and every BFF route receives them. */
export function setSessionCookies(res: NextResponse, tokens: SessionTokens): void {
  const base = { httpOnly: true, secure: secure(), sameSite: "lax" as const, path: "/" };
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: Math.max(30, tokens.expiresIn - ACCESS_COOKIE_MARGIN_SECONDS),
  });
  if (tokens.refreshToken) res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS });
}

export function clearSessionCookies(res: NextResponse): void {
  const base = { httpOnly: true, secure: secure(), sameSite: "lax" as const, path: "/", maxAge: 0 };
  res.cookies.set(ACCESS_COOKIE, "", base);
  res.cookies.set(REFRESH_COOKIE, "", base);
}

/* ── request guards ──────────────────────────────────────── */

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

type Handler = (req: NextRequest, body: Record<string, unknown>, ctx: RouteContext) => Promise<NextResponse>;

/** Reads a JSON object body (≤ 64 KB). Returns null when it is not one. */
async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return null;
    if (text.trim() === "") return {};
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Mutations: CSRF guard + JSON body. Reads (GET) skip both. */
export function guarded(handler: Handler): (req: NextRequest, ctx: RouteContext) => Promise<NextResponse> {
  return async (req, ctx) => {
    if (req.method !== "GET") {
      const violation = csrfViolation(req);
      if (violation) return fail(403, violation);
    }
    const body = req.method === "GET" ? {} : await readBody(req);
    if (!body) return fail(400, "BAD_REQUEST");
    return handler(req, body, ctx);
  };
}

/** Copies only `keys` (and only primitives) so nothing the browser invents reaches the API. */
export function pick(body: Record<string, unknown>, keys: readonly string[]): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of keys) {
    const v = body[key];
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[key] = v;
  }
  return out;
}

/* ── refresh (single flight) ─────────────────────────────── */

export type RefreshOutcome = { kind: "ok"; tokens: SessionTokens } | { kind: "invalid" } | { kind: "unavailable" };

const REUSE_WINDOW_MS = 15_000;
const inflight = new Map<string, Promise<RefreshOutcome>>();

/**
 * Rotates the refresh token. The API treats a second use of an already-rotated token as theft and kills the whole
 * session, so simultaneous requests carrying the SAME cookie (several fetches while the access token expired) must
 * share ONE rotation: the result is kept for a few seconds so every request that still carries the old cookie gets
 * the same new pair.
 */
export function refreshSession(req: Request, refreshToken: string): Promise<RefreshOutcome> {
  const key = createHash("sha256").update(refreshToken).digest("hex");
  const existing = inflight.get(key);
  if (existing) return existing;

  const run = (async (): Promise<RefreshOutcome> => {
    const up = await upstream("/storefront/customers/refresh", { method: "POST", refreshToken, req });
    const body = (up.body ?? {}) as { accessToken?: unknown; expiresIn?: unknown };
    // 200/201 with an access token is a success; a missing Set-Cookie is the API's 20 s grace for a concurrent refresh
    // (the winning request already left the new cookie in the browser), not an error
    if (up.status >= 200 && up.status < 300 && typeof body.accessToken === "string") {
      const expiresIn = typeof body.expiresIn === "number" ? body.expiresIn : 900;
      return { kind: "ok", tokens: { accessToken: body.accessToken, expiresIn, refreshToken: up.refreshCookie } };
    }
    if (up.status === 0 || up.status >= 500 || up.status === 429) return { kind: "unavailable" };
    return { kind: "invalid" };
  })();

  inflight.set(key, run);
  const timer = setTimeout(() => inflight.delete(key), REUSE_WINDOW_MS);
  timer.unref?.();
  void run.then((outcome) => {
    if (outcome.kind === "unavailable") {
      clearTimeout(timer);
      inflight.delete(key);
    }
  });
  return run;
}

/* ── authenticated calls ─────────────────────────────────── */

interface SessionOptions {
  /** the call ends every session (password changed, account deleted): drop the cookies on success */
  endsSession?: boolean;
  /** HTTP status to answer on success (defaults to the API's) */
  successStatus?: number;
  /** transforms the API body before answering */
  map?: (body: unknown) => unknown;
  headers?: Record<string, string>;
}

/**
 * Runs `call` with the customer's access token.
 *  - No access cookie but a refresh cookie → rotates first (transparent refresh).
 *  - 401 with a refresh cookie not yet used in this request → rotates once and retries.
 *  - Refresh refused → cookies are cleared and the answer is 401 SESSION_EXPIRED.
 * New cookies are propagated on the response; tokens never appear in the body.
 */
export async function withSession(
  req: NextRequest,
  call: (accessToken: string) => Promise<UpstreamResult>,
  options: SessionOptions = {},
): Promise<NextResponse> {
  let access = req.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value ?? null;
  let rotated: SessionTokens | null = null;

  const rotate = async (): Promise<NextResponse | "invalid" | null> => {
    if (!refresh) return null;
    const outcome = await refreshSession(req, refresh);
    if (outcome.kind === "unavailable") return fail(503, "SERVICE_UNAVAILABLE");
    if (outcome.kind === "invalid") return "invalid";
    rotated = outcome.tokens;
    access = outcome.tokens.accessToken;
    return null;
  };
  const expired = (): NextResponse => {
    const res = fail(401, "SESSION_EXPIRED");
    clearSessionCookies(res);
    return res;
  };

  if (!access) {
    if (!refresh) return fail(401, "UNAUTHORIZED");
    const r = await rotate();
    if (r === "invalid") return expired();
    if (r) return r;
  }

  let up = await call(access as string);
  if (up.status === 401 && refresh && !rotated) {
    const r = await rotate();
    if (r === "invalid") return expired();
    if (r) return r;
    up = await call(access as string);
  }
  if (up.status === 401) return expired();

  let res: NextResponse;
  if (up.status >= 200 && up.status < 300) {
    const status = options.successStatus ?? up.status;
    if (status === 204) res = new NextResponse(null, { status, headers: { ...NO_STORE, ...options.headers } });
    else res = json(options.map ? options.map(up.body) : up.body, status, options.headers);
    if (options.endsSession) clearSessionCookies(res);
    else if (rotated) setSessionCookies(res, rotated);
  } else {
    res = errorFrom(up);
    if (rotated) setSessionCookies(res, rotated);
  }
  return res;
}

/**
 * Access token of the customer for a call that also works without a session (checkout as guest). It never fails the
 * request: no session, a refused refresh or an unavailable API all mean "guest". When it had to rotate, `rotated` holds
 * the new tokens and the caller must put them on its response with `setSessionCookies` so the cookies are not lost.
 */
export async function optionalSession(req: NextRequest): Promise<{ accessToken: string | null; rotated: SessionTokens | null }> {
  const access = req.cookies.get(ACCESS_COOKIE)?.value ?? null;
  if (access) return { accessToken: access, rotated: null };
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value ?? null;
  if (!refresh) return { accessToken: null, rotated: null };
  const outcome = await refreshSession(req, refresh);
  if (outcome.kind !== "ok") return { accessToken: null, rotated: null };
  return { accessToken: outcome.tokens.accessToken, rotated: outcome.tokens };
}

/** Whether the visitor carries any session cookie (server components: cheap check, no API call). */
export function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(ACCESS_COOKIE)?.value || req.cookies.get(REFRESH_COOKIE)?.value);
}
