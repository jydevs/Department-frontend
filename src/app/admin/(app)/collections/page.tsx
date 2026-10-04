"use client";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, PageHeader } from "@/components/admin/ui/Display";
import { Can } from "@/lib/admin/permissions";
import { errorMessage } from "@/lib/admin/errors";
import { useCollections } from "@/lib/admin/api/catalog";
import { useMediaUrls } from "@/lib/admin/api/media";

export default function CollectionsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useCollections();
  const media = useMediaUrls(data?.map((c) => c.imageMediaId) ?? []).data;
  return (
    <>
      <PageHeader title="Colecciones" actions={<Can perm="collections:write"><Link href="/admin/collections/new" className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-white hover:brightness-110"><Plus className="size-4" />Nueva colección</Link></Can>} />
      <DataTable caption="Colecciones" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/admin/collections/${c.id}`)}
        columns={[
          { key: "t", header: "Colección", sortValue: (c) => c.title, cell: (c) => <div className="flex items-center gap-3">{c.imageMediaId && media?.get(c.imageMediaId) && <Image src={media.get(c.imageMediaId)!} alt="" width={56} height={36} unoptimized loading={data?.[0]?.id === c.id ? "eager" : "lazy"} className="h-9 w-14 rounded object-cover" />}<div><p className="font-medium">{c.title}</p><p className="text-xs text-muted">/{c.handle}</p></div></div> },
          { key: "k", header: "Tipo", cell: (c) => <Badge tone={c.kind === "smart" ? "info" : "neutral"}>{c.kind === "smart" ? "Inteligente" : "Manual"}</Badge> },
          { key: "p", header: "Estado", cell: (c) => <Badge tone={c.published ? "ok" : "warn"}>{c.published ? "Publicada" : "Oculta"}</Badge> },
        ]} />
    </>
  );
}
