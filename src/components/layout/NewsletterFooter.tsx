"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";

type FormState = "idle" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterFooter() {
  const [state, setState] = useState<FormState>("idle");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!EMAIL_RE.test(email.trim())) {
      setState("error");
      return;
    }

    // TODO: conectar a backend de newsletter
    setState("success");
    setEmail("");
  };

  return (
    <footer className="mt-auto bg-dept-black px-6 py-16 md:px-10">
      <h2 className="font-display text-2xl text-dept-white md:text-3xl">
        Únete a Regular Members Only.
      </h2>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 flex max-w-[420px] items-center gap-3"
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Dirección de correo electrónico
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder="Dirección de correo electrónico"
          aria-invalid={state === "error"}
          aria-describedby="newsletter-msg"
          className={clsx(
            "w-full bg-transparent pb-2 text-dept-white placeholder:text-dept-gray-500",
            "border-b transition-colors focus:outline-none",
            state === "error"
              ? "border-dept-red"
              : "border-dept-gray-500 focus:border-dept-white",
          )}
        />
        <button
          type="submit"
          aria-label="Suscribirse"
          className="flex-shrink-0 text-dept-white transition-transform hover:translate-x-0.5 hover:text-dept-red"
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

      <p
        id="newsletter-msg"
        role="status"
        aria-live="polite"
        className={clsx(
          "font-condensed mt-3 min-h-5 text-sm",
          state === "error" && "text-dept-red",
          state === "success" && "text-dept-white",
        )}
      >
        {state === "error" && "Introduce un correo válido."}
        {state === "success" && "Gracias por suscribirte."}
      </p>
    </footer>
  );
}
