import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

interface ValueItem {
  title: string;
  subtitle: string;
  icon: ReactNode;
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

const VALUES: ValueItem[] = [
  {
    title: "Intentional Design",
    subtitle: "Everything we do starts with why",
    icon: (
      <svg {...iconProps}>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Made With Care",
    subtitle: "We believe in building better",
    icon: (
      <svg {...iconProps}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    ),
  },
  {
    title: "A Team With A Goal",
    subtitle: "Real people making great products",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

/** Three brand values in a hairline-ruled row; each cell inverts on hover. */
export function ValueProps() {
  return (
    <section aria-label="Valores" className="border-y border-white/10">
      <ul className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        {VALUES.map((value, i) => (
          <Reveal as="li" key={value.title} delay={i * 110}>
            <div className="group flex h-full min-h-[18rem] flex-col justify-between px-gutter py-10 text-dept-white transition-colors duration-500 ease-out-expo hover:bg-dept-white hover:text-dept-black md:min-h-[22rem]">
              <div className="flex items-start justify-between">
                <span className="transition-transform duration-500 ease-out-expo group-hover:-rotate-6 group-hover:scale-110">
                  {value.icon}
                </span>
                <span className="font-condensed text-[11px] tracking-[0.28em] text-dept-gray-500 transition-colors group-hover:text-dept-black/60">
                  0{i + 1}
                </span>
              </div>
              <div>
                <h3 className="font-display text-display-md">{value.title}</h3>
                <p className="mt-3 max-w-[26ch] text-sm text-dept-white/60 transition-colors group-hover:text-dept-black/70">
                  {value.subtitle}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
