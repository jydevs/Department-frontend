"use client";
import { useParams } from "next/navigation";
import { CollectionEditor } from "@/components/products/CollectionEditor";
import { EmptyState, Skeleton } from "@/components/ui/Display";
import { useCollection } from "@/lib/api/catalog";

export default function EditCollection() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useCollection(id);
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title="Colección no encontrada" />;
  return <CollectionEditor initial={data} />;
}
