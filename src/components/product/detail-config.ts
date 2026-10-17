// Editable texts / switches of the `product-detail` CMS section (shared by server adapters and the client component).

/** Editable texts / switches of the `product-detail` CMS section. */
export interface ProductDetailSettings {
  id?: string;
  breadcrumbHomeLabel: string;
  breadcrumbCollectionLabel: string;
  breadcrumbCollectionHandle: string;
  sizeLabel: string;
  quantityLabel: string;
  maxQuantity: number;
  addToCartLabel: string;
  soldOutLabel: string;
  saleBadgeLabel: string;
  noPriceLabel: string;
  sizeRequiredMessage: string;
  stickyAddLabel: string;
  stickyChooseSizeLabel: string;
  showDiscountBadge: boolean;
  stickyAddToCart: boolean;
}

export const DEFAULT_PRODUCT_DETAIL: ProductDetailSettings = {
  breadcrumbHomeLabel: "Inicio",
  breadcrumbCollectionLabel: "Clothes",
  breadcrumbCollectionHandle: "all",
  sizeLabel: "Talla",
  quantityLabel: "Cantidad",
  maxQuantity: 10,
  addToCartLabel: "Añadir al carrito",
  soldOutLabel: "Agotado",
  saleBadgeLabel: "Oferta",
  noPriceLabel: "Precio no disponible",
  sizeRequiredMessage: "Selecciona una talla",
  stickyAddLabel: "Añadir",
  stickyChooseSizeLabel: "Elegir talla",
  showDiscountBadge: true,
  stickyAddToCart: true,
};

