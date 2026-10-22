"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { bff } from "@/lib/account/client";
import { describeError } from "@/lib/account/errors";
import { AuthShell, Notice, Spinner } from "./ui";

type State = "idle" | "working" | "done" | "invalid" | "error";

/** /newsletter/confirmar?token=… — confirms the subscription as soon as the page opens (double opt-in). */
export function NewsletterConfirm({ token }: { token?: string }) {
  const [state, setState] = useState<State>(token ? "working" : "invalid");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    void bff("/newsletter/confirm", { method: "POST", body: { token } }).then((res) => {
      if (res.ok) setState("done");
      else if (res.error?.code === "INVALID_TOKEN") setState("invalid");
      else {
        setMessage(describeError(res.error, res.status));
        setState("error");
      }
    });
  }, [token]);

  return (
    <AuthShell eyebrow="Newsletter" title={state === "done" ? "Suscripción confirmada" : "Confirma tu suscripción"} testId="newsletter-confirm-page">
      {state === "working" && <Spinner label="Confirmando tu suscripción…" />}
      {state === "done" && (
        <div className="space-y-6">
          <Notice kind="success" testId="newsletter-confirmed">¡Listo! Tu suscripción quedó confirmada. Pronto sabrás de nosotros.</Notice>
          <Button href="/" variant="solid" size="lg" className="w-full">Volver a la tienda</Button>
        </div>
      )}
      {state === "invalid" && (
        <div className="space-y-6">
          <Notice kind="error" testId="newsletter-invalid">Este enlace no es válido, ya fue usado o venció. Puedes volver a suscribirte desde el pie de la tienda.</Notice>
          <Button href="/" variant="solid" size="lg" className="w-full">Ir a la tienda</Button>
        </div>
      )}
      {state === "error" && (
        <div className="space-y-6">
          <Notice kind="error" testId="newsletter-confirm-error">{message}</Notice>
          <Button type="button" variant="solid" size="lg" className="w-full" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      )}
    </AuthShell>
  );
}

/**
 * /newsletter/baja?token=… — asks first, then unsubscribes. The token is the reusable HMAC of the emails, so opening
 * the link must never unsubscribe by itself (mail scanners open links).
 */
export function NewsletterUnsubscribe({ token }: { token?: string }) {
  const [state, setState] = useState<State>(token ? "idle" : "invalid");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  const unsubscribe = async () => {
    if (!token) return;
    setState("working");
    const res = await bff("/newsletter/unsubscribe", { method: "POST", body: { token } });
    if (res.ok) setState("done");
    else if (res.error?.code === "INVALID_TOKEN") setState("invalid");
    else {
      setMessage(describeError(res.error, res.status));
      setState("error");
    }
  };

  return (
    <AuthShell eyebrow="Newsletter" title={state === "done" ? "Te diste de baja" : "Darte de baja"} testId="newsletter-unsubscribe-page">
      {(state === "idle" || state === "working" || state === "error") && (
        <div className="space-y-6">
          <p className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
            ¿Quieres dejar de recibir nuestros correos de novedades y ofertas? Podrás volver a suscribirte cuando quieras.
          </p>
          <Notice kind="error" testId="newsletter-unsubscribe-error">{state === "error" ? message : ""}</Notice>
          <Button type="button" variant="red" size="lg" className="w-full" disabled={state === "working"} onClick={unsubscribe} data-testid="newsletter-unsubscribe-confirm">
            {state === "working" ? "Procesando…" : "Sí, darme de baja"}
          </Button>
          <Button href="/" variant="outline" size="lg" className="w-full">Mantener mi suscripción</Button>
        </div>
      )}
      {state === "done" && (
        <div className="space-y-6">
          <Notice kind="success" testId="newsletter-unsubscribed">Listo, no recibirás más correos de novedades.</Notice>
          <Button href="/" variant="solid" size="lg" className="w-full">Volver a la tienda</Button>
        </div>
      )}
      {state === "invalid" && (
        <div className="space-y-6">
          <Notice kind="error" testId="newsletter-invalid">Este enlace no es válido.</Notice>
          <Button href="/" variant="solid" size="lg" className="w-full">Ir a la tienda</Button>
        </div>
      )}
    </AuthShell>
  );
}
