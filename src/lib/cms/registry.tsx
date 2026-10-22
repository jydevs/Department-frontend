import type { ReactNode } from "react";
import type { SectionEnvelope, SiteSettings } from "@/lib/api/types";
import type { Product } from "@/lib/catalog/types";
import {
  getCollectionCount,
  getRelatedProducts,
  getShowcaseProducts,
  type CollectionView as CollectionData,
} from "@/lib/catalog/service";
import { CollectionView } from "@/components/product/CollectionView";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { Hero } from "@/components/home/Hero";
import { MarqueeBand } from "@/components/home/MarqueeBand";
import { NewArrivals } from "@/components/home/NewArrivals";
import { SplitBanner, type SplitTile } from "@/components/home/SplitBanner";
import { CampaignSection } from "@/components/home/CampaignSection";
import { EditorialBlock } from "@/components/home/EditorialBlock";
import { VALUE_ICONS, ValueProps, type ValueIconName } from "@/components/home/ValueProps";
import { LookbookGallery, type LookbookAspect } from "@/components/community/LookbookGallery";
import { ContactForm } from "@/components/layout/ContactForm";
import { NewsletterFooter } from "@/components/layout/NewsletterFooter";
import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { CollectionHero } from "@/components/sections/CollectionHero";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { ErrorHero } from "@/components/sections/ErrorHero";
import { PageHeader } from "@/components/sections/PageHeader";
import { RichText } from "@/components/sections/RichText";
import { readContactForm, readGridLabels, readNewsletter, readProductDetail } from "./adapters";
import { blocksOf, headingLines, reader } from "./reader";

/**
 * Registry of CMS section types → the existing storefront components.
 *
 * Contract (docs/CMS-SECTIONS.md in the backend):
 *  - `enabled: false` sections and unknown types are skipped by <SectionRenderer/> (never an error);
 *  - every setting has a default here, because the CMS stores only what the admin sent;
 *  - the section id (or its `anchorId`) becomes the DOM id of the rendered root, so links like `#new-arrivals` work.
 *
 * `site-header`, `newsletter`, `footer`, `search-panel` and `cart-drawer` are GLOBAL sections: the root layout reads
 * them from `template/layout`, `template/search` and `template/cart` and mounts them once (header, footer, overlays).
 * Inside a page they render nothing.
 */

export interface RenderContext {
  settings: SiteSettings;
  /** collection pages: the collection with its (enriched) products */
  collection?: CollectionData;
  /** product pages */
  product?: Product;
}

type Renderer = (section: SectionEnvelope, ctx: RenderContext, index: number) => ReactNode | Promise<ReactNode>;

const NONE: Renderer = () => null;

function grid3or4(value: string): 3 | 4 {
  return value === "3" ? 3 : 4;
}

/* ── individual renderers ────────────────────────────────── */

const hero: Renderer = (section) => {
  const r = reader(section);
  const imageUrl = r.image("imageUrl");
  return (
    <Hero
      id={section.id}
      eyebrow={r.opt("eyebrow")}
      lines={headingLines(r.str("heading"))}
      headingAccent={r.opt("headingAccent")}
      subheading={r.opt("subheading")}
      imageUrl={imageUrl}
      mobileImageUrl={r.image("mobileImageUrl")}
      imageAlt={r.str("imageAlt", r.str("heading").replace(/\n/g, " "))}
      ctaLabel={r.opt("ctaLabel")}
      ctaHref={r.link("ctaHref")}
      secondaryCtaLabel={r.opt("secondaryCtaLabel")}
      secondaryCtaHref={r.link("secondaryCtaHref")}
      overlayOpacity={r.num("overlayOpacity", 0.2, 0, 1)}
      overlayColor={r.color("overlayColor") ?? "#000000"}
      alignment={r.oneOf("alignment", ["left", "center", "right"], "left")}
      height={r.oneOf("height", ["medium", "large", "full"], "large")}
      kenBurns={r.bool("kenBurns", true)}
      scrollLabel={r.opt("scrollLabel")}
      scrollTargetId={r.anchor("scrollTargetId")}
    />
  );
};

const SPEED_SECONDS = { slow: 60, normal: 40, fast: 24 } as const;

const marquee: Renderer = (section) => {
  const r = reader(section);
  const items = blocksOf(section, "item").flatMap((b) => {
    const text = b.s.opt("text");
    return text ? [text] : [];
  });
  const speed = r.oneOf("speed", ["slow", "normal", "fast"], "normal");
  return (
    <MarqueeBand
      id={section.id}
      items={items}
      duration={r.optNum("duration", 5, 180) ?? SPEED_SECONDS[speed]}
      variant={r.oneOf("variant", ["band", "outline", "plain"], "band")}
      size={r.oneOf("size", ["sm", "md", "lg"], "md")}
      separator={r.opt("separator")}
      separatorColor={r.color("separatorColor")}
      backgroundColor={r.color("backgroundColor")}
      textColor={r.color("textColor")}
      bordered={r.bool("bordered", false)}
      ariaLabel={r.opt("ariaLabel")}
    />
  );
};

