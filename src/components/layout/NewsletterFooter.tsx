"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";

type FormState = "idle" | "success" | "error";

export function NewsletterFooter() {
  const [state, setState] = useState<FormState>("idle");
  const [email, setEmail] = useState("");

  /* TODO: conectar a backend de newsletter */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim() || !emailRegex.test(email)) {
      setState("error");
      return;
    }

    // On success, show confirmation and reset form
    setState("success");
    setEmail("");

    // Reset to idle after 3 seconds
    setTimeout(() => setState("idle"), 3000);
  };

  return (
    <footer className={clsx("mt-auto bg-dept-black px-6 py-16", "md:px-10")}>
      <h2 className={clsx(
        "font-display text-2xl text-dept-white",
        "md:text-3xl"
      )}>
        Únete a Regular Members Only.
      </h2>

      {state === "idle" && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex max-w-96 items-center gap-3"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Dirección de correo electrónico
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Dirección de correo electrónico"
            className={clsx(
              "w-full bg-transparent text-dept-white placeholder:text-dept-gray-500",
              "border-b border-dept-gray-500 pb-2 focus:outline-none",
              "focus:border-b focus:border-dept-white transition-colors"
            )}
            aria-label="Dirección de correo electrónico"
          />
          <button
            type="submit"
            aria-label="Suscribirse"
            className="flex-shrink-0 text-dept-white transition-colors hover:text-dept-red"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>
      )}

      {state === "success" && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-6"
        >
          <p className="font-condensed text-sm text-dept-white">
            Gracias por suscribirte.
          </p>
        </div>
      )}

      {state === "error" && (
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="mt-6"
        >
          <p className="text-sm text-dept-red">
            Introduce un correo válido.
          </p>
        </div>
      )}
    </footer>
  );
}
