"use client";

import { useState } from "react";
import { Link } from "@/lib/admin/navigation";
import { useRouter } from "@/lib/admin/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { Button, Card, Dialog, ErrorState, Input, NoAccess, PageHeader, Skeleton, useToast } from "@/components/admin/ui";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { useCreateMenu, useDocuments } from "@/lib/admin/api/content";
import { DocStatusBadges, publishedText } from "./doc-status";

const KEY_RE = /^[a-z0-9][a-z0-9:_-]{0,119}$/;

function NewMenuDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateMenu();
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const keyError = touched && !KEY_RE.test(key) ? "Usa minúsculas, números, guiones, guion bajo o dos puntos (máx. 120)" : null;
  const submit = async () => {
    setTouched(true);
    if (!KEY_RE.test(key)) return;
    try {
      const d = await create.mutateAsync({ key, title: title.trim() || `Menú ${key}` });
      toast.success("Menú creado");
      router.push(`/content/menus/${encodeURIComponent(d.key)}`);
    } catch (e) {
      toast.error(e instanceof ApiError && e.code === "CONCURRENT_UPDATE" ? "Ya existe un menú con esa clave" : errorMessage(e));
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Nuevo menú"
      description="Los menús se enlazan desde la cabecera y el pie de página por su clave."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={create.isPending} onClick={() => void submit()}>
            Crear menú
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Clave" required value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} error={keyError} hint="Identificador interno, p. ej. lateral. No se puede cambiar." autoFocus />
        <Input label="Nombre (opcional)" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} />
      </div>
    </Dialog>
  );
}

export function MenusView() {
  const canRead = useCan("content:read");
  const canWrite = useCan("content:write");
  const docs = useDocuments("menu");
  const [creating, setCreating] = useState(false);
  if (!canRead) return <NoAccess permission="content:read" />;

  return (
    <>
      <PageHeader
        title="Menús"
        description="Estructura de navegación de la tienda: hasta 3 niveles y 50 ítems por menú."
        breadcrumbs={[{ label: "Contenido", href: "/content" }, { label: "Menús" }]}
        actions={
          canWrite ? (
            <Button leftIcon={<Plus aria-hidden size={16} />} onClick={() => setCreating(true)}>
              Nuevo menú
            </Button>
          ) : null
        }
      />
      {docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
      ) : docs.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="menus-list">
          {docs.data.map((d) => (
            <li key={d.id}>
              <Link href={`/content/menus/${encodeURIComponent(d.key)}`} className="group block h-full rounded-lg">
                <Card className="h-full transition group-hover:border-border-strong group-hover:bg-surface-2/40">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-[15px]">{d.title || d.key}</h2>
                        <p className="mt-0.5 font-mono text-xs text-muted">{d.key}</p>
                      </div>
                      <ArrowRight aria-hidden size={16} className="mt-1 text-muted transition group-hover:translate-x-0.5 group-hover:text-text" />
                    </div>
                    <DocStatusBadges item={d} />
                    <p className="text-xs text-muted">{publishedText(d)}</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating ? <NewMenuDialog onClose={() => setCreating(false)} /> : null}
    </>
  );
}
