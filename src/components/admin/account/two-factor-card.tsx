"use client";

import { useState } from "react";
import { Download, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge, Button, Card, Checkbox, CopyButton, Dialog, Input, useToast } from "@/components/admin/ui";
import { Notice, apiMessage } from "@/components/admin/settings/shared";
import { saveBlob } from "@/lib/admin/api-client";
import { useAuth } from "@/lib/admin/auth";
import { ApiError } from "@/lib/admin/errors";
import { secretFromOtpauth, useDisable2fa, useEnable2fa, useRegenerateRecoveryCodes, useSetup2fa } from "@/lib/admin/api/account";
import { QrCode } from "./qr-code";

function codeError(e: unknown): string {
  if (e instanceof ApiError && e.code === "INVALID_OTP") return "El código no es correcto. Revisa que la hora de tu teléfono esté sincronizada.";
  if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") return "La contraseña no es correcta.";
  return apiMessage(e);
}

const RECOVERY_OR_TOTP_RE = /^(\d{6}|[A-Za-z0-9]{8})$/;

/** Muestra los códigos de recuperación (una sola vez) con copiar/descargar; `onDone` se habilita al confirmar que se guardaron. */
function RecoveryCodesDialog({
  codes,
  finishing = false,
  onDone,
  warning = "No volverás a ver estos códigos. Guárdalos en un gestor de contraseñas o impresos en un lugar seguro.",
}: {
  codes: string[];
  finishing?: boolean;
  onDone: () => void;
  warning?: string;
}) {
  const [saved, setSaved] = useState(false);
  const text = codes.join("\n");
  return (
    <Dialog
      open
      onClose={() => undefined}
      dismissible={false}
      title="Guarda tus códigos de recuperación"
      description="Cada código sirve una sola vez si pierdes acceso a tu app de autenticación."
      footer={
        <Button variant="primary" disabled={!saved} loading={finishing} onClick={onDone}>
          Listo
        </Button>
      }
    >
      <div className="space-y-4">
        <Notice tone="warning" title="Se muestran una sola vez">
          {warning}
        </Notice>
        <ul data-testid="recovery-codes" className="grid grid-cols-2 gap-2 rounded-md border border-border-strong bg-surface-2 p-3 font-mono text-sm">
          {codes.map((c) => (
            <li key={c} className="select-all">{c}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={text} label="Copiar todos" />
          <Button size="sm" leftIcon={<Download aria-hidden size={14} />} onClick={() => saveBlob(new Blob([`Códigos de recuperación - Daregular Dept.\n\n${text}\n`], { type: "text/plain;charset=utf-8" }), "codigos-recuperacion.txt")}>
            Descargar .txt
          </Button>
        </div>
        <Checkbox checked={saved} onChange={(e) => setSaved(e.target.checked)} label="Ya guardé mis códigos de recuperación" />
      </div>
    </Dialog>
  );
}

/**
 * Diálogo de activación (QR, código, códigos de recuperación). `required`: no se puede cancelar (activación obligatoria);
 * `onClose` se llama al confirmar que se guardaron los códigos y entonces se relee la sesión.
 */
export function EnableDialog({ uri, onClose, required = false }: { uri: string; onClose: () => void; required?: boolean }) {
  const toast = useToast();
  const { reloadUser } = useAuth();
  const enable = useEnable2fa();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [finishing, setFinishing] = useState(false);
  const secret = secretFromOtpauth(uri);

  // se relee /auth/me al terminar, no al activar: si 2FA era obligatoria, la pantalla se cierra y los códigos se perderían
  const finish = async () => {
    setFinishing(true);
    try {
      await reloadUser();
    } catch {
      /* la sesión se resuelve sola (401 → login) */
    }
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError("Escribe el código de 6 dígitos de tu app.");
    if (!password) return setError("Escribe tu contraseña actual.");
    try {
      const res = await enable.mutateAsync({ code, password });
      setCodes(res.recoveryCodes);
      toast.success("Verificación en dos pasos activada");
    } catch (e) {
      setError(codeError(e));
    }
  };

  if (codes) {
    return <RecoveryCodesDialog codes={codes} finishing={finishing} onDone={finish} />;
  }

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!enable.isPending && !required}
      size="lg"
      title="Activar verificación en dos pasos"
      description="Escanea el QR con Google Authenticator, Authy, 1Password o similar."
      footer={
        <>
          {required ? null : (
            <Button onClick={onClose} disabled={enable.isPending}>
              Cancelar
            </Button>
          )}
          <Button variant="primary" onClick={submit} loading={enable.isPending}>
            Verificar y activar
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <QrCode value={uri} size={200} label="Código QR para tu app de autenticación" />
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <p className="mb-1 text-[13px] font-medium">¿No puedes escanear? Introduce el secreto a mano</p>
            <div className="flex flex-wrap items-center gap-2">
              <code data-testid="totp-secret" className="rounded bg-surface-2 px-2 py-1 font-mono text-sm break-all select-all">{secret ?? "—"}</code>
              {secret ? <CopyButton value={secret} label="Copiar secreto" /> : null}
            </div>
          </div>
          <details className="text-xs text-muted">
            <summary className="cursor-pointer">URI otpauth completa</summary>
            <p className="mt-1 font-mono break-all select-all">{uri}</p>
          </details>
          <Input label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} data-autofocus="" />
          <Input label="Contraseña actual" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
            Activar
          </button>
        </form>
      </div>
    </Dialog>
  );
}

function DisableDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { reloadUser } = useAuth();
  const disable = useDisable2fa();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!RECOVERY_OR_TOTP_RE.test(code)) return setError("Escribe el código de 6 dígitos de tu app o un código de recuperación de 8 caracteres.");
    if (!password) return setError("Escribe tu contraseña actual.");
    try {
      await disable.mutateAsync({ code: code.toUpperCase(), password });
      toast.success("Verificación en dos pasos desactivada");
      await reloadUser();
      onClose();
    } catch (e) {
      setError(codeError(e));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!disable.isPending}
      title="Desactivar verificación en dos pasos"
      description="Tu cuenta quedará protegida solo por la contraseña."
      footer={
        <>
          <Button onClick={onClose} disabled={disable.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit} loading={disable.isPending}>
            Desactivar
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label="Código de verificación" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))} hint="Código de tu app o código de recuperación" data-autofocus="" />
        <Input label="Contraseña actual" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Desactivar
        </button>
      </form>
    </Dialog>
  );
}

