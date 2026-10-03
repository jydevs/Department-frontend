"use client";

import { useSyncExternalStore } from "react";
import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Sesión de cliente contra la API (`/api/v1/storefront/customers/*`).
 *
 * - El token de acceso vive SOLO en memoria (variable de módulo); la sesión persiste con la cookie httpOnly `dept_ct`,
 *   que se rota en `POST /refresh` al cargar la página (bootstrap) y cuando una petición responde 401.
 * - Store externo + `useSyncExternalStore` (como `lib/cart.ts`): el primer pintado es siempre `loading`.
 */

export interface Customer {
  id: string; email: string; firstName: string; lastName: string; phone: string | null;
  acceptsMarketing: boolean; emailVerified: boolean; createdAt: string;
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
  /** `loading` hasta resolver el refresh inicial */
  status: "loading" | "anonymous" | "authenticated";
  customer: Customer | null;
}

const SERVER: AccountState = { status: "loading", customer: null };
let state: AccountState = SERVER;
let accessToken: string | null = null;
let started = false;
const listeners = new Set<() => void>();
const BASE = "/storefront/customers";

function set(next: AccountState) {
  state = next;
  listeners.forEach((l) => l());
}
const anonymous = () => { accessToken = null; set({ status: "anonymous", customer: null }); };

let refreshing: Promise<boolean> | null = null;
/** Rota la cookie y obtiene un token nuevo. Una sola petición en vuelo (la cookie rota en cada llamada). */
function refresh(): Promise<boolean> {
  refreshing ??= apiFetch<{ accessToken: string }>(`${BASE}/refresh`, { method: "POST", credentials: true })
    .then((r) => { accessToken = r.accessToken; return true; })
    .catch(() => { accessToken = null; return false; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

/** Petición autenticada: ante un 401 intenta refrescar UNA vez y reintenta; si no se puede, cierra la sesión local. */
async function authed<T>(path: string, opts: Omit<ApiFetchOptions, "token" | "credentials"> = {}): Promise<T> {
  if (!accessToken && !(await refresh())) { anonymous(); throw new ApiError({ statusCode: 401, error: "Unauthorized", code: "UNAUTHORIZED", message: "Sesión no iniciada" }); }
  try {
    return await apiFetch<T>(`${BASE}${path}`, { ...opts, token: accessToken });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    if (!(await refresh())) { anonymous(); throw e; }
    return apiFetch<T>(`${BASE}${path}`, { ...opts, token: accessToken });
  }
}

async function bootstrap() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!(await refresh())) return anonymous();
  try {
    set({ status: "authenticated", customer: await authed<Customer>("/me") });
  } catch {
    anonymous();
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  void bootstrap();
  return () => { listeners.delete(l); };
}

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

/* ── autenticación ── */

export async function login(email: string, password: string): Promise<Customer> {
  const r = await apiFetch<{ accessToken: string; customer: Customer }>(`${BASE}/login`, { method: "POST", body: { email: email.trim(), password }, credentials: true });
  accessToken = r.accessToken;
  started = true;
  set({ status: "authenticated", customer: r.customer });
  return r.customer;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch(`${BASE}/logout`, { method: "POST", credentials: true });
  } finally {
    anonymous();
  }
}

/** Siempre 202: no revela si el correo ya existe. */
export const register = (input: RegisterInput) => apiFetch<{ message: string }>(`${BASE}/register`, { method: "POST", body: { ...input, email: input.email.trim(), firstName: input.firstName.trim(), lastName: input.lastName.trim() } });
export const forgotPassword = (email: string) => apiFetch<{ message: string }>(`${BASE}/forgot-password`, { method: "POST", body: { email: email.trim() } });
export async function resetPassword(token: string, password: string) {
  const r = await apiFetch<{ message: string }>(`${BASE}/reset-password`, { method: "POST", body: { token, password }, credentials: true });
  anonymous();
  return r;
}
/** El enlace del correo demuestra la propiedad del buzón: verificar también FIJA la contraseña. */
export async function verifyEmail(token: string, password: string) {
  const r = await apiFetch<{ message: string }>(`${BASE}/verify-email`, { method: "POST", body: { token, password }, credentials: true });
  anonymous();
  return r;
}

/* ── cuenta ── */

export async function updateProfile(patch: Partial<Pick<Customer, "firstName" | "lastName" | "phone" | "acceptsMarketing">>): Promise<Customer> {
  const c = await authed<Customer>("/me", { method: "PATCH", body: patch });
  set({ status: "authenticated", customer: c });
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
export const getOrder = (orderNumber: number | string) => authed<import("@/lib/api/types").ApiPublicOrder>(`/me/orders/${orderNumber}`);
