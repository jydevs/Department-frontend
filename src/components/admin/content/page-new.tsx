"use client";

import { useState } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { Button, Card, Input, NoAccess, PageHeader, Textarea, useToast } from "@/components/admin/ui";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { slugify } from "@/lib/admin/format";
import { useCreatePage } from "@/lib/admin/api/content";
import { HANDLE_RE } from "./content-utils";
import { labelWithCount } from "./fields";

export function PageNew() {
  const canWrite = useCan("content:write");
  const router = useRouter();
  const toast = useToast();
  const create = useCreatePage();
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!canWrite) return <NoAccess permission="content:write" title="No tienes permiso para crear páginas" />;

  const effectiveHandle = handleTouched ? handle : slugify(title);
  const handleError = serverErrors.handle ?? (submitted ? (!effectiveHandle ? "Obligatorio" : !HANDLE_RE.test(effectiveHandle) ? "Solo minúsculas, números y guiones (sin espacios ni guiones al inicio o final)" : null) : effectiveHandle && !HANDLE_RE.test(effectiveHandle) ? "Solo minúsculas, números y guiones" : null);
  const titleError = serverErrors.title ?? (submitted && !title.trim() ? "Obligatorio" : null);

  const submit = async () => {
    setSubmitted(true);
    setServerErrors({});
    if (!title.trim() || !effectiveHandle || !HANDLE_RE.test(effectiveHandle)) return;
    try {
      const d = await create.mutateAsync({
        title: title.trim(),
        handle: effectiveHandle,
        ...(seoTitle.trim() ? { seoTitle: seoTitle.trim() } : {}),
        ...(seoDescription.trim() ? { seoDescription: seoDescription.trim() } : {}),
      });
      toast.success("Página creada. Añade sus secciones.");
      router.push(`/content/pages/${encodeURIComponent(d.key)}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") setServerErrors(e.fieldErrors());
      else if (e instanceof ApiError && e.code === "CONFLICT") setServerErrors({ handle: "Ya existe una página con ese handle" });
      else toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Nueva página" breadcrumbs={[{ label: "Contenido", href: "/content" }, { label: "Páginas", href: "/content/pages" }, { label: "Nueva" }]} />
      <form
        className="max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Card title="Datos de la página" description="Después podrás añadir secciones y previsualizar antes de publicar.">
          <div className="flex flex-col gap-4">
            <Input label="Título" required value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} error={titleError} autoFocus />
            <Input
              label="Handle (dirección)"
              required
              value={effectiveHandle}
              onChange={(e) => {
                setHandleTouched(true);
                setHandle(e.target.value.toLowerCase());
              }}
              error={handleError}
              hint={`Será /pages/${effectiveHandle || "mi-pagina"}. No se puede cambiar después (para eso usa una redirección).`}
              leftIcon={<span className="text-xs">/pages/</span>}
              className="pl-16"
            />
            <Input label={labelWithCount("Título SEO (opcional)", seoTitle.length, 255)} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={255} />
            <Textarea label={labelWithCount("Descripción SEO (opcional)", seoDescription.length, 320)} rows={3} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={320} />
          </div>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button type="submit" variant="primary" loading={create.isPending}>
            Crear página
          </Button>
          <Button onClick={() => router.push("/content/pages")} disabled={create.isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
}
