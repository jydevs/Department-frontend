import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { clsx } from "@/lib/clsx";
import { pad2 } from "@/lib/cms/reader";

export interface CollectionTab {
  id: string;
  label: string;
  handle: string;
}

export interface CollectionHeroProps {
  id?: string;
  eyebrow?: string;
  /** collection title from the API */
  title: string;
  /** handle of the current collection (also read by screen readers and e2e tests) */
  handle: string;
  imageUrl?: string;
  imageAlt: string;
  count: number;
  showCount: boolean;
  countLabel: string;
  grayscale: boolean;
  parallax: boolean;
  minHeight: "medium" | "large";
  overlayColor: string;
  overlayOpacity: number;
  showTabs: boolean;
  tabsLabel: string;
  tabs: CollectionTab[];
}

const HEIGHT: Record<CollectionHeroProps["minHeight"], string> = {
  medium: "min-h-[58svh]",
  large: "min-h-[80svh]",
};

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.min(1, Math.max(0, alpha)).toFixed(3)})`;
}

/**
 * Collection page header: desaturated hero with a parallax photo, huge title
 * and collection tabs. Title / photo come from the collection in the API.
 */
export function CollectionHero(props: CollectionHeroProps) {
  const {
    id,
    eyebrow,
    title,
    handle,
    imageUrl,
    imageAlt,
    count,
    showCount,
    countLabel,
    grayscale,
    parallax,
    minHeight,
    overlayColor,
    overlayOpacity,
    showTabs,
    tabsLabel,
    tabs,
  } = props;
  const op = overlayOpacity;
  const scrim = `linear-gradient(to top, ${rgba(overlayColor, 1)}, ${rgba(overlayColor, op)}, ${rgba(overlayColor, op * 0.75)})`;
  const eyebrowText = eyebrow
    ? showCount
      ? `${eyebrow} — ${pad2(count)} ${countLabel}`
      : eyebrow
    : showCount
      ? `${pad2(count)} ${countLabel}`
      : undefined;

  return (
    <section id={id} className={clsx("relative isolate flex items-end overflow-hidden", HEIGHT[minHeight])}>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className={parallax ? "parallax-y absolute -inset-y-[10%] inset-x-0" : "absolute inset-0"}>
          <PlaceholderImage
            label={imageAlt}
            src={imageUrl}
            tone="dark"
            hideLabel
            fill
            priority
            className={grayscale ? "grayscale" : undefined}
          />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: scrim }} />

      <div className="flex w-full flex-wrap items-end justify-between gap-x-8 gap-y-6 px-gutter pb-8 pt-[calc(var(--chrome-h)+3rem)] md:pb-12">
        <div>
          {eyebrowText && (
            <p className="font-condensed mb-4 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80">
              <span aria-hidden className="h-px w-10 bg-dept-red" />
              {eyebrowText}
            </p>
          )}
          <h1 data-testid="collection-title" className="font-display text-display-2xl text-dept-white">
            {title}
            <span className="sr-only"> {handle}</span>
          </h1>
        </div>

        {showTabs && tabs.length > 0 && (
          <nav aria-label={tabsLabel} className="flex gap-2 pb-2">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/collections/${tab.handle}`}
                aria-current={tab.handle === handle ? "page" : undefined}
                className={clsx(
                  "font-condensed border px-5 py-2.5 text-[11px] tracking-[0.22em] transition-colors duration-300 ease-out-expo",
                  tab.handle === handle
                    ? "border-dept-white bg-dept-white text-dept-black"
                    : "border-white/30 text-dept-white hover:border-dept-white hover:bg-white/10",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
