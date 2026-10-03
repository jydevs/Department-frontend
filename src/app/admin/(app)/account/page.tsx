"use client";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, CopyButton, PageHeader } from "@/components/admin/ui/Display";
import { Input } from "@/components/admin/ui/Form";
import { Dialog } from "@/components/admin/ui/Overlay";
import { useToast } from "@/components/admin/ui/Toast";
import { useChangePassword, useTwoFaDisable, useTwoFaEnable, useTwoFaSetup } from "@/lib/admin/api/admin";
import { useAuth } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/admin/errors";

export default function AccountPage() {
  const { user, reload, logout } = useAuth();
  const toast = useToast();
  const [cur, setCur] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState(""), [pwErr, setPwErr] = useState("");
  const [setup, setSetup] = useState<{ uri: string; secret: string } | null>(null), [code, setCode] = useState(""), [pass, setPass] = useState(""), [codes, setCodes] = useState<string[] | null>(null), [dlgErr, setDlgErr] = useState("");
  const [disabling, setDisabling] = useState(false);
  const change = useChangePassword(), start = useTwoFaSetup(), enable = useTwoFaEnable(), disable = useTwoFaDisable();
  const twofa = !!user?.totpEnabled;
  const submitPw = () => {
    setPwErr("");
    if (!cur) return setPwErr("Ingresa tu contraseña actual");
    if (pw.length < 12) return setPwErr("La contraseña debe tener al menos 12 caracteres");
    if (pw !== pw2) return setPwErr("Las contraseñas no coinciden");
    change.mutate({ current: cur, next: pw }, {
      onSuccess: async () => { toast.success("Contraseña actualizada. Vuelve a iniciar sesión."); setCur(""); setPw(""); setPw2(""); await logout(); },
      onError: (e) => setPwErr(errorMessage(e)),
    });
  };
  const openSetup = () => { setCode(""); setPass(""); setDlgErr(""); start.mutate(undefined, { onSuccess: setSetup }); };
  const pwHint = pw && pw.length < 12 ? "Mínimo 12 caracteres" : undefined;
  return (
    <>
      <PageHeader title="Mi cuenta" />
      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <Card title="Perfil"><div className="space-y-3"><Input label="Correo" value={user?.email ?? ""} disabled /><Input label="Nombre" value={user?.name ?? ""} disabled hint="El nombre lo gestiona un propietario o administrador desde Personal y roles." /><p className="text-sm text-muted">Rol: <Badge tone="info">{user?.role}</Badge></p></div></Card>
        <Card title="Cambiar contraseña"><div className="space-y-3"><Input label="Contraseña actual" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /><Input label="Nueva contraseña" type="password" autoComplete="new-password" value={pw} error={pwHint} onChange={(e) => setPw(e.target.value)} /><Input label="Repite la nueva contraseña" type="password" autoComplete="new-password" value={pw2} error={pw2 && pw !== pw2 ? "No coinciden" : undefined} onChange={(e) => setPw2(e.target.value)} />
          {pwErr && <p role="alert" className="text-sm text-accent-text">{pwErr}</p>}<p className="text-xs text-muted">Al cambiarla se cerrarán todas tus sesiones.</p><Button variant="primary" loading={change.isPending} onClick={submitPw}>Actualizar</Button></div></Card>
        <Card title="Verificación en dos pasos (2FA)" className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm"><ShieldCheck className={twofa ? "size-5 text-ok" : "size-5 text-muted"} />{twofa ? "Activada" : "Desactivada"}</p>
            {twofa ? <Button variant="danger" onClick={() => { setCode(""); setPass(""); setDlgErr(""); setDisabling(true); }}>Desactivar</Button> : <Button variant="primary" loading={start.isPending} onClick={openSetup}>Activar 2FA</Button>}</div>
          {start.error && <p role="alert" className="mt-2 text-sm text-accent-text">{errorMessage(start.error)}</p>}
          {codes && <div className="mt-4 rounded-sm border border-line p-3"><p className="mb-2 text-sm font-medium">Códigos de recuperación — <span className="text-warn">se muestran una sola vez</span></p><ul className="grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <li key={c}>{c}</li>)}</ul><div className="mt-2 flex items-center gap-2"><CopyButton text={codes.join("\n")} label="Copiar códigos" /><Button size="sm" onClick={() => setCodes(null)}>Ya los guardé</Button></div></div>}
        </Card>
      </div>
      <Dialog open={!!setup} onClose={() => setSetup(null)} title="Activar 2FA" size="md" footer={<><Button onClick={() => setSetup(null)}>Cancelar</Button><Button variant="primary" loading={enable.isPending} disabled={code.length !== 6 || !pass} onClick={() => enable.mutate({ password: pass, code }, { onSuccess: async (r) => { setSetup(null); setCodes(r.recoveryCodes); toast.success("2FA activada"); await reload(); }, onError: (e) => setDlgErr(errorMessage(e)) })}>Verificar y activar</Button></>}>
        {setup && <div className="space-y-3 text-sm"><p>Añade esta cuenta a tu app de autenticación (Google Authenticator, 1Password…) usando el secreto o el URI:</p>
          <div className="flex items-center justify-between rounded-sm bg-surface2 p-3 font-mono"><span className="break-all">{setup.secret}</span><CopyButton text={setup.secret} label="Copiar secreto" /></div>
          <div className="flex items-start justify-between gap-2 rounded-sm bg-surface2 p-3 font-mono text-xs"><span className="break-all">{setup.uri}</span><CopyButton text={setup.uri} label="Copiar URI" /></div>
          <Input label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <Input label="Tu contraseña actual" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          {dlgErr && <p role="alert" className="text-sm text-accent-text">{dlgErr}</p>}</div>}
      </Dialog>
      <Dialog open={disabling} onClose={() => setDisabling(false)} title="Desactivar 2FA" size="sm" footer={<><Button onClick={() => setDisabling(false)}>Cancelar</Button><Button variant="danger" loading={disable.isPending} disabled={code.length !== 6 || !pass} onClick={() => disable.mutate({ password: pass, code }, { onSuccess: async () => { setDisabling(false); setCodes(null); await reload(); }, onError: (e) => setDlgErr(errorMessage(e)) })}>Desactivar</Button></>}>
        <div className="space-y-3 text-sm"><p>Tu cuenta quedará protegida solo con la contraseña. Confirma con tu contraseña y un código vigente.</p>
          <Input label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <Input label="Tu contraseña actual" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          {dlgErr && <p role="alert" className="text-sm text-accent-text">{dlgErr}</p>}</div>
      </Dialog>
    </>
  );
}
