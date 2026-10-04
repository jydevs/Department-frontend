import { CollectionHero } from "@/components/product/CollectionHero";
import { CollectionView } from "@/components/product/CollectionView";
import { DEFAULT_FILTER_LABELS, type FilterLabels } from "@/components/product/FilterBar";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid, type GridLabels } from "@/components/product/ProductGrid";
import { DEFAULT_DETAIL_LABELS, ProductInfo, type ProductDetailLabels } from "@/components/product/ProductInfo";
import { LookbookGallery } from "@/components/community/LookbookGallery";
import { CampaignSection } from "@/components/home/CampaignSection";
import { CtaBanner } from "@/components/home/CtaBanner";
import { EditorialBlock } from "@/components/home/EditorialBlock";
import { ErrorHero } from "@/components/home/ErrorHero";
import { Hero } from "@/components/home/Hero";
import { MarqueeBand } from "@/components/home/MarqueeBand";
import { NewArrivals } from "@/components/home/NewArrivals";
import { PageHeader } from "@/components/home/PageHeader";
import { RichText } from "@/components/home/RichText";
import { SplitBanner } from "@/components/home/SplitBanner";
import { ValueProps } from "@/components/home/ValueProps";
import { ContactForm } from "@/components/layout/ContactForm";
import { NewsletterFooter } from "@/components/layout/NewsletterFooter";
import { Reveal } from "@/components/ui/Reveal";
import type { Collection, Product } from "@/data/types";
import { getCollection, getRelatedProducts } from "@/lib/api/catalog";
import { bool, num, optStr, str, type CmsSection, type Settings } from "@/lib/cms/types";

/** Datos de la página que algunas secciones necesitan (colección actual, producto actual…). */
export interface RenderContext {
  collection?: { collection: Collection; products: Product[]; hasMore?: boolean; nextCursor?: string | null };
  product?: Product;
}

/** Textos que el CMS sembrado dejó en inglés: se tratan como "sin definir" y se muestra el valor por defecto en español. */
const LEGACY_EN: Record<string, string> = { Availability: "Disponibilidad", Price: "Precio" };
const labelStr = (s: Settings, key: string, fallback: string) => {
  const v = str(s, key, fallback);
  return LEGACY_EN[v] ?? v;
};

const gridLabels = (s: Settings): GridLabels => ({
  emptyTitle: str(s, "emptyTitle", "Sin resultados"), emptyText: str(s, "emptyText", "Prueba con otro filtro"),
  soldOut: str(s, "soldOutBadgeLabel", "Agotado"), sale: str(s, "saleBadgeLabel", "Oferta"),
});
const filterLabels = (s: Settings): FilterLabels => ({
  filter: str(s, "filterLabel", DEFAULT_FILTER_LABELS.filter), availability: labelStr(s, "availabilityLabel", DEFAULT_FILTER_LABELS.availability),
  price: labelStr(s, "priceLabel", DEFAULT_FILTER_LABELS.price), sort: str(s, "sortLabel", DEFAULT_FILTER_LABELS.sort),
  all: str(s, "optionAllLabel", DEFAULT_FILTER_LABELS.all), inStock: str(s, "optionInStockLabel", DEFAULT_FILTER_LABELS.inStock),
  soldOut: str(s, "optionSoldOutLabel", DEFAULT_FILTER_LABELS.soldOut), featured: str(s, "sortFeaturedLabel", DEFAULT_FILTER_LABELS.featured),
  priceAsc: str(s, "sortPriceAscLabel", DEFAULT_FILTER_LABELS.priceAsc), priceDesc: str(s, "sortPriceDescLabel", DEFAULT_FILTER_LABELS.priceDesc),
  reset: str(s, "resetLabel", DEFAULT_FILTER_LABELS.reset), items: str(s, "countLabel", DEFAULT_FILTER_LABELS.items),
});
/** Textos de la ficha de producto (sección `product-detail`); sin sección usa los valores por defecto. */
export const productDetailLabels = (s: Settings = {}): ProductDetailLabels => ({
  home: str(s, "breadcrumbHomeLabel", DEFAULT_DETAIL_LABELS.home), collection: str(s, "breadcrumbCollectionLabel", DEFAULT_DETAIL_LABELS.collection),
  collectionHandle: str(s, "breadcrumbCollectionHandle", DEFAULT_DETAIL_LABELS.collectionHandle), size: str(s, "sizeLabel", DEFAULT_DETAIL_LABELS.size),
  quantity: str(s, "quantityLabel", DEFAULT_DETAIL_LABELS.quantity), max: num(s, "maxQuantity", DEFAULT_DETAIL_LABELS.max), add: str(s, "addToCartLabel", DEFAULT_DETAIL_LABELS.add),
  soldOut: str(s, "soldOutLabel", DEFAULT_DETAIL_LABELS.soldOut), sale: str(s, "saleBadgeLabel", DEFAULT_DETAIL_LABELS.sale), noPrice: str(s, "noPriceLabel", DEFAULT_DETAIL_LABELS.noPrice),
  sizeRequired: str(s, "sizeRequiredMessage", DEFAULT_DETAIL_LABELS.sizeRequired), stickyAdd: str(s, "stickyAddLabel", DEFAULT_DETAIL_LABELS.stickyAdd),
  stickyChoose: str(s, "stickyChooseSizeLabel", DEFAULT_DETAIL_LABELS.stickyChoose), showDiscount: bool(s, "showDiscountBadge", true), sticky: bool(s, "stickyAddToCart", true),
});

