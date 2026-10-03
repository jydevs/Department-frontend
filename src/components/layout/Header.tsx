"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { useCart } from "@/lib/cart";
import { safeLinkHref } from "@/lib/cms/href";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { Marquee } from "@/components/ui/Marquee";
import { Logo } from "./Logo";
import { useOverlay } from "./OverlayProvider";
import { useChromeState } from "./useChromeState";
import { cfg, useSite } from "./SiteProvider";

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
  /** el menú se cierra para abrir otro panel (cuenta/carrito): ese panel se queda con el foco */
  const handOffFocus = useRef(false);
  const site = useSite();
  const h = cfg(site.header);
  const showSearch = h.bool("showSearch", true), showAccount = h.bool("showAccount", true), showCart = h.bool("showCart", true);
  const showCount = h.bool("showProductCount", true);
  const logoVariant = h.str("logoVariant", "red") === "black" ? "black" : "red";
  const L = {
    home: h.str("homeAriaLabel", "Daregular Dept. — inicio"), search: h.str("searchLabel", "Buscar"), account: h.str("accountLabel", "Cuenta"),
    cart: h.str("cartLabel", "Carrito"), open: h.str("menuOpenLabel", "Abrir menú"), close: h.str("menuCloseLabel", "Cerrar menú"),
    nav: h.str("navLabel", "Principal"), mobile: h.str("mobileMenuLabel", "Menú"), tagline: h.str("mobileMenuTagline", site.tagline),
  };
  const ann = site.announcement;
  const showAnn = h.bool("showAnnouncement", true) && ann.enabled && ann.items.length > 0;
  // enlaces: nivel 1 del menú; en móvil también sus hijos
  // los enlaces del CMS se revalidan aquí también (https, mailto, tel o ruta propia; lo demás → "/")
  const nav = site.nav.map((n) => ({ ...n, href: safeLinkHref(n.href), sup: showCount && n.isCatalog ? String(site.productCount).padStart(2, "0") : undefined }));
  const MENU_LINKS = site.nav.flatMap((n) => [{ label: n.label, href: n.href }, ...n.children]).map((l) => ({ ...l, href: safeLinkHref(l.href) }));
  const isActive = (href: string, isCatalog: boolean) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (isCatalog && (pathname.startsWith("/collections") || pathname.startsWith("/products")));

  const overlayPage = h.bool("transparentOnHero", true) && hasHero(pathname);
  const atTop = chrome === "top";
  const solid = !overlayPage || !atTop || menuOpen;
  const hidden = chrome === "hidden" && !menuOpen;

  // menú móvil abierto: el foco queda dentro (header + menú), Escape lo cierra y al cerrar vuelve al botón que lo abrió
  const trapRef = useFocusTrap<HTMLDivElement>({
    active: menuOpen,
    onEscape: () => setMenuOpen(false),
    initialFocus: "#mobile-menu a",
    restoreFocus: () => {
      const restore = !handOffFocus.current;
      handOffFocus.current = false;
      return restore;
    },
  });

  // lock body scroll while the mobile menu is open; ciérralo si la ventana pasa a escritorio (el menú móvil se oculta)
  useEffect(() => {
    if (!menuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
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
    <div ref={trapRef}>
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

        {!showAnn && <style>{":root{--announce-h:0px}"}</style>}
        {/* announcement ticker — collapses once the page scrolls */}
        <div
          className={clsx(
            "relative grid transition-[grid-template-rows] duration-500 ease-out-expo",
            atTop && showAnn ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="flex h-[var(--announce-h)] items-center bg-dept-red text-dept-white"
              style={{ background: ann.backgroundColor || undefined, color: ann.textColor || undefined }}
            >
              <Marquee
                items={ann.items}
                duration={ann.duration}
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
          <nav aria-label={L.nav} className="flex items-center">
            <button
              type="button"
              aria-label={menuOpen ? L.close : L.open}
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
              {nav.map((item, ni) => {
                const active = isActive(item.href, item.isCatalog);
                return (
                  <li key={`${item.href}-${ni}`}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      data-testid={item.href === "/collections/all" ? "nav-link-collections" : undefined}
                      className="link-underline font-condensed inline-flex items-start gap-1.5 py-1 text-[13px] tracking-[0.2em] text-dept-white"
                    >
                      {item.label}
                      {item.sup && (
                        <span aria-hidden className="mt-px text-[9px] leading-none tracking-normal text-dept-gray-300">
                          {item.sup}
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
            aria-label={L.home}
            className="justify-self-center px-2 transition-opacity duration-300 hover:opacity-80"
          >
            <Logo variant={logoVariant} size="lg" className="h-8 w-auto md:h-10" />
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            {showSearch && <button
              type="button"
              aria-label={L.search}
              data-testid="search-button"
              onClick={openSearch}
              className={iconBtn}
            >
              <Icon>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </Icon>
            </button>}
            {showAccount && <button
              type="button"
              aria-label={L.account}
              data-testid="account-button"
              aria-haspopup="dialog"
              onClick={openAccount}
              className={clsx(iconBtn, "hidden sm:flex")}
            >
              <Icon>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </Icon>
            </button>}
            {showCart && <button
              type="button"
              aria-label={count ? `${L.cart}, ${count} artículos` : L.cart}
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
            </button>}
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
        <nav aria-label={L.mobile}>
          <ul>
            {MENU_LINKS.map((link, i) => (
              <li key={`${link.href}-${i}`} className="border-b border-white/10">
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
            {L.tagline}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                handOffFocus.current = true;
                setMenuOpen(false);
                openAccount();
              }}
              className="font-condensed border border-white/25 px-4 py-2.5 text-[11px] tracking-[0.2em] text-dept-white"
            >
              {L.account}
            </button>
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                handOffFocus.current = true;
                setMenuOpen(false);
                openCart();
              }}
              className="font-condensed border border-white/25 px-4 py-2.5 text-[11px] tracking-[0.2em] text-dept-white"
            >
              {L.cart}{count ? ` (${count})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
