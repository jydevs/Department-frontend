"use client";

import Link from "next/link";
import type { SearchSuggestion } from "./config";

interface SearchSuggestionsProps {
  title: string;
  suggestions: SearchSuggestion[];
  onNavigate: () => void;
}

/** "Sugerencias": quick links into the collections. Regular links in the Tab order. */
export function SearchSuggestions({ title, suggestions, onNavigate }: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;
  return (
    <nav aria-label={title}>
      <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">{title}</p>
      <ul className="flex flex-wrap gap-3">
        {suggestions.map((s) => (
          <li key={`${s.label}-${s.href}`}>
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
