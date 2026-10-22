"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PRIVACY_HREF } from "@/lib/account/config";
import { describeError } from "@/lib/account/errors";
import { useCustomer } from "@/lib/account/useCustomer";
import { Checkbox, Notice, PasswordField, focusFirstInvalid, linkClass } from "./ui";

function ExportData() {
  const { request } = useCustomer();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setMessage(null);
    const res = await request<unknown>("/me/data-export", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      if (res.status !== 401) setMessage({ kind: "error", text: describeError(res.error, res.status) });
      return;
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mis-datos-daregular-dept.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ kind: "success", text: "Descargamos un archivo JSON con tu información." });
  };

  return (
    <section aria-labelledby="export-h" className="space-y-4">
      <h2 id="export-h" className="font-display text-display-md text-dept-white">Exportar mis datos</h2>
      <p className="font-condensed max-w-prose text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
        Tienes derecho a conocer qué información guardamos sobre ti (Ley 1581 de 2012, Habeas Data). Descarga un archivo con tu perfil, direcciones, pedidos, sesiones, suscripción al boletín y mensajes de contacto.
      </p>
      <Notice kind={message?.kind ?? "info"} testId={message?.kind === "error" ? "export-error" : "export-success"}>{message?.text}</Notice>
      <Button type="button" variant="solid" size="md" onClick={handleExport} disabled={busy} data-testid="export-data">
        {busy ? "Preparando…" : "Descargar mis datos"}
      </Button>
    </section>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const { request, endSession } = useCustomer();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const found: Record<string, string> = {};
    if (!password) found.password = "Escribe tu contraseña para confirmar.";
    if (!understood) found.understood = "Confirma que entiendes que esta acción no se puede deshacer.";
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    const res = await request("/me", { method: "DELETE", body: { password } });
    if (res.ok) {
      endSession();
      router.replace("/account/login?deleted=1");
      router.refresh();
      return;
    }
    setBusy(false);
    setPassword("");
    if (res.error?.code === "INVALID_PASSWORD") {
      setErrors({ password: "La contraseña no es correcta." });
      focusFirstInvalid(formRef.current);
      return;
    }
    if (res.status !== 401) setError(describeError(res.error, res.status));
  };

  return (
    <section aria-labelledby="delete-h" className="space-y-4 border border-dept-red-light/30 p-5 sm:p-8">
      <h2 id="delete-h" className="font-display text-display-md text-dept-white">Eliminar mi cuenta</h2>
      <div className="font-condensed max-w-prose space-y-3 text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
        <p>
          Al eliminar tu cuenta borramos o anonimizamos tus datos personales: nombre, correo, teléfono, direcciones y suscripción. <strong className="text-dept-white">No se puede deshacer.</strong>
        </p>
        <p>
          Cerraremos tus sesiones y no podrás volver a entrar con este correo. Los pedidos terminados conservan solo lo necesario para la contabilidad, sin datos que te identifiquen; los pedidos aún abiertos se anonimizan cuando se cierren. Más en la{" "}
          <Link href={PRIVACY_HREF} className={linkClass}>Política de Privacidad</Link>.
        </p>
      </div>

      {!open ? (
        <button
          type="button"
          data-testid="delete-account-open"
          onClick={() => setOpen(true)}
          className="font-condensed inline-flex h-11 items-center border border-dept-red-light/60 px-6 text-xs tracking-[0.16em] text-dept-red-light transition-colors hover:bg-dept-red hover:text-dept-white"
        >
          Quiero eliminar mi cuenta
        </button>
      ) : (
        <form ref={formRef} data-testid="delete-account-form" onSubmit={handleSubmit} noValidate className="max-w-md space-y-5 pt-2">
          <PasswordField label="Tu contraseña" name="password" autoComplete="current-password" required value={password} error={errors.password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: "" })); }} />
          <Checkbox name="understood" checked={understood} error={errors.understood} onChange={(e) => { setUnderstood(e.target.checked); if (errors.understood) setErrors((x) => ({ ...x, understood: "" })); }}>
            Entiendo que mi cuenta y mis datos personales se eliminarán de forma permanente.
          </Checkbox>
          <Notice kind="error" testId="delete-account-error">{error}</Notice>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              data-testid="delete-account-submit"
              className="font-condensed inline-flex h-11 items-center bg-dept-red px-6 text-xs tracking-[0.16em] text-dept-white transition-colors hover:bg-dept-red-dark disabled:opacity-50"
            >
              {busy ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setPassword(""); setUnderstood(false); setErrors({}); setError(null); }} className="font-condensed inline-flex h-11 items-center justify-center border border-white/25 px-6 text-xs tracking-[0.16em] text-dept-white transition-colors hover:border-dept-white hover:bg-dept-white hover:text-dept-black">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function PrivacyPanel() {
  return (
    <div data-testid="privacy-page" className="space-y-14">
      <ExportData />
      <DeleteAccount />
    </div>
  );
}
