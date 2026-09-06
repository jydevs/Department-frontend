type ClassValue = string | number | null | false | undefined;

/** Minimal className joiner (avoids pulling in the `clsx` package). */
export function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
