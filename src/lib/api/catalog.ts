import { apiGet } from "./http";
import type {
  ApiCollectionResponse,
  ApiCollectionSummary,
  ApiPage,
  ApiProduct,
  ApiProductSummary,
  ApiSearchResponse,
} from "./types";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "title";

export interface ListProductsParams {
  limit?: number;
  cursor?: string;
  sort?: ProductSort;
  /** collection handle */
  collection?: string;
  tag?: string;
  q?: string;
}

const EMPTY_PAGE: ApiPage<ApiProductSummary> = { items: [], hasMore: false, nextCursor: null };

/** `GET /storefront/products` */
export async function listProducts(params: ListProductsParams = {}): Promise<ApiPage<ApiProductSummary>> {
  const page = await apiGet<ApiPage<ApiProductSummary>>("/storefront/products", {
    query: { ...params },
    tags: ["catalog", "catalog:products"],
  });
  return page ?? EMPTY_PAGE;
}

/** `GET /storefront/products/:handle` (null when it does not exist / is not published) */
export async function getProduct(handle: string): Promise<ApiProduct | null> {
  return apiGet<ApiProduct>(`/storefront/products/${encodeURIComponent(handle)}`, {
    tags: ["catalog", `catalog:product:${handle}`],
  });
}

/** `GET /storefront/collections` */
export async function listCollections(): Promise<ApiCollectionSummary[]> {
  const list = await apiGet<ApiCollectionSummary[]>("/storefront/collections", { tags: ["catalog", "catalog:collections"] });
  return Array.isArray(list) ? list : [];
}

/** `GET /storefront/collections/:handle` (collection + first page of its products) */
export async function getCollection(
  handle: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<ApiCollectionResponse | null> {
  return apiGet<ApiCollectionResponse>(`/storefront/collections/${encodeURIComponent(handle)}`, {
    query: { ...params },
    tags: ["catalog", `catalog:collection:${handle}`],
  });
}

/** `GET /storefront/search?q=` — never cached (rate-limited per visitor, see visitorHeaders) */
export async function search(q: string, headers?: Record<string, string>): Promise<ApiSearchResponse> {
  const result = await apiGet<ApiSearchResponse>("/storefront/search", { query: { q }, headers, noStore: true });
  return result ?? { products: [], collections: [] };
}
