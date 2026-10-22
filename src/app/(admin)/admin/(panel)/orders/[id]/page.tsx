"use client";

import { use } from "react";
import { OrderDetailView } from "@/components/admin/orders/order-detail";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrderDetailView id={id} />;
}
