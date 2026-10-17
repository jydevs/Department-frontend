/** Editable texts of the `search-panel` CMS section (`template/search`). */
export interface SearchSuggestion {
  label: string;
  href: string;
}

export interface SearchConfig {
  title: string;
  placeholder: string;
  closeLabel: string;
  suggestionsTitle: string;
  popularTitle: string;
  resultsLabel: string;
  resultSingular: string;
  resultPlural: string;
  /** `{query}` is replaced by the searched text */
  noResultsTitle: string;
  noResultsText: string;
  popularLimit: number;
  suggestions: SearchSuggestion[];
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  title: "Buscar",
  placeholder: "¿Qué buscas?",
  closeLabel: "Cerrar",
  suggestionsTitle: "Sugerencias",
  popularTitle: "Más buscado",
  resultsLabel: "Resultados",
  resultSingular: "resultado",
  resultPlural: "resultados",
  noResultsTitle: "Sin resultados para «{query}»",
  noResultsText: "Prueba con otro nombre o explora las colecciones.",
  popularLimit: 4,
  suggestions: [],
};
