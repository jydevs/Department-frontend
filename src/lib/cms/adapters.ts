import type { SectionEnvelope } from "@/lib/api/types";
import {
  DEFAULT_CART_CONFIG,
  DEFAULT_CONTACT_FORM,
  DEFAULT_NEWSLETTER,
  type CartConfig,
  type ContactFormConfig,
  type NewsletterConfig,
} from "@/components/layout/config";
import { DEFAULT_PRODUCT_DETAIL, type ProductDetailSettings } from "@/components/product/detail-config";
import { DEFAULT_GRID_LABELS, type GridLabels } from "@/components/product/labels";
import { DEFAULT_SEARCH_CONFIG, type SearchConfig } from "@/components/search/config";
import { blocksOf, Reader, reader } from "./reader";

/**
 * Section settings → the typed props of client components. Missing keys fall back to the same
 * defaults the CMS documents (docs/CMS-SECTIONS.md), so a partially filled section never breaks.
 */

export function readGridLabels(r: Reader): GridLabels {
  const d = DEFAULT_GRID_LABELS;
  return {
    filterLabel: r.str("filterLabel", d.filterLabel),
    availabilityLabel: r.str("availabilityLabel", d.availabilityLabel),
    priceLabel: r.str("priceLabel", d.priceLabel),
    sortLabel: r.str("sortLabel", d.sortLabel),
    optionAllLabel: r.str("optionAllLabel", d.optionAllLabel),
    optionInStockLabel: r.str("optionInStockLabel", d.optionInStockLabel),
    optionSoldOutLabel: r.str("optionSoldOutLabel", d.optionSoldOutLabel),
    sortFeaturedLabel: r.str("sortFeaturedLabel", d.sortFeaturedLabel),
    sortPriceAscLabel: r.str("sortPriceAscLabel", d.sortPriceAscLabel),
    sortPriceDescLabel: r.str("sortPriceDescLabel", d.sortPriceDescLabel),
    resetLabel: r.str("resetLabel", d.resetLabel),
    countLabel: r.str("countLabel", d.countLabel),
    emptyTitle: r.str("emptyTitle", d.emptyTitle),
    emptyText: r.str("emptyText", d.emptyText),
    soldOutBadgeLabel: r.str("soldOutBadgeLabel", d.soldOutBadgeLabel),
    saleBadgeLabel: r.str("saleBadgeLabel", d.saleBadgeLabel),
    noPriceLabel: r.str("noPriceLabel", d.noPriceLabel),
    quickAddLabel: r.str("quickAddLabel", d.quickAddLabel),
    loadMoreLabel: r.str("loadMoreLabel", d.loadMoreLabel),
    loadingMoreLabel: r.str("loadingMoreLabel", d.loadingMoreLabel),
    loadMoreErrorLabel: r.str("loadMoreErrorLabel", d.loadMoreErrorLabel),
  };
}

export function readProductDetail(section: SectionEnvelope | undefined): ProductDetailSettings {
  const d = DEFAULT_PRODUCT_DETAIL;
  if (!section) return d;
  const r = reader(section);
  return {
    id: section.id,
    breadcrumbHomeLabel: r.str("breadcrumbHomeLabel", d.breadcrumbHomeLabel),
    breadcrumbCollectionLabel: r.str("breadcrumbCollectionLabel", d.breadcrumbCollectionLabel),
    breadcrumbCollectionHandle: r.handle("breadcrumbCollectionHandle") ?? d.breadcrumbCollectionHandle,
    sizeLabel: r.str("sizeLabel", d.sizeLabel),
    quantityLabel: r.str("quantityLabel", d.quantityLabel),
    maxQuantity: Math.round(r.num("maxQuantity", d.maxQuantity, 1, 50)),
    addToCartLabel: r.str("addToCartLabel", d.addToCartLabel),
    soldOutLabel: r.str("soldOutLabel", d.soldOutLabel),
    saleBadgeLabel: r.str("saleBadgeLabel", d.saleBadgeLabel),
    noPriceLabel: r.str("noPriceLabel", d.noPriceLabel),
    sizeRequiredMessage: r.str("sizeRequiredMessage", d.sizeRequiredMessage),
    stickyAddLabel: r.str("stickyAddLabel", d.stickyAddLabel),
    stickyChooseSizeLabel: r.str("stickyChooseSizeLabel", d.stickyChooseSizeLabel),
    showDiscountBadge: r.bool("showDiscountBadge", d.showDiscountBadge),
    stickyAddToCart: r.bool("stickyAddToCart", d.stickyAddToCart),
  };
}

