"use client";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, CopyButton, PageHeader } from "@/components/admin/ui/Display";
import { Input } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { useToast } from "@/components/admin/ui/Toast";
import { newTotpSecret, useRecoveryCodes } from "@/lib/admin/api/admin";
import { useAuth } from "@/lib/admin/auth";
import { useAction } from "@/lib/admin/query";

export default function AccountPage() {
  const { user } = useAuth();
  const toast = useToast(), confirm = useConfirm();
  const [secret, setSecret] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [cur, setCur] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [twofa, setTwofa] = useState(false), [setup, setSetup] = useState(false), [code, setCode] = useState(""), [codes, setCodes] = useState<string[] | null>(null);
  const gen = useRecoveryCodes();
  const profile = useAction((n: string) => { if (!n.trim()) throw new Error("El nombre es obligatorio"); }, { success: "Perfil actualizado" });
  const pass = useAction(() => { if (pw.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres"); if (pw !== pw2) throw new Error("Las contraseñas no coinciden"); if (!cur) throw new Error("Ingresa tu contraseña actual"); }, { success: "Contraseña actualizada", onSuccess: () => { setCur(""); setPw(""); setPw2(""); } });
  const uri = `otpauth://totp/Dept.Admin:${encodeURIComponent(user?.email ?? "")}?secret=${secret}&issuer=Dept.Admin`;
  const pwErr = pw && pw.length < 12 ? "Mínimo 12 caracteres" : undefined;
  return (
    <>
      <PageHeader title="Mi cuenta" />
      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <Card title="Perfil"><div className="space-y-3"><Input label="Correo" value={user?.email ?? ""} disabled /><Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} /><p className="text-sm text-muted">Rol: <Badge tone="info">{user?.role}</Badge></p><Button variant="primary" loading={profile.isPending} onClick={() => profile.mutate(name)}>Guardar</Button></div></Card>
        <Card title="Cambiar contraseña"><div className="space-y-3"><Input label="Contraseña actual" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /><Input label="Nueva contraseña" type="password" autoComplete="new-password" value={pw} error={pwErr} onChange={(e) => setPw(e.target.value)} /><Input label="Repite la nueva contraseña" type="password" autoComplete="new-password" value={pw2} error={pw2 && pw !== pw2 ? "No coinciden" : undefined} onChange={(e) => setPw2(e.target.value)} /><Button variant="primary" loading={pass.isPending} onClick={() => pass.mutate(undefined)}>Actualizar</Button></div></Card>
        <Card title="Verificación en dos pasos (2FA)" className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm"><ShieldCheck className={twofa ? "size-5 text-ok" : "size-5 text-muted"} />{twofa ? "Activada" : "Desactivada"}</p>
            {twofa ? <Button variant="danger" onClick={async () => { if (await confirm({ title: "Desactivar 2FA", message: "Tu cuenta quedará protegida solo con la contraseña.", danger: true, confirmLabel: "Desactivar" })) { setTwofa(false); setCodes(null); toast.success("2FA desactivada"); } }}>Desactivar</Button> : <Button variant="primary" onClick={() => { setCode(""); setSecret(newTotpSecret()); setSetup(true); }}>Activar 2FA</Button>}</div>
          {codes && <div className="mt-4 rounded-sm border border-line p-3"><p className="mb-2 text-sm font-medium">Códigos de recuperación — <span className="text-warn">se muestran una sola vez</span></p><ul className="grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <li key={c}>{c}</li>)}</ul><div className="mt-2 flex items-center gap-2"><CopyButton text={codes.join("\n")} label="Copiar códigos" /><Button size="sm" onClick={() => setCodes(null)}>Ya los guardé</Button></div></div>}
        </Card>
      </div>
      <Dialog open={setup} onClose={() => setSetup(false)} title="Activar 2FA" size="md" footer={<><Button onClick={() => setSetup(false)}>Cancelar</Button><Button variant="primary" disabled={code.length !== 6} onClick={() => gen.mutate(undefined, { onSuccess: (c) => { setTwofa(true); setSetup(false); setCodes(c); } })}>Verificar y activar</Button></>}>
        <div className="space-y-3 text-sm"><p>Añade esta cuenta a tu app de autenticación (Google Authenticator, 1Password…) usando el secreto o el URI:</p>
          <div className="flex items-center justify-between rounded-sm bg-surface2 p-3 font-mono"><span>{secret}</span><CopyButton text={secret} label="Copiar secreto" /></div>
          <div className="flex items-start justify-between gap-2 rounded-sm bg-surface2 p-3 font-mono text-xs"><span className="break-all">{uri}</span><CopyButton text={uri} label="Copiar URI" /></div>
          <p className="text-xs text-muted">El código QR se generará en el cliente cuando se conecte la API real; por ahora se muestra el URI.</p>
          <Input label="Código de 6 dígitos" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
      </Dialog>
    </>
  );
}
