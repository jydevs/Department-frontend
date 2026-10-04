"use client";

import { useSyncExternalStore } from "react";
import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ApiPublicOrder } from "@/lib/api/types";

/**
 * Sesión de cliente contra la API (`/api/v1/storefront/customers/*`).
 *
 * - El token de acceso vive SOLO en memoria (variable de módulo); la sesión persiste con la cookie httpOnly `dept_ct`,
 *   que se rota en `POST /refresh`. Como esa cookie no se puede leer desde JS, tras iniciar sesión se guarda un
 *   indicio (`dept-has-session` en localStorage) para decidir si vale la pena intentar el refresh al cargar:
 *   así un visitante anónimo no genera un 401 en la consola en cada página.
 * - Un 401 significa "no hay sesión"; un fallo de red o un 5xx NO cierran la sesión (estado `unavailable`).
 * - Store externo + `useSyncExternalStore` (como `lib/cart.ts`): el primer pintado es siempre `loading`.
 */

export interface Customer {
  id: string; email: string; firstName: string; lastName: string; phone: string | null;
  acceptsMarketing: boolean; emailVerified: boolean; isStaff?: boolean; createdAt: string;
}
export interface CustomerAddress {
  id: string; label: string | null; isDefault: boolean; fullName: string; phone: string; department: string; city: string;
  address1: string; address2: string | null; postalCode: string | null; documentType: string | null; documentNumber: string | null;
}
export interface AddressInput {
  label?: string | null; isDefault?: boolean; fullName: string; phone: string; department: string; city: string; address1: string;
  address2?: string; postalCode?: string; documentType?: "CC" | "CE" | "NIT" | "PP"; documentNumber?: string;
}
export interface OrderSummary {
  orderNumber: number; status: string; paymentStatus: string; fulfillmentStatus: string; currency: string; total: number; itemCount: number; createdAt: string;
}
export interface OrderPage { items: OrderSummary[]; total: number; page: number; pageSize: number; totalPages: number }
export interface RegisterInput { email: string; password: string; firstName: string; lastName: string; acceptsMarketing?: boolean }

export interface AccountState {
  /** `loading` hasta resolver el refresh inicial; `unavailable`: no se pudo comprobar la sesión (red / servidor) */
  status: "loading" | "anonymous" | "authenticated" | "unavailable";
  customer: Customer | null;
  /** aviso pendiente de mostrar (p. ej. el cierre de sesión no llegó al servidor) */
  notice: string | null;
}

const SERVER: AccountState = { status: "loading", customer: null, notice: null };
let state: AccountState = SERVER;
let accessToken: string | null = null;
let started = false;
/** Sube con cada cambio definitivo de sesión (login / logout / 401): un bootstrap viejo no puede pisar un login posterior. */
let generation = 0;
const listeners = new Set<() => void>();
const BASE = "/storefront/customers";

const HAS_SESSION_KEY = "dept-has-session";
type SessionHint = "1" | "logout-pending" | null;
function readHint(): SessionHint {
  try {
    const v = window.localStorage.getItem(HAS_SESSION_KEY);
    return v === "1" || v === "logout-pending" ? v : null;
  } catch {
    return null;
  }
}
function writeHint(v: SessionHint) {
  try {
    if (v) window.localStorage.setItem(HAS_SESSION_KEY, v);
    else window.localStorage.removeItem(HAS_SESSION_KEY);
  } catch {
    /* almacenamiento bloqueado */
  }
}

function set(next: AccountState) {
  state = next;
  listeners.forEach((l) => l());
}
function anonymous(notice: string | null = null) {
  generation++;
  accessToken = null;
  writeHint(null);
  set({ status: "anonymous", customer: null, notice });
}

let refreshing: Promise<string> | null = null;
/** Rota la cookie y obtiene un token nuevo. Una sola petición en vuelo (la cookie rota en cada llamada). Lanza `ApiError`. */
function refresh(): Promise<string> {
  refreshing ??= apiFetch<{ accessToken: string }>(`${BASE}/refresh`, { method: "POST", credentials: true })
    .then((r) => {
      accessToken = r.accessToken;
      return r.accessToken;
    })
    .catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 401) accessToken = null;
      throw e;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

