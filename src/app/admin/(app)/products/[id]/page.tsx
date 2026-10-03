"use client";
import { useParams } from "next/navigation";
import { ProductEditor } from "@/components/admin/products/ProductEditor";
import { EmptyState, Skeleton } from "@/components/admin/ui/Display";
import { useProduct } from "@/lib/admin/api/catalog";

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useProduct(id);
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  if (!data) return <EmptyState title="Producto no encontrado" />;
  return <ProductEditor key={data.updatedAt} initial={data} />;
}
