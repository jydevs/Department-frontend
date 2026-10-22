export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** First value of a query parameter (a repeated parameter yields an array). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.length > 0 ? v : undefined;
}
