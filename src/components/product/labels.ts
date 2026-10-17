/** Texts used by the product grid / cards / filter bar. Every field is editable from the CMS (`product-grid` section). */
export interface GridLabels {
  filterLabel: string;
  availabilityLabel: string;
  priceLabel: string;
  sortLabel: string;
  optionAllLabel: string;
  optionInStockLabel: string;
  optionSoldOutLabel: string;
  sortFeaturedLabel: string;
  sortPriceAscLabel: string;
  sortPriceDescLabel: string;
  resetLabel: string;
  countLabel: string;
  emptyTitle: string;
  emptyText: string;
  soldOutBadgeLabel: string;
  saleBadgeLabel: string;
  noPriceLabel: string;
  quickAddLabel: string;
}

export const DEFAULT_GRID_LABELS: GridLabels = {
  filterLabel: "Filtrar",
  availabilityLabel: "Availability",
  priceLabel: "Price",
  sortLabel: "Ordenar",
  optionAllLabel: "Todos",
  optionInStockLabel: "En stock",
  optionSoldOutLabel: "Agotado",
  sortFeaturedLabel: "Destacado",
  sortPriceAscLabel: "Precio: menor a mayor",
  sortPriceDescLabel: "Precio: mayor a menor",
  resetLabel: "Limpiar filtros",
  countLabel: "artículos",
  emptyTitle: "Sin resultados",
  emptyText: "Prueba con otro filtro",
  soldOutBadgeLabel: "Agotado",
  saleBadgeLabel: "Oferta",
  noPriceLabel: "Precio no disponible",
  quickAddLabel: "Añadir rápido",
};
