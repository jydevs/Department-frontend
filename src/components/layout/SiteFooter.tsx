import Link from "next/link";
import type { ReactNode } from "react";
import { NewsletterFooter, type NewsletterConfig } from "./NewsletterFooter";
import { FooterAccountLinks } from "./FooterAccountLinks";
import { BackToTopButton } from "./BackToTopButton";
import { footerLinkClass } from "./footerStyles";

export interface FooterLink {
  label: string;
  href: string;
}

export type FooterColumn =
  | { kind: "links"; id: string; title: string; links: FooterLink[] }
  | { kind: "account"; id: string; title: string; accountLabel: string; cartLabel: string };

/** Everything the footer needs, resolved on the server from the `footer` + `newsletter` sections and settings/site. */
export interface FooterConfig {
  brandTitle?: string;
  brandText?: string;
  columns: FooterColumn[];
  /** social profiles from settings/site.social (only the ones that have a URL) */
  social: FooterLink[];
  showSocial: boolean;
  wordmark?: string;
  copyright?: string;
  bottomText?: string;
  backToTopLabel?: string;
  backgroundColor?: string;
  newsletter: NewsletterConfig | null;
}

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
          <li key={`${link.label}-${link.href}`}>
            <Link href={link.href} className={footerLinkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter({ config }: { config: FooterConfig }) {
  const { columns } = config;
  const brandSpan = columns.length <= 3 ? "md:col-span-5" : "md:col-span-4";
  const firstStart = columns.length <= 3 ? "md:col-start-7" : "md:col-start-5";

  return (
    <footer
      data-testid="footer"
      className="mt-auto bg-dept-black text-dept-white"
      style={config.backgroundColor ? { backgroundColor: config.backgroundColor } : undefined}
    >
      {config.newsletter && (
        <div className="border-t border-white/10">
          <NewsletterFooter config={config.newsletter} />
        </div>
      )}

      {/* link columns */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 border-t border-white/10 px-gutter py-14 md:grid-cols-12 md:gap-x-8">
        <div className={`col-span-2 ${brandSpan}`}>
          {config.brandTitle && <p className="font-display text-display-md text-dept-white">{config.brandTitle}</p>}
          {config.brandText && (
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">{config.brandText}</p>
          )}
          {config.showSocial && config.social.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3" aria-label="Redes sociales">
              {config.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} rel="noopener noreferrer" target="_blank" className={footerLinkClass}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {columns.map((column, i): ReactNode => {
          const className = `md:col-span-2 ${i === 0 ? firstStart : ""}`;
          if (column.kind === "links") {
            return <LinkColumn key={column.id} title={column.title} links={column.links} className={className} />;
          }
          return (
            <nav key={column.id} aria-label={column.title} className={className}>
              <h2 className={columnTitle}>{column.title}</h2>
              <FooterAccountLinks accountLabel={column.accountLabel} cartLabel={column.cartLabel} />
            </nav>
          );
        })}
      </div>

      {/* giant wordmark — decorative, bleeds off the bottom edge */}
      {config.wordmark && (
        <div className="overflow-hidden border-t border-white/10 pt-6 md:pt-10" aria-hidden>
          <p className="font-display translate-y-[12%] select-none whitespace-nowrap text-center text-[14.6vw] leading-[0.9] text-dept-gray-900 transition-colors duration-500 ease-out-expo hover:text-transparent hover:[-webkit-text-stroke:2px_var(--dept-red)]">
            {config.wordmark}
          </p>
        </div>
      )}

      {/* bottom bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 px-gutter py-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
        <p>{config.copyright}</p>
        <p>{config.bottomText}</p>
        <BackToTopButton label={config.backToTopLabel} />
      </div>
    </footer>
  );
}