/**
 * Petición autenticada. Ante un 401 renueva el token UNA vez (si otra petición ya lo renovó mientras tanto, usa ese)
 * y reintenta; si sigue sin autorizar, cierra la sesión local. Un fallo de red o un 5xx se propaga sin cerrar la sesión.
 */
async function authed<T>(path: string, opts: Omit<ApiFetchOptions, "token" | "credentials"> = {}): Promise<T> {
  const gen = generation;
  const closeIfCurrent = () => {
    if (gen === generation) anonymous();
  };
  if (!accessToken) {
    try {
      await refresh();
    } catch (e) {
      if (isUnauthorized(e)) closeIfCurrent();
      throw e;
    }
  }
  const used = accessToken;
  try {
    return await apiFetch<T>(`${BASE}${path}`, { ...opts, token: used });
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
    try {
      if (accessToken === used || !accessToken) await refresh();
    } catch (r) {
      if (isUnauthorized(r)) closeIfCurrent();
      throw r;
    }
    try {
      return await apiFetch<T>(`${BASE}${path}`, { ...opts, token: accessToken });
    } catch (e2) {
      if (isUnauthorized(e2)) closeIfCurrent();
      throw e2;
    }
  }
}

/** Token de acceso actual (solo memoria), para cabeceras opcionales como la del checkout. */
export const getAccessToken = (): string | null => accessToken;

async function finishPendingLogout() {
  if (await postLogout()) writeHint(null);
  generation++;
  set({ status: "anonymous", customer: null, notice: null });
}

async function bootstrap() {
  if (started || typeof window === "undefined") return;
  started = true;
  await Promise.resolve(); // nunca de forma síncrona dentro de `subscribe` (fase de commit)
  const gen = generation;
  const hint = readHint();
  if (hint === null) {
    // sin indicio de sesión: no se llama a /refresh (evita el 401 del anónimo)
    set({ status: "anonymous", customer: null, notice: null });
    return;
  }
  if (hint === "logout-pending") return void finishPendingLogout();
  try {
    await refresh();
    const customer = await apiFetch<Customer>(`${BASE}/me`, { token: accessToken });
    if (gen !== generation) return; // un login/logout posterior manda
    set({ status: "authenticated", customer, notice: null });
  } catch (e) {
    if (gen !== generation) return;
    if (isUnauthorized(e)) anonymous();
    else set({ status: "unavailable", customer: null, notice: null }); // red / 5xx: la sesión puede seguir viva
  }
}

/** Reintenta comprobar la sesión (tras un fallo de red / servidor). */
export function retrySession() {
  started = false;
  set({ status: "loading", customer: null, notice: state.notice });
  void bootstrap();
}

/** Aviso de cierre de sesión ya mostrado. */
export function clearAccountNotice() {
  if (state.notice) set({ ...state, notice: null });
}

let storageBound = false;
function onStorage(e: StorageEvent) {
  if (e.key !== HAS_SESSION_KEY && e.key !== null) return;
  const hint = readHint();
  if (hint === null && state.status === "authenticated") {
    // cerró sesión en otra pestaña
    generation++;
    accessToken = null;
    set({ status: "anonymous", customer: null, notice: null });
  } else if (hint === "1" && state.status === "anonymous") {
    // inició sesión en otra pestaña
    started = false;
    void bootstrap();
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!storageBound) {
    storageBound = true;
    window.addEventListener("storage", onStorage);
  }
  void bootstrap();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && storageBound) {
      storageBound = false;
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

/* ── autenticación ── */

export async function login(email: string, password: string): Promise<Customer> {
  const r = await apiFetch<{ accessToken: string; customer: Customer }>(`${BASE}/login`, { method: "POST", body: { email: email.trim(), password }, credentials: true });
  generation++;
  accessToken = r.accessToken;
  started = true;
  writeHint("1");
  set({ status: "authenticated", customer: r.customer, notice: null });
  return r.customer;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `POST /logout` con un reintento; un 4xx significa que no había sesión en el servidor (cuenta como hecho). */
async function postLogout(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await apiFetch(`${BASE}/logout`, { method: "POST", credentials: true });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429) return true;
      if (attempt === 0) await sleep(800);
    }
  }
  return false;
}

