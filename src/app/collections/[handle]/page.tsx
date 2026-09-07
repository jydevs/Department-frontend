import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collections, getCollectionProducts } from "@/data/products";
import type { CollectionHandle } from "@/data/types";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { CollectionView } from "@/components/product/CollectionView";

const HANDLES: CollectionHandle[] = ["all", "men", "women"];

export function generateStaticParams() {
  return HANDLES.map((handle) => ({ handle }));
}

function isHandle(value: string): value is CollectionHandle {
  return (HANDLES as string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  if (!isHandle(handle)) return {};
  return { title: collections[handle].title };
}

/**
 * SCAFFOLD — collection / catalogue page. Polished in `feature/collection-page`.
 * Reduced desaturated hero + big title, then the filter bar + product grid.
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!isHandle(handle)) notFound();

  const collection = collections[handle];
  const products = getCollectionProducts(handle);

  return (
    <div>
      <section className="relative h-[45vh] min-h-[300px] w-full overflow-hidden">
        <PlaceholderImage
          label={collection.heroImageLabel}
          tone="dark"
          hideLabel
          fill
          className="grayscale opacity-80"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
        />
        <h1 className="font-display absolute bottom-6 left-6 text-5xl text-dept-white md:bottom-10 md:left-10 md:text-7xl">
          {collection.title}
        </h1>
      </section>

      <CollectionView products={products} />
    </div>
  );
}
