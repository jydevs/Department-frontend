import { resolveMediaUrl } from "@/lib/api/media";
import type { SectionBlock, SectionEnvelope } from "@/lib/api/types";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** True for `/path`, `https://…`, `mailto:` and `tel:` (same rule the backend applies when saving). */
export function isSafeLink(value: string): boolean {
  if (value.length === 0 || value.length > 2000) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000- \u007f]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  if (value.startsWith("https://")) return true;
  return /^mailto:[^\s@]+@[^\s@]+$/.test(value) || /^tel:\+?[0-9()\-.]{3,30}$/.test(value);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

/**
 * Typed, defensive access to a section's `settings` bag. The CMS only stores what the admin sent
 * (defaults are applied here), and a document may in theory hold anything, so every accessor
 * validates the type and falls back to the default instead of throwing.
 */
export class Reader {
  private readonly bag: Record<string, unknown>;

  constructor(settings: Record<string, unknown> | undefined) {
    this.bag = settings ?? {};
  }

  /** string, "" (or `fallback`) when missing */
  str(key: string, fallback = ""): string {
    const v = this.bag[key];
    return typeof v === "string" ? v : fallback;
  }

  /** non-empty string or undefined */
  opt(key: string): string | undefined {
    const v = this.bag[key];
    return typeof v === "string" && v.trim().length > 0 ? v : undefined;
  }

  num(key: string, fallback: number, min = -Infinity, max = Infinity): number {
    const v = this.bag[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  }

  optNum(key: string, min = -Infinity, max = Infinity): number | undefined {
    const v = this.bag[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
  }

  bool(key: string, fallback: boolean): boolean {
    const v = this.bag[key];
    return typeof v === "boolean" ? v : fallback;
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const v = this.bag[key];
    return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  }

  /** `#RRGGBB` or undefined (anything else is ignored, so a bad value can never reach a style attribute) */
  color(key: string): string | undefined {
    const v = this.bag[key];
    return isHexColor(v) ? v : undefined;
  }

  /** safe link (`/path`, https, mailto, tel) or undefined */
  link(key: string): string | undefined {
    const v = this.bag[key];
    return typeof v === "string" && isSafeLink(v) ? v : undefined;
  }

  /** safe image URL, normalised through resolveMediaUrl */
  image(key: string): string | undefined {
    const v = this.bag[key];
    return resolveMediaUrl(typeof v === "string" ? v : undefined) ?? undefined;
  }

  /** DOM id / handle-like string (no `#`), or undefined */
  anchor(key: string): string | undefined {
    const v = this.bag[key];
    return typeof v === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v) ? v : undefined;
  }

  strings(key: string): string[] | undefined {
    const v = this.bag[key];
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is string => typeof x === "string" && x.length > 0);
    return out.length > 0 ? out : undefined;
  }

  raw(key: string): unknown {
    return this.bag[key];
  }
}

export function reader(section: { settings?: Record<string, unknown> }): Reader {
  return new Reader(section.settings);
}

export interface BlockReader {
  id: string;
  type: string;
  s: Reader;
}

/** The blocks of a section, optionally restricted to one block type. */
export function blocksOf(section: SectionEnvelope, type?: string): BlockReader[] {
  return (section.blocks ?? [])
    .filter((b: SectionBlock) => !type || b.type === type)
    .map((b) => ({ id: b.id, type: b.type, s: new Reader(b.settings) }));
}

/** `1 -> "01"` */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Splits a headline on `\n`. Empty input → []. */
export function headingLines(heading: string): string[] {
  return heading
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
