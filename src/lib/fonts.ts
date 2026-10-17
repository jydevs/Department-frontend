import {
  Anton,
  Archivo_Black,
  Barlow_Condensed,
  Bebas_Neue,
  DM_Sans,
  Dancing_Script,
  Great_Vibes,
  Inter,
  Oswald,
  Pinyon_Script,
  Work_Sans,
} from "next/font/google";

/**
 * Closed set of typefaces the CMS can choose from (settings/site → theme.fonts). They are self-hosted by
 * next/font at build time; the CMS only ever sends a NAME, which is looked up here — no arbitrary font URL
 * or family is ever injected into the page. Names not in the set fall back to the brand default.
 */

const anton = Anton({ weight: "400", variable: "--font-anton", subsets: ["latin"], display: "swap" });
const oswald = Oswald({ weight: ["400", "500", "600", "700"], variable: "--font-oswald", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const pinyon = Pinyon_Script({ weight: "400", variable: "--font-pinyon", subsets: ["latin"], display: "swap" });

// alternatives (only downloaded by the browser when a page actually uses them)
const bebas = Bebas_Neue({ weight: "400", variable: "--font-bebas", subsets: ["latin"], display: "swap", preload: false });
const archivoBlack = Archivo_Black({ weight: "400", variable: "--font-archivo-black", subsets: ["latin"], display: "swap", preload: false });
const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap", preload: false });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], display: "swap", preload: false });
const greatVibes = Great_Vibes({ weight: "400", variable: "--font-great-vibes", subsets: ["latin"], display: "swap", preload: false });
const dancingScript = Dancing_Script({ variable: "--font-dancing-script", subsets: ["latin"], display: "swap", preload: false });

interface FontEntry {
  /** the CSS variable next/font defines for this family */
  cssVar: string;
  className: string;
}

function entry(font: { variable: string }, cssVar: string): FontEntry {
  return { cssVar, className: font.variable };
}

export const FONT_CATALOG: Record<string, FontEntry> = {
  Anton: entry(anton, "--font-anton"),
  Oswald: entry(oswald, "--font-oswald"),
  Inter: entry(inter, "--font-inter"),
  "Pinyon Script": entry(pinyon, "--font-pinyon"),
  "Bebas Neue": entry(bebas, "--font-bebas"),
  "Archivo Black": entry(archivoBlack, "--font-archivo-black"),
  "Barlow Condensed": entry(barlowCondensed, "--font-barlow-condensed"),
  "DM Sans": entry(dmSans, "--font-dm-sans"),
  "Work Sans": entry(workSans, "--font-work-sans"),
  "Great Vibes": entry(greatVibes, "--font-great-vibes"),
  "Dancing Script": entry(dancingScript, "--font-dancing-script"),
};

/** Every font's variable class: put on <html> so any of them can be referenced by the theme. */
export const FONT_CLASS_NAMES = Object.values(FONT_CATALOG)
  .map((f) => f.className)
  .join(" ");

export type FontRole = "heading" | "body" | "condensed" | "script";

const DEFAULTS: Record<FontRole, string> = {
  heading: "Anton",
  body: "Inter",
  condensed: "Oswald",
  script: "Pinyon Script",
};

/** `var(--font-xxx)` for a font name chosen in the CMS (case-insensitive); the role's default when unknown. */
export function fontVar(name: string | undefined, role: FontRole): string {
  const wanted = (name ?? "").trim().toLowerCase();
  const found = Object.entries(FONT_CATALOG).find(([key]) => key.toLowerCase() === wanted);
  return `var(${(found ? found[1] : FONT_CATALOG[DEFAULTS[role]]).cssVar})`;
}
