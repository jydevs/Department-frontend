import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api/catalog";
import { formatCOP } from "@/lib/format";
import { renderOg } from "@/lib/og";

export const alt = "Daregular Dept. — producto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  return renderOg({
    photo: product.images[0] ?? "",
    kicker: "Daregular Dept.",
    title: product.name,
    subtitle: formatCOP(product.price),
  });
}
