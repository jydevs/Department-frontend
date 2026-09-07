import { ReactNode } from "react";

interface ValueItem {
  title: string;
  subtitle: string;
  icon: ReactNode;
}

const VALUES: ValueItem[] = [
  {
    title: "INTENTIONAL DESIGN",
    subtitle: "Everything we do starts with why",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-dept-white"
        aria-hidden="true"
      >
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "MADE WITH CARE",
    subtitle: "We believe in building better",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-dept-white"
        aria-hidden="true"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    ),
  },
  {
    title: "A TEAM WITH A GOAL",
    subtitle: "Real people making great products",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-dept-white"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export function ValueProps() {
  return (
    <section className="grid grid-cols-1 gap-10 bg-dept-black px-6 py-16 text-center sm:grid-cols-3 sm:gap-6">
      {VALUES.map((value) => (
        <div key={value.title} className="flex flex-col items-center gap-3">
          {value.icon}
          <h3 className="font-display text-base text-dept-white sm:text-lg">
            {value.title}
          </h3>
          <p className="font-body max-w-[22ch] text-xs text-dept-white/70">
            {value.subtitle}
          </p>
        </div>
      ))}
    </section>
  );
}
