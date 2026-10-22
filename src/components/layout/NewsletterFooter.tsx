"use client";

import { useId, useState } from "react";
import { clsx } from "@/lib/clsx";
import { Reveal } from "@/components/ui/Reveal";
import { publicApiBase } from "@/lib/api/config";
import { DEFAULT_NEWSLETTER, type NewsletterConfig } from "./config";

type FormState = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter band that opens the site footer. Renders a <section> (the
 * <footer> landmark lives in SiteFooter). The form always stays visible —
 * errors and success are announced through the aria-live status line.
 */
export function NewsletterFooter({ config = DEFAULT_NEWSLETTER }: { config?: NewsletterConfig }) {
  const [state, setState] = useState<FormState>("idle");
  const [email, setEmail] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const uid = useId();
  const headingId = `${uid}-heading`;
  const inputId = `${uid}-email`;
  const msgId = `${uid}-msg`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!EMAIL_RE.test(email.trim())) {
      setApiError(null);
      setState("error");
      return;
    }

    setState("loading");
    setApiError(null);

    try {
      const res = await fetch(`${publicApiBase()}/storefront/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        let code: string | null = null;
        try {
          code = ((await res.json()) as { code?: string }).code ?? null;
        } catch {
          /* non-JSON error */
        }
        setApiError(
          code === "VALIDATION_ERROR"
            ? config.errorMessage
            : res.status === 429 || code === "RATE_LIMITED"
              ? "Demasiados intentos. Espera un momento e inténtalo de nuevo."
              : "No pudimos registrar tu correo. Inténtalo de nuevo en unos minutos.",
        );
        setState("error");
        return;
      }

      setState("success");
      setEmail("");
    } catch {
      setApiError("No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.");
      setState("error");
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className="px-gutter py-section"
      style={config.backgroundColor ? { backgroundColor: config.backgroundColor } : undefined}
    >
      <Reveal className="grid items-end gap-12 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-7">
          {config.eyebrow && (
            <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
              <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
              {config.eyebrow}
            </p>
          )}
          <h2 id={headingId} className="font-display text-display-lg text-dept-white">
            {config.heading}
          </h2>
          {config.text && <p className="mt-5 max-w-xl text-white/70">{config.text}</p>}
        </div>

        <div className="md:col-span-5">
          <form onSubmit={handleSubmit} noValidate>
            <div
              className={clsx(
                "flex items-center border-b-2 transition-colors duration-300 ease-out-expo",
                state === "error"
                  ? "border-dept-red"
                  : "border-white/30 focus-within:border-dept-white",
              )}
            >
              <label htmlFor={inputId} className="sr-only">
                {config.inputLabel}
              </label>
              <input
                id={inputId}
                type="email"
                inputMode="email"
                autoComplete="email"
                data-testid="newsletter-email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state !== "idle") setState("idle");
                }}
                placeholder={config.placeholder}
                aria-invalid={state === "error"}
                aria-describedby={msgId}
                className="h-14 min-w-0 flex-1 rounded-none bg-transparent text-lg text-dept-white placeholder:text-dept-gray-500 focus:outline-none md:h-16 md:text-xl"
              />
              <button
                type="submit"
                data-testid="newsletter-subscribe"
                aria-label={config.buttonLabel}
                className="group/arrow grid size-14 shrink-0 place-items-center text-dept-white transition-colors duration-300 ease-out-expo hover:text-dept-red md:size-16"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-out-expo group-hover/arrow:translate-x-1"
                >
                  <path d="M4 12h16M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <p
              id={msgId}
              role="status"
              aria-live="polite"
              className={clsx(
                "font-condensed mt-4 min-h-5 text-sm tracking-[0.1em]",
                state === "error" && "text-dept-red-light",
                state === "success" && "text-dept-white",
                state === "loading" && "text-dept-gray-400",
              )}
            >
              {state === "loading" && (
                <span data-testid="newsletter-loading">{config.loadingMessage}</span>
              )}
              {state === "error" && (
                <span data-testid="newsletter-error">{apiError ?? config.errorMessage}</span>
              )}
              {state === "success" && (
                <span data-testid="newsletter-success">{config.successMessage}</span>
              )}
            </p>
          </form>
        </div>
      </Reveal>
    </section>
  );
}
