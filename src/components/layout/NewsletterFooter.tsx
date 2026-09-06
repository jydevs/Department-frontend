/**
 * SCAFFOLD STUB — global newsletter footer ("ÚNETE A REGULAR MEMBERS ONLY.").
 * Repeats at the bottom of every page. `feature/newsletter-footer` builds the
 * real version (email input + arrow submit, exact spacing/type).
 */
export function NewsletterFooter() {
  return (
    <footer className="mt-auto bg-dept-black px-6 py-16">
      <p className="font-display text-2xl text-dept-white">
        Únete a Regular Members Only.
      </p>
      <form className="mt-6 flex max-w-md items-center gap-3 border-b border-dept-gray-500 pb-2">
        <input
          type="email"
          placeholder="Dirección de correo electrónico"
          aria-label="Dirección de correo electrónico"
          className="w-full bg-transparent text-sm text-dept-white placeholder:text-dept-gray-500 focus:outline-none"
        />
        <button type="submit" aria-label="Suscribirse" className="text-dept-white">
          →
        </button>
      </form>
    </footer>
  );
}
