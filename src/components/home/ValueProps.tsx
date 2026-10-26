import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { blocksOf, bool, optStr, str, type CmsSection } from "@/lib/cms/types";

const iconProps = {
  width: 34,
  height: 34,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Iconos disponibles para los ítems del CMS (`icon`). */
const ICONS: Record<string, ReactNode> = {
  eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  truck: <><path d="M1 6h13v10H1z" /><path d="M14 9h4l4 3v4h-8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  refresh: <><path d="M20 11a8 8 0 0 0-14-4M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14 4M20 20v-4h-4" /></>,
  "credit-card": <><rect x="2" y="5" width="20" height="14" /><path d="M2 10h20" /></>,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />,
  gift: <><rect x="3" y="8" width="18" height="13" /><path d="M12 8v13M3 12h18M12 8c-3-5-7-3-5 0M12 8c3-5 7-3 5 0" /></>,
  chat: <path d="M4 5h16v11H9l-5 4V5z" />,
  leaf: <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l8-8" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  tag: <><path d="M3 12V3h9l9 9-9 9-9-9z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
};

/** Valores de marca en una fila con filetes finos (sección `value-props`); cada celda se invierte al pasar el cursor. */
export function ValueProps({ section }: { section: CmsSection }) {
  const st = section.settings;
  const items = blocksOf(section, "item");
  if (!items.length) return null;
  const cols = str(st, "columns", "3");
  const colClass = cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
  const numbers = bool(st, "showNumbers", true);

  return (
    <section aria-label={optStr(st, "ariaLabel")} className="border-y border-white/10">
      {optStr(st, "heading") && <h2 className="font-display text-display-lg px-gutter pt-10 text-dept-white">{str(st, "heading")}</h2>}
      <ul className={`grid divide-y divide-white/10 md:divide-x md:divide-y-0 ${colClass}`}>
        {items.map((item, i) => (
          <Reveal as="li" key={item.id} delay={i * 110}>
            <div className="group flex h-full min-h-[18rem] flex-col justify-between px-gutter py-10 text-dept-white transition-colors duration-500 ease-out-expo hover:bg-dept-white hover:text-dept-black md:min-h-[22rem]">
              <div className="flex items-start justify-between">
                <span className="transition-transform duration-500 ease-out-expo group-hover:-rotate-6 group-hover:scale-110">
                  <svg {...iconProps}>{ICONS[str(item.settings, "icon")] ?? ICONS.star}</svg>
                </span>
                {numbers && <span className="font-condensed text-[11px] tracking-[0.28em] text-dept-gray-500 transition-colors group-hover:text-dept-black/60">0{i + 1}</span>}
              </div>
              <div>
                <h3 className="font-display text-display-md">{str(item.settings, "title")}</h3>
                {optStr(item.settings, "text") && (
                  <p className="mt-3 max-w-[36ch] text-sm text-dept-white/60 transition-colors group-hover:text-dept-black/70">{str(item.settings, "text")}</p>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
