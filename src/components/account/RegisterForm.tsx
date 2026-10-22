"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { bff, fieldErrors } from "@/lib/account/client";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/account/config";
import { describeError } from "@/lib/account/errors";
import { nameError, passwordError, validEmail, type FieldErrors } from "@/lib/account/validation";
import { AuthShell, Checkbox, Field, Notice, PasswordField, focusFirstInvalid, linkClass } from "./ui";

export function RegisterForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", acceptsMarketing: false, acceptsTerms: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const next: FieldErrors = {};
    const first = nameError(form.firstName, "nombre");
    const last = nameError(form.lastName, "apellido");
    if (first) next.firstName = first;
    if (last) next.lastName = last;
    if (!validEmail(form.email)) next.email = "Introduce un correo electrónico válido.";
    const pw = passwordError(form.password);
    if (pw) next.password = pw;
    if (!form.acceptsTerms) next.acceptsTerms = "Debes aceptar los Términos y la Política de Privacidad para crear tu cuenta.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }

    setBusy(true);
    const res = await bff("/register", {
      method: "POST",
      body: {
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        acceptsMarketing: form.acceptsMarketing,
        acceptsTerms: form.acceptsTerms,
      },
    });
    setBusy(false);
    if (res.ok) {
      setSentTo(form.email.trim());
      setForm((f) => ({ ...f, password: "" }));
      return;
    }
    const fields = fieldErrors(res.error);
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      focusFirstInvalid(formRef.current);
    }
    setFormError(describeError(res.error, res.status));
  };

  if (sentTo) {
    return (
      <AuthShell eyebrow="Cuenta" title="Revisa tu correo" testId="register-sent">
        <div className="space-y-6">
          <Notice kind="success" testId="register-success">
            Si el correo es válido, te enviamos un enlace para verificarlo y activar tu cuenta.
          </Notice>
          <p className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
            Lo enviamos a <span className="text-dept-white">{sentTo}</span>. El enlace vence en 48 horas. Si no lo ves, revisa la carpeta de correo no deseado.
          </p>
          <Button href="/account/login" variant="solid" size="lg" className="w-full">
            Ir a iniciar sesión
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Cuenta" title="Crear cuenta">
      <form ref={formRef} data-testid="register-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <Notice kind="error" testId="register-error">{formError}</Notice>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" name="firstName" autoComplete="given-name" required value={form.firstName} error={errors.firstName} onChange={(e) => set("firstName", e.target.value)} />
          <Field label="Apellido" name="lastName" autoComplete="family-name" required value={form.lastName} error={errors.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>

        <Field label="Correo electrónico" type="email" name="email" autoComplete="email" inputMode="email" required value={form.email} error={errors.email} onChange={(e) => set("email", e.target.value)} />

        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          required
          value={form.password}
          error={errors.password}
          hint="Mínimo 12 caracteres. Una frase larga funciona mejor que una palabra con símbolos."
          meter
          meterContext={[form.firstName, form.lastName, form.email.split("@")[0] ?? ""]}
          onChange={(e) => set("password", e.target.value)}
        />

        <div className="space-y-4 pt-1">
          <Checkbox name="acceptsTerms" checked={form.acceptsTerms} error={errors.acceptsTerms} onChange={(e) => set("acceptsTerms", e.target.checked)} required>
            He leído y acepto los{" "}
            <Link href={TERMS_HREF} target="_blank" className={linkClass}>
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href={PRIVACY_HREF} target="_blank" className={linkClass}>
              Política de Privacidad
            </Link>
            . <span aria-hidden className="text-dept-gray-500">*</span>
          </Checkbox>
          <Checkbox name="acceptsMarketing" checked={form.acceptsMarketing} onChange={(e) => set("acceptsMarketing", e.target.checked)}>
            Quiero recibir novedades, lanzamientos y ofertas por correo (opcional).
          </Checkbox>
        </div>

        <Button type="submit" variant="red" size="lg" disabled={busy} data-testid="register-submit" className="mt-4 w-full">
          {busy ? "Creando cuenta…" : "Crear cuenta"}
        </Button>

        <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/account/login" className={linkClass}>
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
