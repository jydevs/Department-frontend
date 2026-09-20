"use client";

import Link from "next/link";

const SUGGESTIONS = [
  { label: "Clothes", href: "/collections/all" },
  { label: "Men", href: "/collections/men" },
  { label: "Women", href: "/collections/women" },
] as const;

interface SearchSuggestionsProps {
  onNavigate: () => void;
}

/** "Sugerencias": quick links into the collections. Regular links in the Tab order. */
export function SearchSuggestions({ onNavigate }: SearchSuggestionsProps) {
  return (
    <nav aria-label="Sugerencias">
      <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">Sugerencias</p>
      <ul className="flex flex-wrap gap-3">
        {SUGGESTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              onClick={onNavigate}
              className="inline-flex h-11 items-center border border-white/20 px-6 font-condensed text-sm tracking-[0.14em] text-dept-white transition-colors duration-300 ease-out-expo hover:border-dept-white hover:bg-dept-white hover:text-dept-black"
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
