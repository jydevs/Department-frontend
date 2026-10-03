"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("owner@daregulardept.com");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (status === "authed") router.replace("/"); }, [status, router]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await login(email, password, totp || undefined); router.replace("/"); } catch (x) { setError(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <div className="text-center">
          <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-accent text-lg font-bold text-white">D</span>
          <h1 className="text-xl font-semibold">Dept. Admin</h1>
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
