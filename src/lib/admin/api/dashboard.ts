"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged } from "@/lib/admin/query";
import type { OrderSummary } from "@/lib/admin/api/orders";

/* Tipos (analytics/dto/analytics.dto.ts). Todo el dinero son COP enteros. */

export interface AnalyticsPeriod {
  from: string;
  to: string;
}

export interface OverviewMetrics {
  grossSales: number;
  totalRefunded: number;
  netSales: number;
  paidOrders: number;
  averageOrderValue: number;
  newCustomers: number;
  createdOrders: number;
  createdOrdersPaid: number;
  createdOrdersExpired: number;
  createdOrdersCancelled: number;
  paidRate: number;
  expiredRate: number;
  cancelledRate: number;
}

/** Variación porcentual vs. periodo anterior (null si el anterior era 0). */
export interface OverviewChange {
  netSales: number | null;
  paidOrders: number | null;
  averageOrderValue: number | null;
  newCustomers: number | null;
  paidRate: number | null;
}

export interface AnalyticsOverview {
  timezone: string;
  period: AnalyticsPeriod;
  previousPeriod: AnalyticsPeriod;
  current: OverviewMetrics;
  previous: OverviewMetrics;
  change: OverviewChange;
}

export type GroupBy = "day" | "week" | "month";

export interface SalesBucket {
  bucket: string;
  orders: number;
  grossSales: number;
  totalRefunded: number;
  netSales: number;
}

export interface AnalyticsSales {
  timezone: string;
  groupBy: GroupBy;
  period: AnalyticsPeriod;
  buckets: SalesBucket[];
}

export interface TopProduct {
  productId: string;
  title: string;
  units: number;
  revenue: number;
  orders: number;
}

export interface AnalyticsTopProducts {
  period: AnalyticsPeriod;
  sortBy: "revenue" | "units";
  items: TopProduct[];
}

export interface AnalyticsCustomers {
  timezone: string;
  groupBy: GroupBy;
  period: AnalyticsPeriod;
  newCustomers: number;
  totalCustomers: number;
  marketingSubscribers: number;
  buyers: number;
  repeatBuyers: number;
  guestOrders: number;
  series: Array<{ bucket: string; newCustomers: number }>;
}

export interface LowStockLevel {
  id: string;
  variantId: string;
  variantTitle: string;
  variantSku: string | null;
  productTitle: string | null;
  locationId: string;
  locationName: string;
  onHand: number;
  reserved: number;
  lowStock: boolean;
}

export const PERIOD_OPTIONS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIOD_OPTIONS)[number];

/* Fechas en America/Bogota (UTC-5, sin horario de verano). `to` del API es el día completo inclusive. */

const DAY_MS = 86_400_000;

function bogotaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function shiftDay(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Rango [hoy-(n-1), hoy] en fechas de Bogotá. */
export function periodRange(days: number): { from: string; to: string } {
  const to = bogotaToday();
  return { from: shiftDay(to, -(days - 1)), to };
}

/* Consultas. Prefijo ["dashboard"] para invalidar todo el panel de una vez. */

export function useOverview(days: number, enabled = true) {
  const range = periodRange(days);
  return useQuery<AnalyticsOverview, ApiError>({
    queryKey: ["dashboard", "overview", days, range.to],
    queryFn: ({ signal }) => api.get<AnalyticsOverview>("/admin/analytics/overview", { query: range, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSales(days: number, groupBy: GroupBy, enabled = true) {
  const range = periodRange(days);
  return useQuery<AnalyticsSales, ApiError>({
    queryKey: ["dashboard", "sales", days, groupBy, range.to],
    queryFn: ({ signal }) => api.get<AnalyticsSales>("/admin/analytics/sales", { query: { ...range, groupBy }, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTopProducts(days: number, sortBy: "revenue" | "units", enabled = true) {
  const range = periodRange(days);
  return useQuery<AnalyticsTopProducts, ApiError>({
    queryKey: ["dashboard", "top-products", days, sortBy, range.to],
    queryFn: ({ signal }) => api.get<AnalyticsTopProducts>("/admin/analytics/top-products", { query: { ...range, sortBy, limit: 5 }, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCustomerStats(days: number, enabled = true) {
  const range = periodRange(days);
  return useQuery<AnalyticsCustomers, ApiError>({
    queryKey: ["dashboard", "customers", days, range.to],
    queryFn: ({ signal }) => api.get<AnalyticsCustomers>("/admin/analytics/customers", { query: { ...range, groupBy: days > 31 ? "week" : "day" }, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRecentOrders(enabled = true) {
  return usePaged<OrderSummary>(["dashboard", "recent-orders"], "/admin/orders", { page: 1, pageSize: 6 }, { enabled });
}

export type OrderAlertKind = "refund-pending" | "unfulfilled";

/** Pedidos que requieren acción: reembolso pendiente o pagados sin enviar. */
export function useOrderAlerts(kind: OrderAlertKind, enabled = true) {
  const params = kind === "refund-pending" ? { tag: "refund-pending", pageSize: 5 } : { status: "open", paymentStatus: "paid", fulfillmentStatus: "unfulfilled", pageSize: 5 };
  return usePaged<OrderSummary>(["dashboard", "alert", kind], "/admin/orders", { page: 1, ...params }, { enabled });
}

export function useLowStock(enabled = true) {
  return usePaged<LowStockLevel>(["dashboard", "low-stock"], "/admin/inventory", { page: 1, pageSize: 5, lowStock: true }, { enabled });
}
