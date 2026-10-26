"use client";
import { useParams } from "next/navigation";
import { ProductEditor } from "@/components/admin/products/ProductEditor";
import { EmptyState, Skeleton } from "@/components/admin/ui/Display";
import { errorMessage } from "@/lib/admin/errors";
import { useProduct } from "@/lib/admin/api/catalog";

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useProduct(id);
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  if (error) return <EmptyState title="No se pudo cargar el producto" text={errorMessage(error)} />;
  if (!data) return <EmptyState title="Producto no encontrado" />;
  return <ProductEditor key={data.id} initial={data} />;
}
