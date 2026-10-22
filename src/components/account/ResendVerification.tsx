"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { bff } from "@/lib/account/client";
import { describeError } from "@/lib/account/errors";
import { validEmail } from "@/lib/account/validation";
import { Field, Notice } from "./ui";

/**
 * «Reenviar correo de verificación». With a known `email` it is a single button; otherwise it asks for the address.
 * The answer is generic (the API never reveals whether the account exists), so the confirmation is too.
 */
export function ResendVerification({ email: known }: { email?: string }) {
  const [email, setEmail] = useState(known ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!validEmail(email)) {
      setError("Introduce un correo electrónico válido.");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await bff("/resend-verification", { method: "POST", body: { email: email.trim() } });
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(describeError(res.error, res.status));
  };

  if (sent) {
    return (
      <Notice kind="success" testId="resend-success">
        Si existe una cuenta pendiente de verificar con <span className="text-dept-white">{email.trim()}</span>, te enviamos un enlace nuevo.
        Si acabas de pedir uno, espera un par de minutos antes de repetirlo.
      </Notice>
    );
  }

  return (
    <form onSubmit={send} noValidate data-testid="resend-verification-form" className="space-y-4">
      <Notice kind="error" testId="resend-error">{error}</Notice>
      {!known && (
        <Field
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
        />
      )}
      <Button type="submit" variant={known ? "outline" : "red"} size="lg" disabled={busy} data-testid="resend-submit" className="w-full">
        {busy ? "Enviando…" : "Reenviar correo de verificación"}
      </Button>
    </form>
  );
}
