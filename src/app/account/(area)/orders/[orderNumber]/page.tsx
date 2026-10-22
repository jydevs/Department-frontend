import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailPanel } from "@/components/account/OrdersPanel";

type Props = { params: Promise<{ orderNumber: string }> };

export const metadata: Metadata = { title: "Detalle del pedido" };

export default async function OrderDetailPage({ params }: Props) {
  const { orderNumber } = await params;
  if (!/^[1-9]\d{0,9}$/.test(orderNumber)) notFound();
  return <OrderDetailPanel orderNumber={orderNumber} />;
}
