import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getProduct as getApiProduct } from "@/lib/api/catalog";
import { getSiteSettingsOrDefault } from "@/lib/api/content";
import { mapProduct } from "@/lib/catalog/service";
import { formatCOP } from "@/lib/format";
import { isHandle } from "@/lib/handle";
import { renderOg } from "@/lib/og";

const size = { width: 1200, height: 630 };
const contentType = "image/png";

/** The alt text is the product title + the brand name from the CMS, never hard-coded. */
export async function generateImageMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const settings = await getSiteSettingsOrDefault();
  let title: string | null = null;
  if (isHandle(handle)) {
    try {
      title = (await getApiProduct(handle))?.title ?? null;
    } catch {
      title = null;
    }
  }
  return [{ id: "og", alt: title ? `${title} — ${settings.brand.name}` : settings.brand.name, size, contentType }];
}

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  await connection();
  const { handle } = await params;
  if (!isHandle(handle)) notFound();
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
