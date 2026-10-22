"use client";

import { CalendarClock } from "lucide-react";
import { Badge, DateTime } from "@/components/admin/ui";
import { relativeTime } from "@/lib/admin/format";
import type { DocListItem } from "@/lib/admin/api/content";

/** Estado de un documento: sin cambios / borrador sin publicar / programado / publicado hace X. */
export function DocStatusBadges({ item }: { item: Pick<DocListItem, "hasUnpublishedChanges" | "publishedAt" | "scheduledAt"> }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.hasUnpublishedChanges ? (
        <Badge tone="warning" dot>
          Borrador sin publicar
        </Badge>
      ) : item.publishedAt ? (
        <Badge tone="success" dot>
          Sin cambios
        </Badge>
      ) : (
        <Badge tone="neutral">Sin publicar</Badge>
      )}
      {item.scheduledAt ? (
        <Badge tone="info">
          <CalendarClock aria-hidden size={12} /> Programado · <DateTime value={item.scheduledAt} />
        </Badge>
      ) : null}
    </div>
  );
}

export function publishedText(item: Pick<DocListItem, "publishedAt">): string {
  return item.publishedAt ? `Publicado ${relativeTime(item.publishedAt)}` : "Nunca publicado";
}
