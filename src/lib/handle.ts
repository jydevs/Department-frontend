/** URL handle of products, collections and CMS pages (same rule as the backend): `a-b-c`, lowercase. */
export const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isHandle(value: unknown): value is string {
  return typeof value === "string" && value.length <= 255 && HANDLE_PATTERN.test(value);
}
