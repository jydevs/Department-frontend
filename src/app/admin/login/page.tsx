"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Form";
import { useAuth } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/admin/errors";

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("owner@daregulardept.com");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (status === "authed") router.replace("/admin", { scroll: false }); }, [status, router]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await login(email, password, totp || undefined); router.replace("/admin", { scroll: false }); } catch (x) { setError(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-sm border border-line bg-surface p-6 shadow-xl">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-2" />
          <h1 className="font-display text-2xl tracking-wide">Panel de administración</h1>
          <p className="text-sm text-muted">Inicia sesión para administrar la tienda</p>
        </div>
        <Input label="Correo" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="Demo visual: cualquier contraseña de 4+ caracteres." />
        <Input label="Código 2FA (opcional)" inputMode="numeric" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))} />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <Button type="submit" variant="primary" loading={busy} className="w-full">Entrar</Button>
      </form>
    </main>
  );
}
