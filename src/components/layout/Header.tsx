"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { label: "HOME", href: "/" },
  { label: "CLOTHES", href: "/collections/all" },
  { label: "COMMUNITY", href: "/pages/contact" },
];

type HeaderVariant = "overlay" | "solid";

/**
 * Determines which header variant to use based on the current pathname.
 * @param pathname - The current pathname from usePathname()
 * @returns "overlay" for /, /collections/*, "solid" for all others
 */
function getHeaderVariant(pathname: string): HeaderVariant {
  if (pathname === "/" || pathname.startsWith("/collections")) {
    return "overlay";
  }
  return "solid";
}

/**
 * Real site header with two variants (overlay and solid), responsive mobile menu,
 * and full accessibility. Center logo, side nav, and icon controls.
 */
export function Header() {
  const pathname = usePathname();
  const variant = getHeaderVariant(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isOverlay = variant === "overlay";
  const textColor = isOverlay ? "text-dept-white" : "text-dept-black";
  const bgColor = isOverlay ? "" : "bg-dept-white";
  const borderClass = isOverlay ? "" : "border-b border-dept-gray-100";
  const positionClass = isOverlay ? "absolute inset-x-0 top-0" : "sticky top-0";

  return (
    <header
      className={clsx(
        "z-50 w-full",
        positionClass,
        bgColor,
        borderClass,
        isOverlay && "bg-gradient-to-b from-black/40 to-transparent",
      )}
    >
      {/* Scrim overlay for accessibility on overlay variant */}
      {isOverlay && <div className="absolute inset-0 pointer-events-none" />}

      <nav
        aria-label="Principal"
        className={clsx(
          "relative flex items-center justify-between px-6 py-5",
          "md:px-24 md:py-5",
        )}
      >
        {/* LEFT: Hamburger menu (mobile) + Nav links (desktop) */}
        <div className="flex items-center gap-7">
          {/* Mobile hamburger button */}
          <button
            type="button"
            className="md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
            aria-label="Menú"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className={clsx("w-6 h-6 transition-colors", textColor)}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "font-condensed text-xs leading-tight",
                  textColor,
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded px-1",
                  "transition-opacity hover:opacity-70",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* CENTER: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link
            href="/"
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded px-2 py-1"
            aria-label="Daregular Dept. — inicio"
          >
            <Logo variant={isOverlay ? "red" : "black"} />
          </Link>
        </div>

        {/* RIGHT: Icon buttons (search, account, cart) */}
        <div className="flex items-center gap-4">
          {/* Search icon (desktop only) */}
          <button
            type="button"
            className={clsx(
              "hidden sm:flex items-center justify-center w-5 h-5",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
              "transition-opacity hover:opacity-70",
            )}
            aria-label="Buscar"
            /* TODO: wired in feature/overlay-state */
          >
            <svg
              className={clsx("w-5 h-5", textColor)}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          {/* Account icon */}
          <button
            type="button"
            className={clsx(
              "flex items-center justify-center w-5 h-5",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
              "transition-opacity hover:opacity-70",
            )}
            aria-label="Cuenta"
            /* TODO: wired in feature/overlay-state */
          >
            <svg
              className={clsx("w-5 h-5", textColor)}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>

          {/* Cart icon */}
          <button
            type="button"
            className={clsx(
              "flex items-center justify-center w-5 h-5",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
              "transition-opacity hover:opacity-70",
            )}
            aria-label="Carrito"
            /* TODO: wired in feature/overlay-state */
          >
            <svg
              className={clsx("w-5 h-5", textColor)}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          className={clsx(
            "md:hidden border-t",
            isOverlay ? "border-dept-white/20 bg-black/80 backdrop-blur-sm" : "border-dept-gray-100 bg-dept-white",
          )}
        >
          <div className="flex flex-col px-6 py-6 gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "font-condensed text-lg leading-tight",
                  textColor,
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded px-1",
                  "transition-opacity hover:opacity-70",
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