/**
 * Cierra la sesión: el estado local se limpia de inmediato y luego se avisa al servidor (con un reintento).
 * Devuelve `false` si el servidor no confirmó (la cookie podría seguir viva): `state.notice` lo explica y se vuelve a
 * intentar al cargar la próxima página.
 */
export async function logout(): Promise<boolean> {
  anonymous();
  writeHint("logout-pending");
  const ok = await postLogout();
  if (ok) writeHint(null);
  else set({ ...state, notice: "No pudimos cerrar tu sesión en el servidor por un problema de conexión. Cerramos la sesión en este navegador y lo volveremos a intentar; si compartes este equipo, vuelve a cerrar sesión cuando tengas conexión." });
  return ok;
}

/** Siempre 202: no revela si el correo ya existe. */
export const register = (input: RegisterInput) => apiFetch<{ message: string }>(`${BASE}/register`, { method: "POST", body: { ...input, email: input.email.trim(), firstName: input.firstName.trim(), lastName: input.lastName.trim() } });
export const forgotPassword = (email: string) => apiFetch<{ message: string }>(`${BASE}/forgot-password`, { method: "POST", body: { email: email.trim() } });
export async function resetPassword(token: string, password: string) {
  const r = await apiFetch<{ message: string }>(`${BASE}/reset-password`, { method: "POST", body: { token, password }, credentials: true });
  anonymous();
  return r;
}
/** El enlace del correo demuestra la propiedad del buzón: verificar también FIJA la contraseña (y cierra todas las sesiones). */
export async function verifyEmail(token: string, password: string) {
  const r = await apiFetch<{ message: string }>(`${BASE}/verify-email`, { method: "POST", body: { token, password }, credentials: true });
  anonymous();
  return r;
}

/* ── cuenta ── */

export async function updateProfile(patch: Partial<Pick<Customer, "firstName" | "lastName" | "phone" | "acceptsMarketing">>): Promise<Customer> {
  const c = await authed<Customer>("/me", { method: "PATCH", body: patch });
  set({ status: "authenticated", customer: c, notice: null });
  return c;
}
/** Cierra TODAS las sesiones: el cliente debe iniciar sesión de nuevo. */
export async function changePassword(currentPassword: string, newPassword: string) {
  const r = await authed<{ message: string }>("/me/change-password", { method: "POST", body: { currentPassword, newPassword } });
  anonymous();
  return r;
}
export const listAddresses = () => authed<CustomerAddress[]>("/me/addresses");
export const createAddress = (a: AddressInput) => authed<CustomerAddress>("/me/addresses", { method: "POST", body: a });
export const updateAddress = (id: string, a: Partial<AddressInput>) => authed<CustomerAddress>(`/me/addresses/${id}`, { method: "PATCH", body: a });
export const deleteAddress = (id: string) => authed<void>(`/me/addresses/${id}`, { method: "DELETE" });
export const listOrders = (page = 1, pageSize = 20) => authed<OrderPage>("/me/orders", { query: { page, pageSize } });
export const getOrder = (orderNumber: number | string) => authed<ApiPublicOrder>(`/me/orders/${orderNumber}`);

/** Habeas Data: todos mis datos personales (perfil, direcciones, pedidos, sesiones…). */
export const exportMyData = () => authed<Record<string, unknown>>("/me/data-export", { method: "POST" });
/** Anonimiza la cuenta tras confirmar la contraseña; cierra la sesión local. */
export async function deleteMyAccount(password: string): Promise<void> {
  await authed<{ message: string }>("/me", { method: "DELETE", body: { password } });
  anonymous();
}
