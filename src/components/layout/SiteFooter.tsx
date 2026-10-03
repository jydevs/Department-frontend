import Link from "next/link";
import type { SiteServerData } from "@/lib/cms/site";
import { blocksOf, bool, str, type CmsBlock } from "@/lib/cms/types";
import { safeHref } from "@/lib/url";
import { NewsletterFooter } from "./NewsletterFooter";
import { FooterAccountLinks } from "./FooterAccountLinks";
import { BackToTopButton } from "./BackToTopButton";
import { footerLinkClass } from "./footerStyles";

interface FooterLink {
  label: string;
  href: string;
}

const columnTitle = "mb-5 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500";

function LinkColumn({ title, links, className }: { title: string; links: FooterLink[]; className?: string }) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className={columnTitle}>{title}</h2>
      <ul className="flex flex-col items-start gap-3">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className={footerLinkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Enlaces de una columna: los del bloque (`links`) y/o los de un menú (`menuKey`, el del pie por defecto). */
function columnLinks(block: CmsBlock, footerMenu: FooterLink[]): FooterLink[] {
  const own = Array.isArray(block.settings.links) ? (block.settings.links as { label?: string; url?: string }[]) : [];
  const fromBlock = own.flatMap((l) => {
    const href = safeHref(l.url);
    return href && l.label ? [{ label: l.label, href }] : [];
  });
  return str(block.settings, "menuKey") ? [...footerMenu, ...fromBlock] : fromBlock;
}

/** Pie de página dirigido por el CMS (plantilla `layout`: sección `footer` + sección `newsletter`). */
export function SiteFooter({ site }: { site: SiteServerData }) {
  const f = site.footerSection?.settings ?? {};
  const columns = site.footerSection ? blocksOf(site.footerSection) : [];
  const footerMenu = site.footerMenu.map((n) => ({ label: n.label, href: n.href }));
  const social = Object.entries(site.settings?.social ?? {}).flatMap(([name, url]) => {
    const href = safeHref(url);
    return href ? [{ name, href }] : [];
  });
  // Respaldo mínimo SOLO si el CMS no aporta ningún enlace al pie (menú `footer` vacío y columnas sin enlaces):
  // así la tienda siempre ofrece una vía de contacto. En cuanto el CMS tiene enlaces manda el CMS.
  const hasCmsLinks = footerMenu.length > 0 || columns.some((b) => b.type !== "account-links" && columnLinks(b, footerMenu).length > 0);
  const fallbackLinks: FooterLink[] = [{ label: "Contacto", href: "/pages/contact" }];
  const brand = site.client.brandName;
  const wordmark = str(f, "wordmark", brand);

  return (
    <footer data-testid="footer" className="mt-auto bg-dept-black text-dept-white">
      {(site.newsletterSection || bool(f, "showNewsletter")) && (
        <div className="border-t border-white/10">
          <NewsletterFooter settings={site.newsletterSection?.settings ?? {}} />
        </div>
      )}

      {/* link columns */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 border-t border-white/10 px-gutter py-14 md:grid-cols-12 md:gap-x-8">
        <div className="col-span-2 md:col-span-5">
          <p className="font-display text-display-md text-dept-white">{str(f, "brandTitle", site.client.tagline)}</p>
          {str(f, "brandText") && <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">{str(f, "brandText")}</p>}
        </div>

        {columns.map((block, i) =>
          block.type === "account-links" ? (
            <nav key={block.id} aria-label={str(block.settings, "title", "Cuenta")} className="md:col-span-2">
              <h2 className={columnTitle}>{str(block.settings, "title", "Cuenta")}</h2>
              <FooterAccountLinks accountLabel={str(block.settings, "accountLabel", "Mi cuenta")} cartLabel={str(block.settings, "cartLabel", "Carrito")} />
            </nav>
          ) : (
            <LinkColumn
              key={block.id}
              title={str(block.settings, "title", "Enlaces")}
              links={columnLinks(block, footerMenu)}
              className={i === 0 ? "md:col-span-2 md:col-start-7" : "md:col-span-2"}
            />
          ),
        )}

        {!hasCmsLinks && <LinkColumn title="Ayuda" links={fallbackLinks} className="md:col-span-2 md:col-start-7" />}

        {bool(f, "showSocial", true) && social.length > 0 && (
          <nav aria-label="Redes sociales" className="col-span-2 md:col-span-12">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {social.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={footerLinkClass}>
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* giant wordmark — decorative, bleeds off the bottom edge */}
      {bool(f, "showWordmark", true) && wordmark && (
        <div className="overflow-hidden border-t border-white/10 pt-6 md:pt-10" aria-hidden>
          <p className="font-display translate-y-[12%] select-none whitespace-nowrap text-center text-[14.6vw] leading-[0.9] text-dept-gray-900 transition-colors duration-500 ease-out-expo hover:text-transparent hover:[-webkit-text-stroke:2px_var(--dept-red)]">
            {wordmark}
          </p>
        </div>
      )}

      {/* bottom bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 px-gutter py-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
        <p>{str(f, "copyright", `© ${new Date().getFullYear()} ${brand}`)}</p>
        {str(f, "bottomText") && <p>{str(f, "bottomText")}</p>}
        <BackToTopButton label={str(f, "backToTopLabel", "Volver arriba")} />
      </div>
    </footer>
  );
}
