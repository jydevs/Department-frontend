import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

export type ValueIconName =
  | "truck"
  | "shield"
  | "refresh"
  | "credit-card"
  | "heart"
  | "star"
  | "gift"
  | "chat"
  | "leaf"
  | "clock"
  | "eye"
  | "user"
  | "tag";

export const VALUE_ICONS: readonly ValueIconName[] = [
  "truck",
  "shield",
  "refresh",
  "credit-card",
  "heart",
  "star",
  "gift",
  "chat",
  "leaf",
  "clock",
  "eye",
  "user",
  "tag",
];

export interface ValueItem {
  id: string;
  icon: ValueIconName;
  title: string;
  text: string;
}

export interface ValuePropsProps {
  id?: string;
  heading?: string;
  ariaLabel?: string;
  columns: "2" | "3" | "4";
  showNumbers: boolean;
  items: ValueItem[];
}

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

const ICONS: Record<ValueIconName, ReactNode> = {
  eye: (
    <svg {...iconProps}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  heart: (
    <svg {...iconProps}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  ),
  user: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  truck: (
    <svg {...iconProps}>
      <path d="M1 6h13v10H1z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
  shield: (
    <svg {...iconProps}>
      <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
    </svg>
  ),
  refresh: (
    <svg {...iconProps}>
      <path d="M20 11a8 8 0 0 0-14.5-4M4 13a8 8 0 0 0 14.5 4" />
      <path d="M20 4v5h-5M4 20v-5h5" />
    </svg>
  ),
  "credit-card": (
    <svg {...iconProps}>
      <rect x="2" y="5" width="20" height="14" rx="1" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  ),
  star: (
    <svg {...iconProps}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  ),
  gift: (
    <svg {...iconProps}>
      <rect x="3" y="8" width="18" height="4" />
      <path d="M12 8v13M5 12v9h14v-9M12 8c-2-4-6-3-5 0 .6 1.7 5 0 5 0zm0 0c2-4 6-3 5 0-.6 1.7-5 0-5 0z" />
    </svg>
  ),
  chat: (
    <svg {...iconProps}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z" />
    </svg>
  ),
  leaf: (
    <svg {...iconProps}>
      <path d="M5 19c0-9 5-14 15-15 0 10-5 15-14 15z" />
      <path d="M5 19c3-5 6-8 10-10" />
    </svg>
  ),
  clock: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  tag: (
    <svg {...iconProps}>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.2" />
    </svg>
  ),
};

const COLUMNS: Record<ValuePropsProps["columns"], string> = {
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-4",
};

/** Brand values in a hairline-ruled row; each cell inverts on hover. */
export function ValueProps({ id, heading, ariaLabel, columns, showNumbers, items }: ValuePropsProps) {
  if (items.length === 0) return null;
  return (
    <section id={id} aria-label={ariaLabel} className="border-y border-white/10">
      {heading && (
        <h2 className="font-display border-b border-white/10 px-gutter py-8 text-display-md text-dept-white">{heading}</h2>
      )}
      <ul className={`grid divide-y divide-white/10 md:divide-x md:divide-y-0 ${COLUMNS[columns]}`}>
        {items.map((value, i) => (
          <Reveal as="li" key={value.id} delay={i * 110}>
            <div className="group flex h-full min-h-[18rem] flex-col justify-between px-gutter py-10 text-dept-white transition-colors duration-500 ease-out-expo hover:bg-dept-white hover:text-dept-black md:min-h-[22rem]">
              <div className="flex items-start justify-between">
                <span className="transition-transform duration-500 ease-out-expo group-hover:-rotate-6 group-hover:scale-110">
                  {ICONS[value.icon]}
                </span>
                {showNumbers && (
                  <span className="font-condensed text-[11px] tracking-[0.28em] text-dept-gray-500 transition-colors group-hover:text-dept-black/60">
                    0{i + 1}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-display text-display-md">{value.title}</h3>
                {value.text && (
                  <p className="mt-3 max-w-[36ch] text-sm text-dept-white/60 transition-colors group-hover:text-dept-black/70">
                    {value.text}
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