function RegenerateDialog({ onClose }: { onClose: () => void }) {
  const regenerate = useRegenerateRecoveryCodes();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);

  const submit = async () => {
    setError(null);
    if (!RECOVERY_OR_TOTP_RE.test(code)) return setError("Escribe el código de 6 dígitos de tu app o un código de recuperación de 8 caracteres.");
    if (!password) return setError("Escribe tu contraseña actual.");
    try {
      const res = await regenerate.mutateAsync({ code: code.toUpperCase(), password });
      setCodes(res.recoveryCodes);
    } catch (e) {
      setError(codeError(e));
    }
  };

  if (codes) {
    return (
      <RecoveryCodesDialog
        codes={codes}
        onDone={onClose}
        warning="Los códigos anteriores ya no sirven. Guarda estos nuevos en un gestor de contraseñas o impresos en un lugar seguro: no volverás a verlos."
      />
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!regenerate.isPending}
      title="Regenerar códigos de recuperación"
      description="Se crearán 8 códigos nuevos y los anteriores dejarán de servir."
      footer={
        <>
          <Button onClick={onClose} disabled={regenerate.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={regenerate.isPending}>
            Regenerar
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label="Código de verificación" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))} hint="Código de tu app o código de recuperación" data-autofocus="" />
        <Input label="Contraseña actual" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Regenerar
        </button>
      </form>
    </Dialog>
  );
}

export function TwoFactorCard() {
  const { user } = useAuth();
  const toast = useToast();
  const setup = useSetup2fa();
  const [uri, setUri] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const enabled = user?.totpEnabled ?? false;

  const start = async () => {
    try {
      const res = await setup.mutateAsync();
      setUri(res.otpauthUrl);
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  return (
    <Card
      title="Verificación en dos pasos (2FA)"
      description="Añade un código temporal de tu teléfono además de la contraseña."
      actions={enabled ? <Badge tone="success" dot>Activada</Badge> : <Badge dot>Desactivada</Badge>}
    >
      {enabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Al iniciar sesión se te pedirá un código de 6 dígitos (o un código de recuperación).</p>
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<RefreshCw aria-hidden size={15} />} onClick={() => setRegenerating(true)}>
              Regenerar códigos de recuperación
            </Button>
            <Button variant="danger" leftIcon={<ShieldOff aria-hidden size={15} />} onClick={() => setDisabling(true)}>
              Desactivar 2FA
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Recomendado para propietarios y administradores.</p>
          <Button variant="primary" leftIcon={<ShieldCheck aria-hidden size={15} />} onClick={start} loading={setup.isPending}>
            Activar 2FA
          </Button>
        </div>
      )}
      {uri ? <EnableDialog uri={uri} onClose={() => setUri(null)} /> : null}
      {disabling ? <DisableDialog onClose={() => setDisabling(false)} /> : null}
      {regenerating ? <RegenerateDialog onClose={() => setRegenerating(false)} /> : null}
    </Card>
  );
}
