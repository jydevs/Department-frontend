"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { useCart } from "@/lib/cart";
import { useCustomer } from "@/lib/account/useCustomer";
import type { NavItem } from "@/lib/cms/links";
import { Marquee } from "@/components/ui/Marquee";
import { Logo } from "./Logo";
import { useOverlay } from "./OverlayProvider";
import { useChromeState } from "./useChromeState";

/** Everything the header needs, resolved on the server from settings/site, menu/main and the `site-header` section. */
export interface HeaderConfig {
  brandName: string;
  logoUrl?: string;
  /** text of the drawn wordmark when there is no logo image (settings/site → brand.logoText) */
  logoText: string;
  logoVariant: "red" | "black";
  /** first level of the main menu (children feed the mobile menu) */
  nav: NavItem[];
  /** menu flattened for the mobile overlay: parent followed by its children */
  mobileLinks: { id: string; label: string; href: string }[];
  /** products in the shop, shown as a superscript next to the link to the "all" collection */
  productCount: number | null;
  announcement: {
    items: string[];
    href?: string;
    backgroundColor?: string;
    textColor?: string;
    separator: string;
    duration: number;
  } | null;
  showSearch: boolean;
  showAccount: boolean;
  showCart: boolean;
  transparentOnHero: boolean;
  homeAriaLabel: string;
  searchLabel: string;
  accountLabel: string;
  cartLabel: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
  navLabel: string;
  mobileMenuLabel: string;
  mobileMenuTagline: string;
}

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  if (item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return item.children.some((c) => isActive(c, pathname));
}

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
 * Navigation, labels and the ticker come from the CMS (see `HeaderConfig`).
 */
