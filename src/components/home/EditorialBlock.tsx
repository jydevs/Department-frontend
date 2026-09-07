import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * SCAFFOLD STUB — flesh out in `feature/editorial-block`.
 * Left: large photo (person crouching with a fan of banknotes, red sneakers).
 * Right: heading + 3 narrative paragraphs. Stacks on mobile.
 */
const PARAGRAPHS = [
  "Este proyecto es el primer lanzamiento oficial de Disruptive Dept, una marca que no diseña ropa, sino mensajes.",
  "Rags to Riches es más que un drop, es una declaración de principios. Representa el viaje del barrio al brillo. De las apuestas sin respaldo, al respeto ganado a pulso.",
  "La colección se inspira en la transición real y emocional de quienes han tenido que moverse con hambre, callar con rabia y vestirse con lo que hay hasta poder elegir qué ponerse, cómo hablar y cuándo romper todo.",
];

export function EditorialBlock() {
  return (
    <section className="bg-dept-black px-6 py-16 md:px-10 md:py-24">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center md:gap-14">
        <PlaceholderImage
          label="Editorial — persona agachada con fajo de billetes, tenis rojos"
          ratio="3 / 4"
          tone="dark"
          hideLabel
        />
        <div className="flex flex-col">
          <h2 className="font-display text-dept-white text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">
            RAGS TO RICHES – EXTENDED VERSION
          </h2>
          <div className="font-body mt-6 space-y-4 text-sm text-dept-white/80 sm:text-base">
            {PARAGRAPHS.map((p, idx) => (
              <p
                key={p.slice(0, 24)}
                className={idx === 0 ? "text-dept-white font-medium" : undefined}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
