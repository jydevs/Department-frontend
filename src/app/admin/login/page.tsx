"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Form";
import { useAuth } from "@/lib/admin/auth";
import { ApiError } from "@/lib/admin/errors";
import { canAccess, firstAllowedRoute } from "@/lib/admin/nav";

/** Solo rutas internas del panel (evita redirecciones abiertas). */
const safeNext = (n: string | null): string => (n && /^\/admin(\/[\w\-./?=&%]*)?$/.test(n) && !n.startsWith("/admin/login") ? n : "/admin");

function LoginForm() {
  const { status, login, permissions } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inFlight = useRef(false);
  const [wait, setWait] = useState(0); // segundos de espera tras un 429
  useEffect(() => {
    if (status === "authed") router.replace(canAccess(next, permissions) ? next : firstAllowedRoute(permissions));
  }, [status, next, permissions, router]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const back = () => { setNeedTotp(false); setTotp(""); setPassword(""); setError(null); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // Enter repetido o doble clic: una sola petición a la vez (cada intento cuenta contra el límite de la API)
    if (inFlight.current || busy || wait > 0 || !email || !password || (needTotp && !totp)) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password, needTotp ? totp.trim().toUpperCase() : undefined);
    } catch (err) {
      if (err instanceof ApiError && err.code === "TWO_FACTOR_REQUIRED") setNeedTotp(true);
      else if (err instanceof ApiError && err.status === 429) { setWait(60); setError("Demasiados intentos de inicio de sesión. Espera un minuto antes de volver a intentarlo."); }
      else if (err instanceof ApiError && (err.status === 401 || err.status === 400)) setError(needTotp ? "Código incorrecto o vencido. Revisa tu app de autenticación." : "Correo o contraseña incorrectos.");
      else if (err instanceof ApiError && err.status >= 500) setError("El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.");
      else setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} noValidate data-testid="admin-login-form" className="w-full max-w-sm space-y-5 rounded-sm border border-line bg-surface p-8">
        <div>
          <p className="adm-label">Daregular Dept.</p>
          <h1 className="font-display text-2xl">Panel de administración</h1>
        </div>
        {error && <p role="alert" data-testid="admin-login-error" className="rounded-sm border border-accent bg-accent/10 p-3 text-sm text-accent-text">{error}</p>}
        <Input label="Correo electrónico" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={needTotp} data-testid="admin-login-email" />
        <Input label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={needTotp} data-testid="admin-login-password" />
        {needTotp && (
          <Input label="Código de verificación" hint="6 dígitos de tu app de autenticación o un código de recuperación." inputMode="text" autoComplete="one-time-code" autoFocus required value={totp} onChange={(e) => setTotp(e.target.value)} data-testid="admin-login-totp" />
        )}
        <Button type="submit" variant="primary" loading={busy} disabled={!email || !password || (needTotp && !totp) || wait > 0} className="w-full" data-testid="admin-login-submit">
          {wait > 0 ? `Espera ${wait} s` : needTotp ? "Verificar" : "Entrar"}
        </Button>
        {needTotp && <Button variant="ghost" className="w-full" disabled={busy} onClick={back} data-testid="admin-login-back">Volver</Button>}
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
