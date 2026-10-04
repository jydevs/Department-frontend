"use client";
import { useParams } from "next/navigation";
import { CollectionEditor } from "@/components/admin/products/CollectionEditor";
import { EmptyState, Skeleton } from "@/components/admin/ui/Display";
import { errorMessage } from "@/lib/admin/errors";
import { useCollection } from "@/lib/admin/api/catalog";

export default function EditCollection() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCollection(id);
  if (isLoading) return <Skeleton className="h-96" />;
  if (error) return <EmptyState title="No se pudo cargar la colección" text={errorMessage(error)} />;
  if (!data) return <EmptyState title="Colección no encontrada" />;
  return <CollectionEditor key={data.id} initial={data} />;
}
