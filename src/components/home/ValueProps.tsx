/**
 * SCAFFOLD STUB — flesh out in `feature/value-props`.
 * Row of 3 values, each: icon + title + subtitle. Stacks on mobile.
 */
const VALUES = [
  {
    title: "Intentional Design",
    subtitle: "Everything we do starts with why",
  },
  {
    title: "Made With Care",
    subtitle: "We believe in building better",
  },
  {
    title: "A Team With A Goal",
    subtitle: "Real people making great products",
  },
];

export function ValueProps() {
  return (
    <section className="grid grid-cols-1 gap-10 bg-dept-black px-6 py-16 text-center sm:grid-cols-3">
      {VALUES.map((value) => (
        <div key={value.title} className="flex flex-col items-center gap-3">
          <div aria-hidden className="h-8 w-8 rounded-full border border-dept-white/40" />
          <h3 className="font-display text-lg text-dept-white">{value.title}</h3>
          <p className="font-body text-xs text-dept-white/70">{value.subtitle}</p>
        </div>
      ))}
    </section>
  );
}
