import type { Metadata } from "next";
import { OrdersPanel } from "@/components/account/OrdersPanel";

export const metadata: Metadata = { title: "Mis pedidos" };

export default function OrdersPage() {
  return <OrdersPanel />;
}
