import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { CollectionView } from "@/components/product/CollectionView";
import { clsx } from "@/lib/clsx";

const TAB_LABEL: Record<string, string> = {
  all: "Todo",
  men: "Men",
  women: "Women",
};

export function generateStaticParams() {
  return [{ handle: "all" }, { handle: "men" }, { handle: "women" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const title = TAB_LABEL[handle] || handle;
  return { title: `Colección ${title} — Daregular Dept.` };
}

async function fetchCollection(handle: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const url = `${baseUrl}/api/v1/storefront/collections/${handle}`;
  const response = await fetch(url, {
    next: { revalidate: 300 },
  });
  if (!response.ok) return null;
  return response.json();
}

/**
 * Collection / catalogue page: desaturated hero with a parallax photo, huge
 * title and collection tabs, then the filter bar + product grid.
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const result = await fetchCollection(handle);
  if (!result) notFound();

  const { collection, products } = result;

  return (
    <div>
      <section className="relative isolate flex min-h-[58svh] items-end overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="parallax-y absolute -inset-y-[10%] inset-x-0">
            <PlaceholderImage
              label={collection.title}
              src={`/images/collection-${handle}.jpg`}
              tone="dark"
              hideLabel
              fill
              priority
              className="grayscale"
            />
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/40 to-black/30" />

        <div className="flex w-full flex-wrap items-end justify-between gap-x-8 gap-y-6 px-gutter pb-8 pt-[calc(var(--chrome-h)+3rem)] md:pb-12">
          <div>
            <p className="font-condensed mb-4 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80">
              <span aria-hidden className="h-px w-10 bg-dept-red" />
              Colección — {String(products.length).padStart(2, "0")} piezas
            </p>
            <h1 data-testid="collection-title" className="font-display text-display-2xl text-dept-white">
              {collection.title}
              <span className="sr-only"> {handle}</span>
            </h1>
          </div>

          <nav aria-label="Colecciones" className="flex gap-2 pb-2">
            {["all", "men", "women"].map((h) => (
              <Link
                key={h}
                href={`/collections/${h}`}
                aria-current={h === handle ? "page" : undefined}
                className={clsx(
                  "font-condensed border px-5 py-2.5 text-[11px] tracking-[0.22em] transition-colors duration-300 ease-out-expo",
                  h === handle
                    ? "border-dept-white bg-dept-white text-dept-black"
                    : "border-white/30 text-dept-white hover:border-dept-white hover:bg-white/10",
                )}
              >
                {TAB_LABEL[h]}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <CollectionView products={products} />
    </div>
  );
}
