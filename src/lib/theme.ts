import type { CSSProperties } from "react";
import type { SiteSettings } from "@/lib/api/types";
import { fontVar } from "./fonts";
import { isHexColor } from "./cms/reader";

/**
 * settings/site → CSS custom properties for <html style>. Colours are accepted ONLY when they are
 * `#RRGGBB` (anything else is dropped, so nothing from the CMS can break out of the style attribute);
 * fonts are looked up by name in the closed set in ./fonts.ts.
 */

const COLOR_VARS: [keyof SiteSettings["theme"]["colors"], string[]][] = [
  ["background", ["--dept-black", "--background"]],
  ["foreground", ["--dept-white", "--foreground"]],
  ["accent", ["--dept-red"]],
  ["accentDark", ["--dept-red-dark"]],
  ["accentLight", ["--dept-red-light"]],
  ["info", ["--dept-blue"]],
  ["gray100", ["--dept-gray-100"]],
  ["gray300", ["--dept-gray-300"]],
  ["gray500", ["--dept-gray-500"]],
  ["gray900", ["--dept-gray-900"]],
  ["muted", ["--dept-muted"]],
  ["border", ["--dept-border"]],
];

type CssVars = CSSProperties & Record<`--${string}`, string>;

export function themeStyle(settings: SiteSettings, opts: { announcementVisible: boolean }): CssVars {
  const style: CssVars = {};
  const colors = settings.theme.colors;
  for (const [key, vars] of COLOR_VARS) {
    const value = colors[key];
    if (isHexColor(value)) for (const v of vars) style[v as `--${string}`] = value;
  }
  const fonts = settings.theme.fonts;
  style["--theme-font-heading"] = fontVar(fonts.heading, "heading");
  style["--theme-font-body"] = fontVar(fonts.body, "body");
  style["--theme-font-condensed"] = fontVar(fonts.condensed, "condensed");
  style["--theme-font-script"] = fontVar(fonts.script, "script");
  if (!opts.announcementVisible) style["--announce-h"] = "0px";
  return style;
}

/** `<meta name="theme-color">` / `color-scheme` values. */
export function themeMeta(settings: SiteSettings): { themeColor: string; colorScheme: "dark" | "light" } {
  const bg = settings.theme.colors.background;
  return {
    themeColor: isHexColor(bg) ? bg : "#000000",
    colorScheme: settings.theme.colorScheme === "light" ? "light" : "dark",
  };
}