const newArrivals: Renderer = async (section) => {
  const r = reader(section);
  const handle = r.opt("collectionHandle");
  const showCount = r.bool("showCount", true);
  const count = showCount && handle ? await getCollectionCount(handle) : null;
  return (
    <NewArrivals
      id={r.anchor("anchorId") ?? section.id}
      eyebrow={r.opt("eyebrow")}
      heading={r.str("heading")}
      headingOutline={r.opt("headingOutline")}
      subheading={r.opt("subheading")}
      imageUrl={r.image("imageUrl")}
      imageAlt={r.str("imageAlt", r.str("heading"))}
      overlayColor={r.color("overlayColor") ?? "#000000"}
      overlayOpacity={r.num("overlayOpacity", 0.9, 0, 1)}
      parallax={r.bool("parallax", true)}
      count={count}
      showCount={showCount}
      countLabel={r.str("countLabel", "piezas")}
      ctaLabel={r.opt("ctaLabel")}
      ctaHref={r.link("ctaHref")}
    />
  );
};

const splitBanner: Renderer = async (section) => {
  const r = reader(section);
  const showCount = r.bool("showCount", true);
  const tileBlocks = blocksOf(section, "tile");
  let tiles: SplitTile[] = await Promise.all(
    tileBlocks.map(async (b): Promise<SplitTile> => {
      const collectionHandle = b.s.opt("collectionHandle");
      const href = collectionHandle ? `/collections/${encodeURIComponent(collectionHandle)}` : (b.s.link("href") ?? "#");
      return {
        id: b.id,
        label: b.s.str("label"),
        imageUrl: b.s.image("imageUrl"),
        imageAlt: b.s.str("imageAlt", b.s.str("label")),
        href,
        ariaLabel: b.s.opt("ariaLabel"),
        count: showCount && collectionHandle ? await getCollectionCount(collectionHandle) : null,
      };
    }),
  );
  if (tiles.length === 0 && r.opt("heading")) {
    // legacy single-banner mode
    tiles = [
      {
        id: section.id,
        label: r.str("heading"),
        imageUrl: r.image("imageUrl"),
        imageAlt: r.str("imageAlt", r.str("heading")),
        href: r.link("ctaHref") ?? "#",
        count: null,
      },
    ];
  }
  return (
    <SplitBanner
      id={section.id}
      ariaLabel={r.opt("ariaLabel")}
      tiles={tiles}
      showCount={showCount}
      countLabel={r.str("countLabel", "piezas")}
      numbered={r.bool("numbered", true)}
      backgroundColor={r.color("backgroundColor")}
    />
  );
};

const campaign: Renderer = async (section) => {
  const r = reader(section);
  const limit = Math.round(r.num("limit", 6, 1, 24));
  const handle = r.opt("collectionHandle");
  const showCount = r.bool("showCount", true);
  const [products, total] = await Promise.all([
    getShowcaseProducts(handle, limit),
    showCount && handle ? getCollectionCount(handle) : Promise.resolve(0),
  ]);
  const cta = r.oneOf("ctaVariant", ["solid", "outline", "red"], "outline");
  return (
    <CampaignSection
      id={section.id}
      eyebrow={r.opt("eyebrow")}
      heading={r.str("heading")}
      headingOutline={r.opt("headingOutline")}
      text={r.opt("text")}
      products={products}
      columns={r.oneOf("columns", ["3", "4"], "3") === "3" ? 3 : 4}
      imageUrl={r.image("imageUrl")}
      imageAlt={r.str("imageAlt")}
      count={total > 0 ? total : products.length}
      showCount={showCount}
      countLabel={r.str("countLabel", "piezas")}
      ctaLabel={r.opt("ctaLabel")}
      ctaHref={r.link("ctaHref")}
      ctaVariant={cta}
      alignment={r.oneOf("alignment", ["left", "center", "right"], "center")}
      labels={readGridLabels(r)}
    />
  );
};

