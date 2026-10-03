"use client";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { Badge, PageHeader } from "@/components/ui/Display";
import { Can } from "@/lib/permissions";
import { errorMessage } from "@/lib/errors";
import { useCollections } from "@/lib/api/catalog";

export default function CollectionsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useCollections();
  return (
    <>
      <PageHeader title="Colecciones" actions={<Can perm="collections:write"><Link href="/collections/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:brightness-110"><Plus className="size-4" />Nueva colección</Link></Can>} />
      <DataTable caption="Colecciones" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/collections/${c.id}`)}
        columns={[
          { key: "t", header: "Colección", sortValue: (c) => c.title, cell: (c) => <div className="flex items-center gap-3">{c.image && <Image src={c.image} alt="" width={56} height={36} unoptimized className="h-9 w-14 rounded object-cover" />}<div><p className="font-medium">{c.title}</p><p className="text-xs text-muted">/{c.handle}</p></div></div> },
          { key: "k", header: "Tipo", cell: (c) => <Badge tone={c.kind === "smart" ? "info" : "neutral"}>{c.kind === "smart" ? "Inteligente" : "Manual"}</Badge> },
          { key: "n", header: "Productos", sortValue: (c) => c.count, cell: (c) => c.count },
          { key: "p", header: "Estado", cell: (c) => <Badge tone={c.published ? "ok" : "warn"}>{c.published ? "Publicada" : "Oculta"}</Badge> },
        ]} />
    </>
  );
}
