import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getProduct as getApiProduct } from "@/lib/api/catalog";
import { getSiteSettingsOrDefault } from "@/lib/api/content";
import { mapProduct } from "@/lib/catalog/service";
import { formatCOP } from "@/lib/format";
import { renderOg } from "@/lib/og";

export const alt = "Daregular Dept. — producto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  await connection();
  const { handle } = await params;
  const api = await getApiProduct(handle);
  if (!api) notFound();
  const product = mapProduct(api);
  const settings = await getSiteSettingsOrDefault();

  return renderOg({
    photo: product.images[0],
    kicker: settings.brand.name,
    title: product.name,
    subtitle: formatCOP(product.price),
  });
}
