import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Manifesto: photograph on the left, the campaign text on the right — the first
 * paragraph is set as a large lede, the rest as body copy.
 */
const LEDE =
  "Este proyecto es el primer lanzamiento oficial de Disruptive Dept, una marca que no diseña ropa, sino mensajes.";
const BODY = [
  "Rags to Riches es más que un drop, es una declaración de principios. Representa el viaje del barrio al brillo. De las apuestas sin respaldo, al respeto ganado a pulso.",
  "La colección se inspira en la transición real y emocional de quienes han tenido que moverse con hambre, callar con rabia y vestirse con lo que hay hasta poder elegir qué ponerse, cómo hablar y cuándo romper todo.",
];

export function EditorialBlock() {
  return (
    <section aria-labelledby="editorial-title" className="border-t border-white/10 py-section">
      <div className="grid items-center gap-12 px-gutter md:grid-cols-12 md:gap-8">
        <Reveal className="md:col-span-5">
          <div className="relative">
            <PlaceholderImage
              label="Lookbook — pareja sentada en unas escaleras, con camiseta DEPT y short 404"
              src="/images/editorial.jpg"
              ratio="4 / 5"
              tone="dark"
              hideLabel
              sizes="(min-width: 768px) 42vw, 100vw"
            />
            <span
              aria-hidden
              className="font-condensed absolute -bottom-3 -right-3 hidden bg-dept-red px-4 py-2 text-[11px] tracking-[0.24em] text-dept-white md:block"
            >
              Extended Version
            </span>
          </div>
        </Reveal>

        <div className="md:col-span-6 md:col-start-7">
          <Reveal>
            <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-gray-300">
              <span aria-hidden className="h-px w-10 bg-dept-red" />
              03 — Manifiesto
            </p>
            <h2 id="editorial-title" className="font-display text-display-lg text-dept-white">
              Rags to Riches –<br />
              Extended Version
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-10 text-xl font-medium leading-snug text-dept-white md:text-2xl">
              {LEDE}
            </p>
          </Reveal>

          <div className="mt-8 max-w-xl space-y-5 text-[15px] leading-relaxed text-dept-white/70 md:text-base">
            {BODY.map((p, i) => (
              <Reveal key={i} delay={200 + i * 90}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={420}>
            <Button href="/collections/all" variant="red" size="lg" arrow className="mt-12">
              Ver la colección
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
