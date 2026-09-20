"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { useCart } from "@/lib/cart";
import { products } from "@/data/products";
import { Marquee } from "@/components/ui/Marquee";
import { Logo } from "./Logo";
import { useOverlay } from "./OverlayProvider";
import { useChromeState } from "./useChromeState";

interface NavItem {
  label: string;
  href: string;
  /** small superscript, e.g. number of pieces */
  sup?: string;
  active: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { label: "Home", href: "/", active: (p) => p === "/" },
  {
    label: "Clothes",
    href: "/collections/all",
    sup: String(products.length).padStart(2, "0"),
    active: (p) => p.startsWith("/collections") || p.startsWith("/products"),
  },
  { label: "Community", href: "/pages/contact", active: (p) => p.startsWith("/pages") },
];

const MENU_LINKS = [
  { label: "Home", href: "/" },
  { label: "Clothes", href: "/collections/all" },
  { label: "Men", href: "/collections/men" },
  { label: "Women", href: "/collections/women" },
  { label: "Community", href: "/pages/contact" },
];

const ANNOUNCEMENT = [
  "Rags to Riches — Extended Version",
  "Uniforms for the unnoticed",
  "Regular members only",
  "Precios en COP",
];

/** pages that open on a full-bleed photo: the header starts transparent there */
function hasHero(pathname: string) {
  return pathname === "/" || pathname.startsWith("/collections");
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const iconBtn =
  "relative flex h-11 w-11 items-center justify-center text-dept-white transition-[opacity,transform] duration-300 ease-out-expo hover:opacity-70 active:scale-95";

/**
 * Fixed site header: announcement ticker + main bar.
 * - transparent over hero photography, frosted black once scrolled / on inner pages
 * - hides while scrolling down, returns on scroll up (or keyboard focus)
 * - cart counter, search shortcut ("/" or ⌘/Ctrl+K), full-screen mobile menu
 */
export function Header() {
  const pathname = usePathname();
  const chrome = useChromeState();
  const { openAccount, openCart, openSearch } = useOverlay();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const overlayPage = hasHero(pathname);
  const atTop = chrome === "top";
  const solid = !overlayPage || !atTop || menuOpen;
  const hidden = chrome === "hidden" && !menuOpen;

  // Escape closes the mobile menu; lock body scroll while it is open
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  // "/" or ⌘/Ctrl+K opens search (unless the user is typing somewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-out-expo focus-within:translate-y-0",
          hidden && "-translate-y-full",
        )}
      >
        {/* backgrounds: scrim over photography ⇄ frosted black */}
        <div
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent transition-opacity duration-500",
            solid ? "opacity-0" : "opacity-100",
          )}
        />
        <div
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-0 border-b border-white/10 bg-black/80 backdrop-blur-xl transition-opacity duration-500",
            solid ? "opacity-100" : "opacity-0",
          )}
        />

        {/* announcement ticker — collapses once the page scrolls */}
        <div
          className={clsx(
            "relative grid transition-[grid-template-rows] duration-500 ease-out-expo",
            atTop ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex h-[var(--announce-h)] items-center bg-dept-red text-dept-white">
              <Marquee
                items={ANNOUNCEMENT}
                duration={38}
                separator="✦"
                separatorClassName="text-dept-white/70"
                itemClassName="font-condensed text-[11px] tracking-[0.24em]"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* main bar */}
        <div className="relative grid h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center px-gutter">
          <nav aria-label="Principal" className="flex items-center">
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="-ml-3 flex h-11 w-11 flex-col items-center justify-center gap-[6px] md:hidden"
            >
              <span
                className={clsx(
                  "block h-px w-6 bg-dept-white transition-transform duration-300 ease-out-expo",
                  menuOpen && "translate-y-[3.5px] rotate-45",
                )}
              />
              <span
                className={clsx(
                  "block h-px w-6 bg-dept-white transition-transform duration-300 ease-out-expo",
                  menuOpen && "-translate-y-[3.5px] -rotate-45",
                )}
              />
            </button>

            <ul className="hidden items-center gap-9 md:flex">
              {NAV.map((item) => {
                const active = item.active(pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="link-underline font-condensed inline-flex items-start gap-1 py-1 text-[13px] tracking-[0.2em] text-dept-white"
                    >
                      {item.label}
                      {item.sup && (
                        <sup className="mt-[-2px] text-[9px] tracking-normal text-dept-gray-300">
                          {item.sup}
                        </sup>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Link
            href="/"
            aria-label="Daregular Dept. — inicio"
            className="justify-self-center px-2 transition-opacity duration-300 hover:opacity-80"
          >
            <Logo variant="red" size="lg" className="h-8 w-auto md:h-10" />
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            <button type="button" aria-label="Buscar" onClick={openSearch} className={iconBtn}>
              <Icon>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </Icon>
            </button>
            <button
              type="button"
              aria-label="Cuenta"
              aria-haspopup="dialog"
              onClick={openAccount}
              className={clsx(iconBtn, "hidden sm:flex")}
            >
              <Icon>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </Icon>
            </button>
            <button
              type="button"
              aria-label={count ? `Carrito, ${count} artículos` : "Carrito"}
              aria-haspopup="dialog"
              onClick={openCart}
              className={clsx(iconBtn, "-mr-3")}
            >
              <Icon>
                <path d="M5 8h14l-1.2 12H6.2L5 8z" />
                <path d="M9 8V7a3 3 0 016 0v1" />
              </Icon>
              {count > 0 && (
                <span
                  key={count}
                  className="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] animate-[pop_0.4s_var(--ease-out-expo)] items-center justify-center bg-dept-red px-1 font-condensed text-[10px] leading-none tracking-normal text-dept-white"
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* full-screen mobile menu */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={clsx(
          "fixed inset-0 z-40 flex flex-col justify-between bg-dept-black px-gutter pb-8 pt-[calc(var(--chrome-h)+1.5rem)] transition-[opacity,visibility] duration-500 md:hidden",
          menuOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav aria-label="Menú">
          <ul>
            {MENU_LINKS.map((link, i) => (
              <li key={link.href} className="border-b border-white/10">
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  tabIndex={menuOpen ? 0 : -1}
                  className="group flex items-baseline justify-between py-3"
                >
                  <span className="mask-line">
                    <span
                      className={clsx(
                        "font-display block text-display-xl text-dept-white transition-colors group-hover:text-dept-red",
                        menuOpen && "mask-line-inner",
                      )}
                      style={{ ["--d" as string]: `${120 + i * 70}ms` }}
                    >
                      {link.label}
                    </span>
                  </span>
                  <span className="font-condensed text-[11px] tracking-[0.2em] text-dept-gray-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-end justify-between gap-6">
          <p className="max-w-[16ch] font-condensed text-[11px] leading-relaxed tracking-[0.2em] text-dept-gray-500">
            Uniforms for the unnoticed.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                setMenuOpen(false);
                openAccount();
              }}
              className="font-condensed border border-white/25 px-4 py-2.5 text-[11px] tracking-[0.2em] text-dept-white"
            >
              Cuenta
            </button>
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                setMenuOpen(false);
                openCart();
              }}
              className="font-condensed border border-white/25 px-4 py-2.5 text-[11px] tracking-[0.2em] text-dept-white"
            >
              Carrito{count ? ` (${count})` : ""}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