const editorial: Renderer = (section) => {
  const r = reader(section);
  return (
    <EditorialBlock
      id={section.id}
      eyebrow={r.opt("eyebrow")}
      lines={headingLines(r.str("heading"))}
      lede={r.opt("lede")}
      body={r.str("body")}
      imageUrl={r.image("imageUrl")}
      imageAlt={r.str("imageAlt", r.str("heading").replace(/\n/g, " "))}
      imageBadge={r.opt("imageBadge")}
      layout={r.oneOf("layout", ["text-only", "image-left", "image-right"], "image-right")}
      ctaLabel={r.opt("ctaLabel")}
      ctaHref={r.link("ctaHref")}
      ctaVariant={r.oneOf("ctaVariant", ["solid", "outline", "red"], "red")}
    />
  );
};

const valueProps: Renderer = (section) => {
  const r = reader(section);
  const items = blocksOf(section, "item").map((b) => ({
    id: b.id,
    icon: b.s.oneOf<ValueIconName>("icon", VALUE_ICONS, "star"),
    title: b.s.str("title"),
    text: b.s.str("text"),
  }));
  return (
    <ValueProps
      id={section.id}
      heading={r.opt("heading")}
      ariaLabel={r.opt("ariaLabel")}
      columns={r.oneOf("columns", ["2", "3", "4"], "3")}
      showNumbers={r.bool("showNumbers", true)}
      items={items}
    />
  );
};

const lookbook: Renderer = (section) => {
  const r = reader(section);
  const aspects: readonly LookbookAspect[] = ["1/1", "2/3", "3/4", "4/5"];
  const photos = blocksOf(section, "photo").flatMap((b) => {
    const imageUrl = b.s.image("imageUrl");
    if (!imageUrl) return [];
    return [
      {
        id: b.id,
        imageUrl,
        alt: b.s.str("alt"),
        caption: b.s.opt("caption"),
        productHandle: b.s.opt("productHandle"),
        aspect: b.s.oneOf<LookbookAspect>("aspect", aspects, "2/3"),
      },
    ];
  });
  return (
    <LookbookGallery
      id={section.id}
      heading={r.opt("heading")}
      ariaLabel={r.opt("ariaLabel")}
      layout={r.oneOf("layout", ["grid", "carousel", "masonry"], "grid")}
      columns={r.oneOf("columns", ["2", "3", "4"], "3")}
      showCaptions={r.bool("showCaptions", true)}
      photos={photos}
    />
  );
};

const pageHeader: Renderer = (section) => {
  const r = reader(section);
  return (
    <PageHeader
      id={section.id}
      eyebrow={r.opt("eyebrow")}
      lines={headingLines(r.str("heading"))}
      headingAccent={r.opt("headingAccent")}
      lead={r.opt("lead")}
      text={r.opt("text")}
      alignment={r.oneOf("alignment", ["left", "center", "right"], "left")}
    />
  );
};

const ctaBanner: Renderer = (section) => {
  const r = reader(section);
  const variants = ["solid", "outline", "red"] as const;
  return (
    <CtaBanner
      id={section.id}
      eyebrow={r.opt("eyebrow")}
      heading={r.opt("heading")}
      text={r.opt("text")}
      layout={r.oneOf("layout", ["stacked", "split"], "stacked")}
      ctaLabel={r.opt("ctaLabel")}
      ctaHref={r.link("ctaHref")}
      ctaVariant={r.oneOf("ctaVariant", variants, "red")}
      secondaryCtaLabel={r.opt("secondaryCtaLabel")}
      secondaryCtaHref={r.link("secondaryCtaHref")}
      secondaryCtaVariant={r.oneOf("secondaryCtaVariant", variants, "outline")}
      backgroundColor={r.color("backgroundColor")}
    />
  );
};

const contactForm: Renderer = (section, _ctx, index) => {
  const first = index === 0;
  return (
    <section
      id={section.id}
      aria-label={reader(section).str("heading", "Contacto")}
      className={
        first
          ? "px-gutter pb-section pt-[calc(var(--chrome-h)+4rem)]"
          : "border-t border-white/10 px-gutter py-section"
      }
    >
      <ContactForm config={readContactForm(section)} />
    </section>
  );
};

const richText: Renderer = (section, _ctx, index) => {
  const r = reader(section);
  return (
    <RichText
      id={section.id}
      heading={r.opt("heading")}
      body={r.str("body")}
      alignment={r.oneOf("alignment", ["left", "center", "right"], "left")}
      maxWidth={r.oneOf("maxWidth", ["narrow", "normal", "wide"], "normal")}
      first={index === 0}
    />
  );
};

const announcementBar: Renderer = (section) => {
  const r = reader(section);
  return (
    <AnnouncementBar
      id={section.id}
      text={r.str("text")}
      items={r.strings("items")}
      href={r.link("href")}
      backgroundColor={r.color("backgroundColor")}
      textColor={r.color("textColor")}
      dismissible={r.bool("dismissible", false)}
    />
  );
};

