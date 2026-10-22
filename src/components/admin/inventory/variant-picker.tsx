"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button, Dialog, EmptyState, ErrorState, SearchInput, Skeleton } from "@/components/admin/ui";
import { Thumb } from "@/components/admin/products/product-image";
import { useProduct, useProductList } from "@/lib/admin/api/products";
import { formatCop } from "@/lib/admin/format";
import type { AdjustTarget } from "./adjust-dialog";

/** Busca un producto y elige una de sus variantes (para ajustar stock donde aún no hay nivel registrado). */
export function VariantPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: AdjustTarget) => void }) {
  if (!open) return null;
  return <PickerBody onClose={onClose} onPick={onPick} />;
}

function PickerBody({ onClose, onPick }: { onClose: () => void; onPick: (t: AdjustTarget) => void }) {
  const [q, setQ] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const list = useProductList({ q: q || undefined, pageSize: 10 });
  const detail = useProduct(productId ?? undefined);

  return (
    <Dialog open onClose={onClose} size="md" title="Elegir variante" description="Busca el producto y elige la variante a la que ajustarás el stock.">
      {productId ? (
        <div className="flex flex-col gap-3">
          <Button size="sm" variant="ghost" className="self-start" leftIcon={<ChevronLeft aria-hidden size={14} />} onClick={() => setProductId(null)}>
            Volver a la búsqueda
          </Button>
          {detail.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : detail.error || !detail.data ? (
            <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label={`Variantes de ${detail.data.title}`}>
              {detail.data.variants
                .filter((v) => v.isActive)
                .map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => detail.data && onPick({ variantId: v.id, variantTitle: v.title, variantSku: v.sku, productTitle: detail.data.title })}
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span>
                        <span className="block font-medium">{v.title}</span>
                        <span className="block text-xs text-muted">{v.sku ?? "Sin SKU"}</span>
                      </span>
                      <span className="text-sm tabular-nums text-muted">{formatCop(v.price)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar producto o SKU…" label="Buscar producto" autoFocus />
          {list.error ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.data && list.data.items.length === 0 ? (
            <EmptyState title="Sin resultados" className="py-8" />
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label="Productos">
              {list.data?.items.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setProductId(p.id)} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-surface-2">
                    <Thumb url={p.primaryImage?.url} alt={p.primaryImage?.alt} size={36} />
                    <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                    <span className="text-xs text-muted">{p.variantCount} variantes</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
}
