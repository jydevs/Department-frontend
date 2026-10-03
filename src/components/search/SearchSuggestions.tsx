"use client";

import Link from "next/link";
import { safeHref } from "@/lib/url";
import { cfg, useSite } from "@/components/layout/SiteProvider";

interface SearchSuggestionsProps {
  onNavigate: () => void;
}

/** "Sugerencias": accesos rápidos editables en el CMS (bloques `suggestion` de la plantilla `search`). Enlaces normales en el orden de Tab. */
export function SearchSuggestions({ onNavigate }: SearchSuggestionsProps) {
  const { search } = useSite();
  const title = cfg(search.settings).str("suggestionsTitle", "Sugerencias");
  const items = search.suggestions.flatMap((s) => {
    const href = safeHref(s.url);
    return href && s.label ? [{ label: s.label, href }] : [];
  });
  if (!items.length) return null;
  return (
    <nav aria-label={title}>
      <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">{title}</p>
      <ul className="flex flex-wrap gap-3">
        {items.map((s) => (
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
