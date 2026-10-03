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
  collection?: { collection: Collection; products: Product[] };
  product?: Product;
}

const gridLabels = (s: Settings): GridLabels => ({
  emptyTitle: str(s, "emptyTitle", "Sin resultados"), emptyText: str(s, "emptyText", "Prueba con otro filtro"),
  soldOut: str(s, "soldOutBadgeLabel", "Agotado"), sale: str(s, "saleBadgeLabel", "Oferta"),
});
const filterLabels = (s: Settings): FilterLabels => ({
  filter: str(s, "filterLabel", DEFAULT_FILTER_LABELS.filter), availability: str(s, "availabilityLabel", DEFAULT_FILTER_LABELS.availability),
  price: str(s, "priceLabel", DEFAULT_FILTER_LABELS.price), sort: str(s, "sortLabel", DEFAULT_FILTER_LABELS.sort),
  all: str(s, "optionAllLabel", DEFAULT_FILTER_LABELS.all), inStock: str(s, "optionInStockLabel", DEFAULT_FILTER_LABELS.inStock),
  soldOut: str(s, "optionSoldOutLabel", DEFAULT_FILTER_LABELS.soldOut), featured: str(s, "sortFeaturedLabel", DEFAULT_FILTER_LABELS.featured),
  priceAsc: str(s, "sortPriceAscLabel", DEFAULT_FILTER_LABELS.priceAsc), priceDesc: str(s, "sortPriceDescLabel", DEFAULT_FILTER_LABELS.priceDesc),
  reset: str(s, "resetLabel", DEFAULT_FILTER_LABELS.reset), items: str(s, "countLabel", DEFAULT_FILTER_LABELS.items),
});
const detailLabels = (s: Settings): ProductDetailLabels => ({
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
  else if (source === "collection") products = (await getCollection(str(s, "collectionHandle", "all")))?.products ?? [];
  products = products.slice(0, limit);

  const intro = (optStr(s, "eyebrow") || optStr(s, "heading")) && (
    <div className="px-gutter mb-10 md:mb-14">
      {optStr(s, "eyebrow") && <p className="text-[11px] tracking-[0.2em] text-dept-gray-500 uppercase">{str(s, "eyebrow")}</p>}
      {optStr(s, "heading") && <h2 className="font-display text-display-lg mt-4">{str(s, "heading")}</h2>}
    </div>
  );

  if (bool(s, "showFilters", true)) {
    return <CollectionView products={products} columns={columns} srHeading={str(s, "srHeading", "Productos")} filterLabels={filterLabels(s)} gridLabels={gridLabels(s)} />;
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

/** Renderiza la lista de secciones de una plantilla/página del CMS (solo las activas y conocidas). */
export async function SectionRenderer({ sections, ctx = {} }: { sections: CmsSection[]; ctx?: RenderContext }) {
  return (
    <>
      {await Promise.all(
        sections
          .filter((x) => x.enabled)
          .map(async (section) => {
            const s = section.settings;
            switch (section.type) {
              case "hero": return <Hero key={section.id} s={s} />;
              case "marquee": return <MarqueeBand key={section.id} section={section} />;
              case "new-arrivals": return <NewArrivals key={section.id} s={s} />;
              case "split-banner": return <SplitBanner key={section.id} section={section} />;
              case "campaign": return <CampaignSection key={section.id} s={s} />;
              case "editorial": return <EditorialBlock key={section.id} s={s} />;
              case "value-props": return <ValueProps key={section.id} section={section} />;
              case "lookbook": return <LookbookGallery key={section.id} section={section} />;
              case "rich-text": return <RichText key={section.id} s={s} />;
              case "page-header": return <PageHeader key={section.id} s={s} />;
              case "cta-banner": return <CtaBanner key={section.id} s={s} />;
              case "error-hero": return <ErrorHero key={section.id} s={s} />;
              case "announcement-bar": return null; // la barra global se configura en `settings/site`
              case "newsletter": return <section key={section.id} className="border-t border-white/10"><NewsletterFooter settings={s} /></section>;
              case "contact-form": return <section key={section.id} aria-label={str(s, "heading", "Contacto")} className="px-gutter py-section border-t border-white/10"><ContactForm settings={s} /></section>;
              case "collection-hero":
                return ctx.collection ? <CollectionHero key={section.id} section={section} collection={ctx.collection.collection} count={ctx.collection.products.length} /> : null;
              case "product-grid": return <ProductGridSection key={section.id} section={section} ctx={ctx} />;
              case "product-detail":
                return ctx.product ? (
                  <div key={section.id} className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start">
                    <ProductGallery images={ctx.product.images} name={ctx.product.name} imageLabel={ctx.product.imageLabel} />
                    <ProductInfo product={ctx.product} labels={detailLabels(s)} />
                  </div>
                ) : null;
              default: return null; // site-header / footer / search-panel / cart-drawer viven en el layout; tipos nuevos se ignoran
            }
          }),
      )}
    </>
  );
}
