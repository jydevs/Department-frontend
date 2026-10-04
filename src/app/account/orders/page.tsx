"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loading, SessionPending, ghostClass, useRequireSession } from "@/components/account/ui";
import { PAYMENT_LABEL, FULFILL_LABEL } from "@/components/checkout/OrderView";
import { listOrders, logout, type OrderPage } from "@/lib/account";
import { friendlyError } from "@/lib/api/errors";
import { formatCOP } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export default function OrdersPage() {
  const router = useRouter();
  const { status } = useRequireSession();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ page: number; res?: OrderPage; error?: string } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let off = false;
    listOrders(page)
      .then((res) => { if (!off) setData({ page, res }); })
      .catch((e) => { if (!off) setData({ page, error: friendlyError(e, "No se pudieron cargar tus pedidos.") }); });
    return () => { off = true; };
  }, [status, page]);

  const loaded = data?.page === page ? data : null;

  return (
    <div data-testid="orders-page" className="min-h-[70vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <p className="font-condensed text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
              <Link href="/account" className="hover:text-dept-white">Mi cuenta</Link>
            </p>
            <h1 className="font-display text-display-lg text-dept-white mt-1">Historial de pedidos</h1>
          </div>
          {status === "authenticated" && (
            <button type="button" data-testid="logout-btn" onClick={() => void logout().then(() => router.push("/account/login"))} className={ghostClass}>
              Cerrar sesión
            </button>
          )}
        </div>

        {status !== "authenticated" ? <SessionPending status={status} /> : !loaded ? <Loading /> : loaded.error ? (
          <p role="alert" className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">{loaded.error}</p>
        ) : !loaded.res || loaded.res.items.length === 0 ? (
          <div className="border border-white/10 bg-white/[0.02] p-8 text-center sm:py-16">
            <p className="font-display text-display-md text-dept-white mb-2">No tienes pedidos recientes</p>
            <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400 mb-6">Cuando realices una compra, podrás ver el seguimiento aquí.</p>
            <Button href="/collections/all" variant="red" size="md" arrow>Explorar catálogo</Button>
          </div>
        ) : (
          <>
            <ul data-testid="orders-list" className="divide-y divide-white/10 border-y border-white/10">
              {loaded.res.items.map((o) => (
                <li key={o.orderNumber}>
                  <Link href={`/account/orders/${o.orderNumber}`} data-testid="order-row" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-5 transition-colors hover:bg-white/[0.03]">
                    <div>
                      <p className="font-display text-xl text-dept-white">Pedido #{o.orderNumber}</p>
                      <p className="font-condensed text-[11px] tracking-[0.18em] text-dept-gray-500">
                        {dateFmt.format(new Date(o.createdAt))} · {o.itemCount} {o.itemCount === 1 ? "artículo" : "artículos"}
                      </p>
                    </div>
                    <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-300">
                      {o.status === "cancelled" ? "Cancelado" : `${PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus} · ${FULFILL_LABEL[o.fulfillmentStatus] ?? o.fulfillmentStatus}`}
                    </p>
                    <p className="font-condensed text-sm tabular-nums text-dept-white">{formatCOP(o.total)}</p>
                  </Link>
                </li>
              ))}
            </ul>
            {loaded.res.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between font-condensed text-xs tracking-[0.12em] text-dept-gray-300">
                <button type="button" className={ghostClass} disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
                <span>Página {loaded.res.page} de {loaded.res.totalPages}</span>
                <button type="button" className={ghostClass} disabled={page >= loaded.res.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
