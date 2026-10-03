"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { ApiError, friendlyError } from "@/lib/api/errors";
import { bool, str, type Settings } from "@/lib/cms/types";

type FormState = "idle" | "loading" | "success" | "error";

const field = "w-full px-4 py-3 bg-white/5 border border-white/20 text-white focus:border-dept-white focus:outline-none";
const labelCls = "block text-sm mb-2 text-dept-gray-300 font-condensed tracking-[0.1em]";

/**
 * Formulario de contacto (sección `contact-form`). La API acepta `name`, `email`, `subject`, `message` y un
 * campo trampa `website`; el teléfono (opcional en el formulario) se antepone al mensaje.
 */
export function ContactForm({ settings = {} }: { settings?: Settings }) {
  const T = {
    heading: str(settings, "heading", "Ponte en contacto"), showPhone: bool(settings, "showPhone", true),
    name: str(settings, "nameLabel", "Nombre"), email: str(settings, "emailLabel", "Email"), phone: str(settings, "phoneLabel", "Teléfono"),
    subject: str(settings, "subjectLabel", "Asunto"), message: str(settings, "messageLabel", "Mensaje"),
    submit: str(settings, "submitLabel", "Enviar"), loading: str(settings, "loadingLabel", "Enviando..."),
    success: str(settings, "successMessage", "¡Mensaje enviado! Pronto nos pondremos en contacto."), error: str(settings, "errorMessage", "Error al enviar. Intenta de nuevo."),
  };
  const [state, setState] = useState<FormState>("idle");
  const [errorText, setErrorText] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const uid = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setErrorText("");
    const phone = form.phone.trim();
    try {
      await apiFetch("/storefront/contact", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          ...(form.subject.trim() ? { subject: form.subject.trim() } : {}),
          message: phone ? `Teléfono: ${phone}\n\n${form.message.trim()}` : form.message.trim(),
          ...(form.website ? { website: form.website } : {}),
        },
      });
      setState("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
    } catch (err) {
      // red caída / 5xx / límite de peticiones: mensaje claro; los datos escritos se conservan para reintentar
      setErrorText(
        err instanceof ApiError && err.code === "VALIDATION_ERROR" ? "Revisa los datos: nombre, correo, asunto y mensaje son obligatorios."
          : err instanceof ApiError && err.isTransient ? `No se pudo enviar tu mensaje. ${friendlyError(err)}`
          : "",
      );
      setState("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-display text-display-lg text-dept-white mb-10">{T.heading}</h2>

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="contact-form">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor={`${uid}-name`} className={labelCls}>{T.name}</label>
            <input id={`${uid}-name`} type="text" name="name" value={form.name} onChange={handleChange} required maxLength={120} autoComplete="name" className={field} />
          </div>
          <div>
            <label htmlFor={`${uid}-email`} className={labelCls}>{T.email}</label>
            <input id={`${uid}-email`} type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" className={field} />
          </div>
          {T.showPhone && (
            <div className="md:col-span-2">
              <label htmlFor={`${uid}-phone`} className={labelCls}>{T.phone}</label>
              <input id={`${uid}-phone`} type="tel" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" className={field} />
            </div>
          )}
          <div className="md:col-span-2">
            <label htmlFor={`${uid}-subject`} className={labelCls}>{T.subject}</label>
            <input id={`${uid}-subject`} type="text" name="subject" value={form.subject} onChange={handleChange} required maxLength={200} className={field} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor={`${uid}-message`} className={labelCls}>{T.message}</label>
            <textarea id={`${uid}-message`} name="message" value={form.message} onChange={handleChange} required rows={6} maxLength={3900} className={`${field} resize-none`} />
          </div>
          {/* campo trampa: las personas no lo ven; los bots lo rellenan */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor={`${uid}-website`}>Website</label>
            <input id={`${uid}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
          </div>
        </div>

        <p role="status" aria-live="polite" className="font-condensed text-sm tracking-[0.1em]">
          {state === "error" && <span className="text-dept-red-light" data-testid="contact-error">{errorText || T.error}</span>}
          {state === "success" && <span className="text-dept-white" data-testid="contact-success">{T.success}</span>}
        </p>

        <Button type="submit" disabled={state === "loading"} variant="red" className="w-full md:w-auto" data-testid="contact-submit">
          {state === "loading" ? T.loading : T.submit}
        </Button>
      </form>
    </div>
  );
}