export function readSearchConfig(section: SectionEnvelope | undefined): SearchConfig {
  const d = DEFAULT_SEARCH_CONFIG;
  if (!section) return d;
  const r = reader(section);
  const suggestions = blocksOf(section, "suggestion").flatMap((b) => {
    const label = b.s.opt("label");
    const href = b.s.link("url");
    return label && href ? [{ label, href }] : [];
  });
  return {
    title: r.str("title", d.title),
    placeholder: r.str("placeholder", d.placeholder),
    closeLabel: r.str("closeLabel", d.closeLabel),
    suggestionsTitle: r.str("suggestionsTitle", d.suggestionsTitle),
    popularTitle: r.str("popularTitle", d.popularTitle),
    resultsLabel: r.str("resultsLabel", d.resultsLabel),
    resultSingular: r.str("resultSingular", d.resultSingular),
    resultPlural: r.str("resultPlural", d.resultPlural),
    noResultsTitle: r.str("noResultsTitle", d.noResultsTitle),
    noResultsText: r.str("noResultsText", d.noResultsText),
    popularLimit: Math.round(r.num("popularLimit", d.popularLimit, 1, 12)),
    suggestions,
  };
}

export function readCartConfig(section: SectionEnvelope | undefined): CartConfig {
  const d = DEFAULT_CART_CONFIG;
  if (!section) return d;
  const r = reader(section);
  return {
    title: r.str("title", d.title),
    closeLabel: r.str("closeLabel", d.closeLabel),
    emptyTitle: r.str("emptyTitle", d.emptyTitle),
    emptyText: r.str("emptyText", d.emptyText),
    emptyTextHighlight: r.opt("emptyTextHighlight"),
    continueLabel: r.str("continueLabel", d.continueLabel),
    checkoutLabel: r.str("checkoutLabel", d.checkoutLabel),
    checkoutHref: r.link("checkoutHref") ?? d.checkoutHref,
    subtotalLabel: r.str("subtotalLabel", d.subtotalLabel),
    sizeLabel: r.str("sizeLabel", d.sizeLabel),
    removeLabel: r.str("removeLabel", d.removeLabel),
    decreaseLabel: r.str("decreaseLabel", d.decreaseLabel),
    increaseLabel: r.str("increaseLabel", d.increaseLabel),
    unavailableMessage: r.str("unavailableMessage", d.unavailableMessage),
    discountLabel: r.str("discountLabel", d.discountLabel),
    shippingLabel: r.str("shippingLabel", d.shippingLabel),
    shippingText: r.str("shippingText", d.shippingText),
    taxLabel: r.str("taxLabel", d.taxLabel),
    totalLabel: r.str("totalLabel", d.totalLabel),
    taxIncludedNote: r.str("taxIncludedNote", d.taxIncludedNote),
    discountCodeLabel: r.str("discountCodeLabel", d.discountCodeLabel),
    discountApplyLabel: r.str("discountApplyLabel", d.discountApplyLabel),
    discountApplyingLabel: r.str("discountApplyingLabel", d.discountApplyingLabel),
    discountRemoveLabel: r.str("discountRemoveLabel", d.discountRemoveLabel),
    discountEmptyMessage: r.str("discountEmptyMessage", d.discountEmptyMessage),
  };
}

export function readNewsletter(section: SectionEnvelope): NewsletterConfig {
  const d = DEFAULT_NEWSLETTER;
  const r = reader(section);
  return {
    eyebrow: r.opt("eyebrow"),
    heading: r.str("heading", d.heading),
    text: r.opt("text"),
    placeholder: r.str("placeholder", d.placeholder),
    inputLabel: r.str("inputLabel", r.str("placeholder", d.inputLabel)),
    buttonLabel: r.str("buttonLabel", d.buttonLabel),
    loadingMessage: r.str("loadingMessage", d.loadingMessage),
    successMessage: r.str("successMessage", d.successMessage),
    errorMessage: r.str("errorMessage", d.errorMessage),
    backgroundColor: r.color("backgroundColor"),
  };
}

export function readContactForm(section: SectionEnvelope): ContactFormConfig {
  const d = DEFAULT_CONTACT_FORM;
  const r = reader(section);
  return {
    heading: r.str("heading", d.heading),
    showPhone: r.bool("showPhone", d.showPhone),
    nameLabel: r.str("nameLabel", d.nameLabel),
    emailLabel: r.str("emailLabel", d.emailLabel),
    phoneLabel: r.str("phoneLabel", d.phoneLabel),
    subjectLabel: r.str("subjectLabel", d.subjectLabel),
    messageLabel: r.str("messageLabel", d.messageLabel),
    submitLabel: r.str("submitLabel", d.submitLabel),
    loadingLabel: r.str("loadingLabel", d.loadingLabel),
    successMessage: r.str("successMessage", d.successMessage),
    errorMessage: r.str("errorMessage", d.errorMessage),
  };
}