async function ProductGridSection({ section, ctx }: { section: CmsSection; ctx: RenderContext }) {
  const s = section.settings;
  const source = str(s, "source", "current-collection");
  const limit = num(s, "limit", 24);
  const columns = str(s, "columns", "4") === "3" ? 3 : 4;
  let products: Product[] = [];
  if (source === "current-collection") products = ctx.collection?.products ?? [];
  else if (source === "related" && ctx.product) products = await getRelatedProducts(ctx.product, ctx.product.tags, limit);
  else if (source === "collection") products = (await getCollection(str(s, "collectionHandle", "all"), { limit }))?.products ?? [];
  // la colección actual muestra todo lo cargado (hasta 100 y "Cargar más"); `limit` solo acota las demás fuentes
  if (source !== "current-collection") products = products.slice(0, limit);

  const intro = (optStr(s, "eyebrow") || optStr(s, "heading")) && (
    <div className="px-gutter mb-10 md:mb-14">
      {optStr(s, "eyebrow") && <p className="text-[11px] tracking-[0.2em] text-dept-gray-500 uppercase">{str(s, "eyebrow")}</p>}
      {optStr(s, "heading") && <h2 className="font-display text-display-lg mt-4">{str(s, "heading")}</h2>}
    </div>
  );

  if (bool(s, "showFilters", true)) {
    const current = source === "current-collection" ? ctx.collection : undefined;
    return (
      <CollectionView
        products={products}
        columns={columns}
        srHeading={str(s, "srHeading", "Productos")}
        filterLabels={filterLabels(s)}
        gridLabels={gridLabels(s)}
        collectionHandle={current?.collection.handle}
        hasMore={current?.hasMore}
        nextCursor={current?.nextCursor}
      />
    );
  }
  return (
    <section className={source === "related" ? "border-t border-white/10 py-section" : "py-section"}>
      <Reveal>
        {intro}
        <ProductGrid products={products} columns={columns} labels={gridLabels(s)} />
      </Reveal>
    </section>
  );
}

/** Secciones que pintan el encabezado principal (h1) de su página. */
const H1_SECTIONS = new Set(["hero", "page-header", "error-hero", "collection-hero", "contact-form"]);

/**
 * Renderiza la lista de secciones de una plantilla/página del CMS (solo las activas y conocidas).
 *
 * Encabezados: la página debe tener UN `<h1>`; lo pinta la primera sección capaz (hero, page-header, contact-form…) y
 * las siguientes bajan a `<h2>`. Si ninguna lo hace y se indica `pageTitle`, se añade un h1 solo para lectores de pantalla.
 */
export async function SectionRenderer({ sections, ctx = {}, pageTitle }: { sections: CmsSection[]; ctx?: RenderContext; pageTitle?: string }) {
  const active = sections.filter((x) => x.enabled);
  const h1Id = active.find((x) => H1_SECTIONS.has(x.type) || (x.type === "product-detail" && ctx.product))?.id;
  return (
    <>
      {!h1Id && pageTitle && <h1 className="sr-only">{pageTitle}</h1>}
      {await Promise.all(
        active.map(async (section) => {
            const s = section.settings;
            const level = section.id === h1Id ? "h1" : "h2";
            switch (section.type) {
              case "hero": return <Hero key={section.id} s={s} as={level} />;
              case "marquee": return <MarqueeBand key={section.id} section={section} />;
              case "new-arrivals": return <NewArrivals key={section.id} s={s} />;
              case "split-banner": return <SplitBanner key={section.id} section={section} />;
              case "campaign": return <CampaignSection key={section.id} s={s} />;
              case "editorial": return <EditorialBlock key={section.id} s={s} />;
              case "value-props": return <ValueProps key={section.id} section={section} />;
              case "lookbook": return <LookbookGallery key={section.id} section={section} />;
              case "rich-text": return <RichText key={section.id} s={s} />;
              case "page-header": return <PageHeader key={section.id} s={s} as={level} />;
              case "cta-banner": return <CtaBanner key={section.id} s={s} />;
              case "error-hero": return <ErrorHero key={section.id} s={s} />;
              case "announcement-bar": return null; // la barra global se configura en `settings/site`
              case "newsletter": return <section key={section.id} className="border-t border-white/10"><NewsletterFooter settings={s} /></section>;
              case "contact-form": {
                const heading = str(s, "heading", "Contacto");
                // el formulario pinta su titular como <h2>: cuando es el encabezado principal se muestra como <h1> (y se oculta el h2)
                return (
                  <section
                    key={section.id}
                    aria-label={heading}
                    className={`px-gutter py-section border-t border-white/10 ${level === "h1" ? "pt-[calc(var(--chrome-h)+2rem)] [&_h2]:hidden" : ""}`}
                  >
                    {level === "h1" && <h1 className="font-display text-display-lg text-dept-white mx-auto mb-10 max-w-2xl">{heading}</h1>}
                    <ContactForm settings={s} />
                  </section>
                );
              }
              case "collection-hero":
                return ctx.collection ? <CollectionHero key={section.id} section={section} collection={ctx.collection.collection} count={ctx.collection.products.length} more={ctx.collection.hasMore} /> : null;
              case "product-grid": return <ProductGridSection key={section.id} section={section} ctx={ctx} />;
              case "product-detail":
                return ctx.product ? (
                  <div key={section.id} className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start">
                    <ProductGallery images={ctx.product.images} name={ctx.product.name} imageLabel={ctx.product.imageLabel} />
                    <ProductInfo key={ctx.product.id} product={ctx.product} labels={productDetailLabels(s)} />
                  </div>
                ) : null;
              default: return null; // site-header / footer / search-panel / cart-drawer viven en el layout; tipos nuevos se ignoran
            }
          }),
      )}
    </>
  );
}
