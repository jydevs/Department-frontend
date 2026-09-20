import Link from "next/link";
import { NewsletterFooter } from "./NewsletterFooter";
import { FooterAccountLinks } from "./FooterAccountLinks";
import { BackToTopButton } from "./BackToTopButton";
import { footerLinkClass } from "./footerStyles";

interface FooterLink {
  label: string;
  href: string;
}

const SHOP_LINKS: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "Clothes", href: "/collections/all" },
  { label: "Men", href: "/collections/men" },
  { label: "Women", href: "/collections/women" },
];

const COMMUNITY_LINKS: FooterLink[] = [{ label: "Community", href: "/pages/contact" }];

const columnTitle = "mb-5 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500";

function LinkColumn({
  title,
  links,
  className,
}: {
  title: string;
  links: FooterLink[];
  className?: string;
}) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className={columnTitle}>{title}</h2>
      <ul className="flex flex-col items-start gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={footerLinkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-dept-black text-dept-white">
      <div className="border-t border-white/10">
        <NewsletterFooter />
      </div>

      {/* link columns */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 border-t border-white/10 px-gutter py-14 md:grid-cols-12 md:gap-x-8">
        <div className="col-span-2 md:col-span-5">
          <p className="font-display text-display-md text-dept-white">Uniforms for the unnoticed.</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
            Este proyecto es el primer lanzamiento oficial de Disruptive Dept, una marca que no
            diseña ropa, sino mensajes.
          </p>
        </div>

        <LinkColumn title="Tienda" links={SHOP_LINKS} className="md:col-span-2 md:col-start-7" />
        <LinkColumn title="Comunidad" links={COMMUNITY_LINKS} className="md:col-span-2" />

        <nav aria-label="Cuenta" className="md:col-span-2">
          <h2 className={columnTitle}>Cuenta</h2>
          <FooterAccountLinks />
        </nav>
        {/* TODO: redes sociales cuando haya URLs oficiales */}
      </div>

      {/* giant wordmark — decorative, bleeds off the bottom edge */}
      <div className="overflow-hidden border-t border-white/10 pt-6 md:pt-10" aria-hidden>
        <p className="font-display translate-y-[12%] select-none whitespace-nowrap text-center text-[14.6vw] leading-[0.9] text-dept-gray-900 transition-colors duration-500 ease-out-expo hover:text-transparent hover:[-webkit-text-stroke:2px_var(--dept-red)]">
          Daregular Dept.
        </p>
      </div>

      {/* bottom bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 px-gutter py-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
        <p>© 2026 Daregular Dept.</p>
        <p>Colombia · COP</p>
        <BackToTopButton />
      </div>
    </footer>
  );
}
