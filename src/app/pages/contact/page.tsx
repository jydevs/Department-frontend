import type { Metadata } from "next";
import { LookbookGallery } from "@/components/community/LookbookGallery";
import { ContactForm } from "@/components/layout/ContactForm";
import { Button } from "@/components/ui/Button";
import { Marquee } from "@/components/ui/Marquee";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Community" };

const VALUES = ["INTENTIONAL DESIGN", "MADE WITH CARE", "A TEAM WITH A GOAL"];

/** Community ("Daregular Members"). The nav's COMMUNITY link points here. */
export default function CommunityPage() {
  return (
    <>
      <header className="px-gutter pb-16 pt-[calc(var(--chrome-h)+3rem)] md:pb-24">
        <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
          <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
          Comunidad
        </p>
        <h1 className="font-display text-display-xl text-dept-white">
          <span className="mask-line">
            <span className="mask-line-inner">Daregular{" "}</span>
          </span>
          <span className="mask-line">
            <span className="mask-line-inner" style={{ ["--d" as string]: "120ms" }}>
              Members
            </span>
          </span>
        </h1>
        <div className="mt-10 max-w-xl md:mt-14">
          <p className="font-display text-display-md text-dept-white">Regular Members Only.</p>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            We were not born to follow rules, but to rewrite them.
          </p>
        </div>
      </header>

      <section aria-label="Formulario de contacto" className="px-gutter py-section border-t border-white/10">
        <ContactForm />
      </section>

      <section aria-label="Lookbook" className="border-t border-white/10">
        <LookbookGallery />
      </section>

      <div className="border-y border-white/10 py-5 md:py-6">
        <Marquee
          items={VALUES}
          duration={35}
          itemClassName="font-display text-display-md text-transparent [-webkit-text-stroke:1.5px_var(--dept-white)]"
        />
      </div>

      <section className="px-gutter py-section">
        <Reveal>
          <h2 className="font-display text-display-xl max-w-5xl text-dept-white">
            Únete a Regular Members Only.
          </h2>
          <div className="mt-10 md:mt-14">
            <Button href="/collections/all" variant="red" size="lg" arrow>
              Ver la colección
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