export function Header({ config }: { config: HeaderConfig }) {
  const pathname = usePathname();
  const chrome = useChromeState();
  const { openAccount, openCart, openSearch } = useOverlay();
  const { count } = useCart();
  const { status: sessionStatus, customer } = useCustomer();
  const signedIn = sessionStatus === "authenticated" && customer !== null;
  const accountAria = signedIn ? `${config.accountLabel}, ${customer.firstName}` : config.accountLabel;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const overlayPage = config.transparentOnHero && hasHero(pathname);
  const atTop = chrome === "top";
  const solid = !overlayPage || !atTop || menuOpen;
  const hidden = chrome === "hidden" && !menuOpen;
  const { announcement } = config;

  // Mobile menu as a modal: focus moves into it, the page behind (main + footer) is `inert`, Escape closes it and
  // gives the focus back to the button that opened it; the body does not scroll meanwhile
  useEffect(() => {
    if (!menuOpen) return;
    const behind = [document.getElementById("main"), ...Array.from(document.body.querySelectorAll(":scope > footer"))].filter((el): el is HTMLElement => el !== null);
    behind.forEach((el) => el.setAttribute("inert", ""));
    // the panel fades in from `visibility: hidden`, which cannot take focus until the transition has started
    const focusTimer = window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>("a[href], button")?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      behind.forEach((el) => el.removeAttribute("inert"));
    };
  }, [menuOpen]);

  // "/" or ⌘/Ctrl+K opens search (unless the user is typing somewhere)
  useEffect(() => {
    if (!config.showSearch) return;
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
  }, [openSearch, config.showSearch]);

  const ticker = announcement && (
    <Marquee
      items={announcement.items}
      duration={announcement.duration}
      separator={announcement.separator}
      separatorClassName="opacity-70"
      itemClassName="font-condensed text-[11px] tracking-[0.24em]"
      className="w-full"
    />
  );

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
        {announcement && (
          <div
            className={clsx(
              "relative grid transition-[grid-template-rows] duration-500 ease-out-expo",
              atTop ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className="flex h-[var(--announce-h)] items-center bg-dept-red text-dept-white"
                style={{
                  ...(announcement.backgroundColor ? { backgroundColor: announcement.backgroundColor } : null),
                  ...(announcement.textColor ? { color: announcement.textColor } : null),
                }}
              >
                {announcement.href ? (
                  <Link href={announcement.href} className="block w-full">
                    {ticker}
                  </Link>
                ) : (
                  ticker
                )}
              </div>
            </div>
          </div>
        )}

        {/* main bar */}
        <div className="relative grid h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center px-gutter">
          <nav aria-label={config.navLabel} className="flex items-center">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? config.menuCloseLabel : config.menuOpenLabel}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              data-testid="mobile-menu"
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
              {config.nav.map((item) => {
                const active = isActive(item, pathname);
                const sup =
                  item.collectionHandle === "all" && config.productCount !== null
                    ? String(config.productCount).padStart(2, "0")
                    : undefined;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      data-testid={item.href === "/collections/all" ? "nav-link-collections" : undefined}
                      className="link-underline font-condensed inline-flex items-start gap-1.5 py-1 text-[13px] tracking-[0.2em] text-dept-white"
                    >
                      {item.label}
                      {sup && (
                        <span aria-hidden className="mt-px text-[9px] leading-none tracking-normal text-dept-gray-300">
                          {sup}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Link
            href="/"
            data-testid="logo"
            aria-label={config.homeAriaLabel}
            className="justify-self-center px-2 transition-opacity duration-300 hover:opacity-80"
          >
            <Logo
              variant={config.logoVariant}
              size="lg"
              imageUrl={config.logoUrl}
              text={config.logoText}
              title={config.brandName}
              className="h-8 w-auto md:h-10"
            />
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            {config.showSearch && (
              <button
                type="button"
                aria-label={config.searchLabel}
                data-testid="search-button"
                onClick={openSearch}
                className={iconBtn}
              >
                <Icon>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </Icon>
              </button>
            )}
            {config.showAccount && (
              <button
                type="button"
                aria-label={accountAria}
                data-testid="account-button"
                data-session={sessionStatus}
                aria-haspopup="dialog"
                onClick={openAccount}
                className={clsx(iconBtn, "hidden sm:flex")}
              >
                <Icon>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                </Icon>
                {signedIn && <span aria-hidden data-testid="account-signed-in" className="absolute right-2 top-2.5 h-2 w-2 rounded-full bg-dept-red ring-2 ring-black" />}
              </button>
            )}
            {config.showCart && (
              <button
                type="button"
                aria-label={count ? `${config.cartLabel}, ${count} artículos` : config.cartLabel}
                data-testid="cart-button"
                aria-haspopup="dialog"
                onClick={openCart}
                className={clsx(iconBtn, "-mr-3")}
              >
                <Icon>
                  <path d="M5 8h14l-1.2 12H6.2L5 8z" />
                  <path d="M9 8V7a3 3 0 016 0v1" />
                </Icon>
                <span
                  key={count}
                  data-testid="cart-counter"
                  className="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] animate-[pop_0.4s_var(--ease-out-expo)] items-center justify-center bg-dept-red px-1 font-condensed text-[10px] leading-none tracking-normal text-dept-white"
                >
                  {count}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* full-screen mobile menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        inert={!menuOpen}
        className={clsx(
          "fixed inset-0 z-40 flex flex-col justify-between bg-dept-black px-gutter pb-8 pt-[calc(var(--chrome-h)+1.5rem)] transition-[opacity,visibility] duration-500 md:hidden",
          menuOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav aria-label={config.mobileMenuLabel}>
          <ul>
            {config.mobileLinks.map((link, i) => (
              <li key={link.id} className="border-b border-white/10">
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
            {config.mobileMenuTagline}
          </p>
          <div className="flex gap-3">
            {config.showAccount && (
              <button
                type="button"
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => {
                  setMenuOpen(false);
                  openAccount();
                }}
                className="font-condensed border border-white/25 px-4 py-2.5 text-[11px] tracking-[0.2em] text-dept-white"
              >
                {signedIn ? customer.firstName : config.accountLabel}
              </button>
            )}
            {config.showCart && (
              <button
                type="button"
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => {
                  setMenuOpen(false);
                  openCart();
                }}
                className="font-condensed border border-white/25 px-4 py-2.5 text-[11px] tracking-[0.2em] text-dept-white"
              >
                {config.cartLabel}
                {count ? ` (${count})` : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
