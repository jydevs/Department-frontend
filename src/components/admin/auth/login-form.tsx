"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/admin/auth";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { isInternalPath } from "@/lib/admin/utils";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/inputs";
import { IconButton } from "@/components/admin/ui/button";
import { Brand } from "@/components/admin/shell/sidebar";
import { Spinner } from "@/components/admin/ui/spinner";

type Step = "credentials" | "totp";

const CODE_RE = /^(\d{6}|[A-Za-z0-9]{8})$/;

/** 75 → «1 min 15 s»; 40 → «40 s». */
function formatWait(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return sec ? `${m} min ${sec} s` : `${m} min`;
}

function destination(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return isInternalPath(next) ? next : "/";
}

export function LoginForm() {
  const { status, login } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // ya autenticado → fuera del login
  useEffect(() => {
    if (status === "authed") router.replace(destination());
  }, [status, router]);

  // cuenta atrás del bloqueo por throttle (429)
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        clearInterval(t);
        setLockedUntil(0);
      }
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  useEffect(() => {
    if (step === "totp") codeRef.current?.focus();
  }, [step]);

  const lockSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const locked = lockSeconds > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || locked) return;
    setError(null);

    if (step === "credentials" && (!email.trim() || !password)) {
      setError("Introduce tu correo y tu contraseña.");
      return;
    }
    if (step === "credentials" && code.trim() && !CODE_RE.test(code.trim())) {
      setError("El código de verificación son 6 dígitos o un código de recuperación de 8 caracteres.");
      return;
    }
    if (step === "totp" && !CODE_RE.test(code.trim())) {
      setError("Introduce el código de 6 dígitos o un código de recuperación de 8 caracteres.");
      return;
    }

    setBusy(true);
    try {
      await login(email, password, code.trim() ? code : undefined);
      router.replace(destination());
    } catch (err) {
      if (err instanceof ApiError && err.code === "TWO_FACTOR_REQUIRED") {
        setStep("totp");
        setCode("");
        setError(null);
      } else if (err instanceof ApiError && err.status === 429) {
        const secs = err.retryAfter ?? 60;
        const until = Date.now() + secs * 1000;
        setNow(Date.now());
        setLockedUntil(until);
      } else if (err instanceof ApiError && (err.code === "INVALID_CREDENTIALS" || err.status === 401)) {
        setError(
          step === "totp"
            ? "Código incorrecto o caducado. Inténtalo de nuevo."
            : code.trim()
              ? "Correo, contraseña o código incorrectos. Si fallas varias veces seguidas, la cuenta se bloquea unos minutos."
              : "Correo o contraseña incorrectos. Si fallas varias veces seguidas, la cuenta se bloquea unos minutos. Si tu cuenta tiene 2FA, introduce también el código de verificación.",
        );
        if (step === "totp") setCode("");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || status === "authed") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted" role="status" aria-label="Comprobando sesión">
        <Spinner size={22} />
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-md sm:p-7">
          <h1 className="text-xl">{step === "credentials" ? "Iniciar sesión" : "Verificación en dos pasos"}</h1>
          <p className="mt-1 mb-5 text-sm text-muted">
            {step === "credentials" ? "Accede al panel de administración." : "Introduce el código de tu app de autenticación o un código de recuperación."}
          </p>

          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            {step === "credentials" ? (
              <>
                <Input
                  ref={emailRef}
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                />
                <Input
                  label="Contraseña"
                  type={showPw ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  rightAddon={
                    <IconButton
                      label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                      size="sm"
                      icon={showPw ? <EyeOff aria-hidden size={16} /> : <Eye aria-hidden size={16} />}
                      onClick={() => setShowPw((v) => !v)}
                    />
                  }
                />
                <Input
                  label="Código de verificación (si tienes 2FA)"
                  name="totp"
                  autoComplete="one-time-code"
                  inputMode="text"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/s+/g, ""))}
                  disabled={busy}
                  hint="Opcional: 6 dígitos de tu app o un código de recuperación."
                  className="tracking-widest tabular-nums"
                />
              </>
            ) : (
              <Input
                ref={codeRef}
                label="Código de verificación"
                name="totp"
                autoComplete="one-time-code"
                inputMode="text"
                maxLength={8}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
                disabled={busy}
                hint="6 dígitos de tu app, o un código de recuperación de 8 caracteres."
                leftIcon={<ShieldCheck aria-hidden size={16} />}
                className="tracking-widest tabular-nums"
              />
            )}

            {error || locked ? (
              <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {locked ? `Demasiados intentos, espera ${formatWait(lockSeconds)}.` : error}
              </div>
            ) : null}

            <Button type="submit" variant="primary" size="lg" loading={busy} disabled={locked} className="w-full">
              {locked ? `Espera ${formatWait(lockSeconds)}` : step === "credentials" ? "Entrar" : "Verificar"}
            </Button>

            {step === "totp" ? (
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft aria-hidden size={15} />}
                onClick={() => {
                  setStep("credentials");
                  setCode("");
                  setError(null);
                }}
                disabled={busy}
              >
                Volver
              </Button>
            ) : null}
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted">Acceso restringido al personal autorizado.</p>
      </div>
    </main>
  );
}
