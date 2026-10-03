"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OrderView } from "@/components/checkout/OrderView";
import { Loading, useRequireSession } from "@/components/account/ui";
import { getOrder } from "@/lib/account";
import { ApiError, friendlyError } from "@/lib/api/errors";
import type { ApiPublicOrder } from "@/lib/api/types";

export default function AccountOrderPage() {
  const { number } = useParams<{ number: string }>();
  const { status } = useRequireSession();
  const [res, setRes] = useState<{ number: string; order?: ApiPublicOrder; error?: string } | null>(null);
  const valid = /^\d+$/.test(number);

  useEffect(() => {
    if (status !== "authenticated" || !valid) return;
    let off = false;
    getOrder(number)
      .then((order) => { if (!off) setRes({ number, order }); })
      .catch((e) => { if (!off) setRes({ number, error: e instanceof ApiError && e.status === 404 ? "No encontramos este pedido en tu cuenta." : friendlyError(e, "No se pudo cargar el pedido.") }); });
    return () => { off = true; };
  }, [status, number, valid]);

  const cur = res?.number === number ? res : null;
  const error = !valid ? "Número de pedido no válido." : cur?.error;

  return (
    <div data-testid="account-order-page" className="min-h-[70vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
          <Link href="/account/orders" className="hover:text-dept-white">← Mis pedidos</Link>
        </p>
        <h1 className="font-display text-display-xl mb-10">Pedido #{number}</h1>
        {error ? <p role="alert" className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">{error}</p>
          : status !== "authenticated" || !cur?.order ? <Loading /> : <OrderView order={cur.order} />}
      </div>
    </div>
  );
}
