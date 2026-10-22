"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import { Badge, Button, Card, ErrorState, Skeleton } from "@/components/admin/ui";
import { AdjustDialog, type AdjustTarget } from "@/components/admin/inventory/adjust-dialog";
import { useLocations, useVariantLevels, type InventoryLevel } from "@/lib/admin/api/inventory";
import type { ProductDetail } from "@/lib/admin/api/products";
import { formatNumber } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";

/** Stock por variante y ubicación dentro del editor, con ajuste rápido (motivo + nota). */
export function ProductInventoryCard({ product }: { product: ProductDetail }) {
  const canRead = useCan("inventory:read");
  const canWrite = useCan("inventory:write");
  const active = product.variants.filter((v) => v.isActive);
  const locations = useLocations(canRead);
  const levels = useVariantLevels(product.id, canRead);
  const [target, setTarget] = useState<{ t: AdjustTarget; locationId?: string } | null>(null);

  if (!canRead) return null;
  const locs = (locations.data ?? []).filter((l) => l.isActive);
  const levelOf = (variantId: string, locationId: string): InventoryLevel | undefined => levels.data?.find((l) => l.variantId === variantId && l.locationId === locationId);

  return (
    <Card title="Inventario" description="Stock disponible por variante y ubicación." flush>
      {levels.isLoading || locations.isLoading ? (
        <div className="flex flex-col gap-2 p-5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : levels.error || locations.error ? (
        <ErrorState error={levels.error ?? locations.error} onRetry={() => { void levels.refetch(); void locations.refetch(); }} />
      ) : active.length === 0 ? (
        <p className="p-5 text-sm text-muted">Sin variantes activas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm" aria-label="Inventario por variante">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <th scope="col" className="px-4 py-2.5">Variante</th>
                {locs.map((l) => (
                  <th key={l.id} scope="col" className="px-4 py-2.5 text-right">{l.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{v.title}</span>
                    <span className="block text-xs text-muted">{v.sku ?? "Sin SKU"}</span>
                  </td>
                  {locs.map((l) => {
                    const lv = levelOf(v.id, l.id);
                    return (
                      <td key={l.id} className="px-4 py-2.5 text-right">
                        {!v.trackInventory ? (
                          <Badge>No se controla</Badge>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            <span className="tabular-nums" title={lv ? `En mano ${lv.onHand} · reservado ${lv.reserved}` : "Sin registro de stock"}>
                              <strong>{formatNumber(lv ? lv.onHand - lv.reserved : 0)}</strong>
                              <span className="ml-1 text-xs text-muted">disp.{lv && lv.reserved ? ` (${formatNumber(lv.reserved)} res.)` : ""}</span>
                            </span>
                            {canWrite ? (
                              <Button size="sm" aria-label={`Ajustar stock de ${v.title} en ${l.name}`} onClick={() => setTarget({ t: { variantId: v.id, variantTitle: v.title, variantSku: v.sku, productTitle: product.title }, locationId: l.id })}>
                                Ajustar
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {locs.length === 0 && !locations.isLoading ? (
        <p className="flex items-center gap-2 p-5 text-sm text-muted">
          <Boxes aria-hidden size={16} /> No hay ubicaciones activas.
        </p>
      ) : null}
      <AdjustDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        target={target?.t ?? null}
        initialLocationId={target?.locationId}
        locations={locations.data ?? []}
        levels={(levels.data ?? []).filter((l) => l.variantId === target?.t.variantId)}
      />
    </Card>
  );
}
