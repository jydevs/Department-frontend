import { Suspense } from "react";
import type { Metadata } from "next";
import { OrdersList } from "@/components/admin/orders/orders-list";

export const metadata: Metadata = { title: "Pedidos" };

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersList />
    </Suspense>
  );
}
