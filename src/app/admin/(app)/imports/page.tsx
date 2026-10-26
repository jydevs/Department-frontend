"use client";
import { Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, DateTime, EmptyState, Pagination, PageHeader, Skeleton, StatusBadge } from "@/components/admin/ui/Display";
import { Checkbox, Select } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { useToast } from "@/components/admin/ui/Toast";
import { errorMessage } from "@/lib/admin/errors";
import { isActive, MAX_IMPORT, useCancelImport, useImportDetail, useImports, useStartImport, type ImportJob, type ImportKind } from "@/lib/admin/api/imports";
import { useCan } from "@/lib/admin/permissions";

export default function ImportsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useImports(page);
  const toast = useToast(), confirm = useConfirm();
  const can = useCan("import:write");
  const [kind, setKind] = useState<ImportKind>("products"), [dry, setDry] = useState(true), [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const start = useStartImport(() => { setFile(null); setPage(1); if (input.current) input.current.value = ""; });
  const cancel = useCancelImport();
  const go = async () => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) return toast.error("El archivo debe ser .csv");
    if (file.size > MAX_IMPORT) return toast.error("El CSV supera 10 MB");
    // una importación real modifica el catálogo / los clientes: se confirma (la simulación no cambia nada)
    if (!dry && !(await confirm({ title: "Importar de verdad", message: `Se aplicará “${file.name}” (${kind === "products" ? "productos" : "clientes"}): se crearán y actualizarán registros reales y no hay forma automática de deshacerlo. Si no lo has hecho, valida antes con una simulación.`, confirmLabel: "Importar ahora", danger: true }))) return;
    start.mutate({ file, type: kind, dryRun: dry });
  };
  return (
    <>
      <PageHeader title="Importador" description="Sube un CSV de productos (formato Shopify) o clientes. Usa la simulación para validar antes de aplicar." />
      {can && <Card title="Nueva importación" className="mb-4"><div className="grid items-end gap-3 sm:grid-cols-[12rem_1fr_auto_auto]">
        <Select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as ImportKind)}><option value="products">Productos</option><option value="customers">Clientes</option></Select>
        <div><label htmlFor="csv" className="mb-1.5 block text-xs font-medium">Archivo CSV (máx. 10 MB)</label><input id="csv" ref={input} type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-fg" /></div>
        <Checkbox label="Simulación (dry run)" checked={dry} onChange={(e) => setDry(e.target.checked)} />
        <Button variant="primary" icon={<Upload className="size-4" />} loading={start.isPending} disabled={!file} onClick={() => void go()}>{dry ? "Validar" : "Importar"}</Button>
      </div><p className="mt-2 text-xs text-muted">Productos requiere columna “title”; clientes, “email”. El archivo se procesa en segundo plano.</p></Card>}
      {isLoading ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        : error ? <p role="alert" className="rounded-sm border border-line p-4 text-sm text-accent-text">{errorMessage(error)}</p>
        : !data?.items.length ? <EmptyState title="Sin importaciones" text="Las importaciones que lances aparecerán aquí con su progreso." />
        : <div className="space-y-3">{data.items.map((j) => <JobCard key={j.id} j={j} can={can} onCancel={async () => { if (await confirm({ title: "Cancelar importación", message: `Se detendrá “${j.fileName}”${j.dryRun ? "" : `: las filas ya procesadas (${j.processedRows} de ${j.totalRows}) permanecen aplicadas y no se revierten`}.`, confirmLabel: "Cancelar importación", danger: true })) cancel.mutate(j.id); }} cancelling={cancel.isPending} />)}
          {data.totalPages > 1 && <div className="rounded-sm border border-line bg-surface"><Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}</div>}
    </>
  );
}

function JobCard({ j, can, onCancel, cancelling }: { j: ImportJob; can: boolean; onCancel: () => void; cancelling: boolean }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const active = isActive(j);
  const detail = useImportDetail(open ? j.id : null, active).data;
  useEffect(() => { if (!active) void qc.invalidateQueries({ queryKey: ["import", j.id] }); }, [active, j.id, qc]); // al terminar, el detalle (errores) se relee una última vez
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-medium">{j.fileName} <span className="text-xs text-muted">· {j.type === "products" ? "Productos" : "Clientes"}{j.dryRun ? " · simulación" : ""} · <DateTime value={j.createdAt} /></span></p></div>
        <div className="flex items-center gap-2"><StatusBadge status={j.status} />{can && isActive(j) && <Button size="sm" variant="danger" loading={cancelling} icon={<X className="size-3.5" />} onClick={onCancel}>Cancelar importación</Button>}</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-surface2" role="progressbar" aria-label={`Progreso de ${j.fileName}`} aria-valuenow={j.progressPercent} aria-valuemin={0} aria-valuemax={100}><div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${j.progressPercent}%` }} /></div>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{j.processedRows} de {j.totalRows} filas ({j.progressPercent}%)</span>
        <Badge tone="ok">{j.createdCount} creados</Badge><Badge tone="info">{j.updatedCount} actualizados</Badge><Badge>{j.skippedCount} omitidos</Badge>{j.errorCount > 0 && <Badge tone="danger">{j.errorCount} errores</Badge>}
      </p>
      {j.errorCount > 0 && <Button size="sm" variant="ghost" className="mt-2" onClick={() => setOpen((o) => !o)}>{open ? "Ocultar errores" : "Ver errores"}</Button>}
      {open && (!detail ? <Skeleton className="mt-2 h-16" /> : (
        <>
          <table className="mt-3 w-full text-left text-xs"><caption className="sr-only">Errores por fila</caption><thead className="text-muted"><tr><th scope="col" className="w-16 py-1">Fila</th><th scope="col" className="w-48">Código</th><th scope="col">Error</th></tr></thead><tbody>{detail.errors.map((e, i) => <tr key={i} className="border-t border-line"><td className="py-1">{e.row || "archivo"}</td><td><code>{e.code}</code></td><td>{e.message}</td></tr>)}</tbody></table>
          {detail.errorsTruncated && <p className="mt-1 text-xs text-muted">Se muestran los primeros {detail.errors.length} errores de {detail.errorCount}.</p>}
        </>
      ))}
    </Card>
  );
}
