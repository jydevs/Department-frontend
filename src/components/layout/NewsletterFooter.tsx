"use client";

import { useId, useState } from "react";
import { clsx } from "@/lib/clsx";
import { Reveal } from "@/components/ui/Reveal";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { str, type Settings } from "@/lib/cms/types";

type FormState = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter band that opens the site footer. Renders a <section> (the
 * <footer> landmark lives in SiteFooter). The form always stays visible —
 * errors and success are announced through the aria-live status line.
 */
export function NewsletterFooter({ settings = {} }: { settings?: Settings }) {
  const T = {
    eyebrow: str(settings, "eyebrow", "Newsletter"), heading: str(settings, "heading", "Únete a Regular Members Only."),
    placeholder: str(settings, "placeholder", "Dirección de correo electrónico"), inputLabel: str(settings, "inputLabel", "Dirección de correo electrónico"),
    button: str(settings, "buttonLabel", "Suscribirse"), loading: str(settings, "loadingMessage", "Enviando..."),
    // la suscripción requiere confirmar por correo (doble opt-in): el mensaje no depende del CMS
    success: "Revisa tu correo para confirmar tu suscripción.", error: str(settings, "errorMessage", "Introduce un correo válido."),
  };
  const [failMsg, setFailMsg] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [email, setEmail] = useState("");
  const uid = useId();
  const headingId = `${uid}-heading`;
  const inputId = `${uid}-email`;
  const msgId = `${uid}-msg`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "loading") return;

    if (!EMAIL_RE.test(email.trim())) {
      setFailMsg("");
      setState("error");
      return;
    }

    setState("loading");
    setFailMsg("");
    try {
      await apiFetch("/storefront/newsletter", { method: "POST", body: { email: email.trim() } });
      setState("success");
      setEmail("");
    } catch (err) {
      // errores reales de la API, no un "éxito" falso: un correo inválido (400) se distingue de un fallo de red / servidor
      setFailMsg(
        err instanceof ApiError && err.status === 429 ? "Demasiados intentos. Prueba en un minuto."
          : err instanceof ApiError && err.status >= 400 && err.status < 500 ? ""
          : "No se pudo enviar. Inténtalo de nuevo.",
      );
      setState("error");
    }
  };

  return (
    <section aria-labelledby={headingId} className="px-gutter py-section">
      <Reveal className="grid items-end gap-12 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-7">
          <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
            <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
            {T.eyebrow}
          </p>
          <h2 id={headingId} className="font-display text-display-lg text-dept-white">
            {T.heading}
          </h2>
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
                {T.inputLabel}
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
                placeholder={T.placeholder}
                aria-invalid={state === "error"}
                aria-describedby={msgId}
                className="h-14 min-w-0 flex-1 rounded-none bg-transparent text-lg text-dept-white placeholder:text-dept-gray-500 focus:outline-none md:h-16 md:text-xl"
              />
              <button
                type="submit"
                data-testid="newsletter-subscribe"
                aria-label={T.button}
                disabled={state === "loading"}
                className="group/arrow grid size-14 shrink-0 place-items-center text-dept-white transition-colors duration-300 ease-out-expo hover:text-dept-red disabled:opacity-40 md:size-16"
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
                <span data-testid="newsletter-loading">{T.loading}</span>
              )}
              {state === "error" && (
                <span data-testid="newsletter-error">{failMsg || T.error}</span>
              )}
              {state === "success" && (
                <span data-testid="newsletter-success">{T.success}</span>
              )}
            </p>
          </form>
        </div>
      </Reveal>
    </section>
  );
}