const errorHero: Renderer = (section) => {
  const r = reader(section);
  return <ErrorHero id={section.id} eyebrow={r.opt("eyebrow")} code={r.str("code", "404")} ariaLabel={r.opt("ariaLabel")} />;
};

const collectionHero: Renderer = (section, ctx) => {
  const data = ctx.collection;
  if (!data) return null;
  const r = reader(section);
  const tabs = blocksOf(section, "tab").flatMap((b) => {
    const label = b.s.opt("label");
    const handle = b.s.opt("collectionHandle");
    return label && handle ? [{ id: b.id, label, handle }] : [];
  });
  return (
    <CollectionHero
      id={section.id}
      eyebrow={r.opt("eyebrow")}
      title={data.collection.title}
      handle={data.collection.handle}
      imageUrl={data.heroImage ?? r.image("imageUrl")}
      imageAlt={data.collection.image?.alt || `${data.collection.title} ${data.collection.handle}`}
      count={data.count}
      showCount={r.bool("showCount", true)}
      countLabel={r.str("countLabel", "piezas")}
      grayscale={r.bool("grayscale", true)}
      parallax={r.bool("parallax", true)}
      minHeight={r.oneOf("minHeight", ["medium", "large"], "medium")}
      overlayColor={r.color("overlayColor") ?? "#000000"}
      overlayOpacity={r.num("overlayOpacity", 0.4, 0, 1)}
      showTabs={r.bool("showTabs", true)}
      tabsLabel={r.str("tabsLabel", "Colecciones")}
      tabs={tabs}
    />
  );
};

const productGrid: Renderer = async (section, ctx) => {
  const r = reader(section);
  const source = r.oneOf("source", ["current-collection", "related", "collection"], "current-collection");
  const labels = readGridLabels(r);
  const limit = Math.round(r.num("limit", 24, 1, 24));
  const columns = grid3or4(r.oneOf("columns", ["3", "4"], "4"));

  if (source === "current-collection") {
    if (!ctx.collection) return null;
    return (
      <CollectionView
        id={section.id}
        handle={ctx.collection.collection.handle}
        products={ctx.collection.products}
        nextCursor={ctx.collection.nextCursor}
        columns={columns}
        showFilters={r.bool("showFilters", true)}
        srHeading={r.opt("srHeading")}
        labels={labels}
      />
    );
  }

  let products: Product[];
  if (source === "related") {
    if (!ctx.product) return null;
    products = await getRelatedProducts(ctx.product, limit);
  } else {
    const handle = r.opt("collectionHandle");
    products = await getShowcaseProducts(handle, limit);
  }
  if (products.length === 0 && source === "related") return null;

  const titleId = `${section.id}-title`;
  return (
    <section
      id={section.id}
      aria-labelledby={r.opt("heading") ? titleId : undefined}
      className="border-t border-white/10 py-section"
    >
      {(r.opt("eyebrow") || r.opt("heading")) && (
        <div className="px-gutter mb-10 md:mb-14">
          {r.opt("eyebrow") && (
            <p className="text-[11px] tracking-[0.2em] text-dept-gray-500 uppercase">{r.opt("eyebrow")}</p>
          )}
          {r.opt("heading") && (
            <h2 id={titleId} className="font-display text-display-lg mt-4">
              {r.opt("heading")}
            </h2>
          )}
        </div>
      )}
      <ProductGrid products={products} columns={columns} labels={labels} />
    </section>
  );
};

const productDetail: Renderer = (section, ctx) => {
  const product = ctx.product;
  if (!product) return null;
  return (
    <div id={section.id} className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start">
      <ProductGallery images={product.images} name={product.name} imageLabel={product.imageLabel} />
      <ProductInfo product={product} settings={readProductDetail(section)} />
    </div>
  );
};

const newsletter: Renderer = (section) => <NewsletterFooter config={readNewsletter(section)} />;

/** section `type` → renderer. Unknown types are simply absent (SectionRenderer skips them). */
export const SECTION_REGISTRY: Record<string, Renderer> = {
  hero,
  marquee,
  "new-arrivals": newArrivals,
  "split-banner": splitBanner,
  campaign,
  editorial,
  "value-props": valueProps,
  lookbook,
  "page-header": pageHeader,
  "cta-banner": ctaBanner,
  "contact-form": contactForm,
  "rich-text": richText,
  "announcement-bar": announcementBar,
  "error-hero": errorHero,
  "collection-hero": collectionHero,
  "product-grid": productGrid,
  "product-detail": productDetail,
  // global sections: mounted once by the root layout (see src/lib/cms/layout.ts)
  "site-header": NONE,
  footer: NONE,
  "search-panel": NONE,
  "cart-drawer": NONE,
  // only meaningful inside a page: the layout renders its own copy in the footer
  newsletter,
};
