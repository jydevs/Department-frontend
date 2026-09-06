import Link from "next/link";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Clothes", href: "/collections/all" },
  { label: "Community", href: "/pages/contact" },
];

/**
 * SCAFFOLD STUB — minimal top bar so every page has chrome.
 * `feature/navbar` replaces this with the real transparent/solid header,
 * search / account / cart icons, and the two logo variants.
 */
export function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5">
      <nav className="flex gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-condensed text-sm text-dept-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Link href="/" aria-label="Daregular Dept. — home">
        <Logo variant="red" />
      </Link>
      <div className="font-condensed text-sm text-dept-white">Search · Account · Cart</div>
    </header>
  );
}
