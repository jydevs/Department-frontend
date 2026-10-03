"use client";
import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader, StatusBadge } from "@/components/ui/Display";
import { Checkbox, Select } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useCancelImport, useImports, useStartImport } from "@/lib/api/admin";
import { useCan } from "@/lib/permissions";
import type { ImportJob } from "@/lib/types";

const MAX = 5 * 1024 * 1024;
export default function ImportsPage() {
  const { data } = useImports();
  const start = useStartImport(), cancel = useCancelImport(), toast = useToast();
  const can = useCan("import:write");
  const [kind, setKind] = useState<ImportJob["kind"]>("products"), [dry, setDry] = useState(true), [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const go = async () => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) return toast.error("El archivo debe ser .csv");
    if (file.size > MAX) return toast.error("El CSV supera 5 MB");
    const rows = (await file.text()).split(/\r?\n/);
    start.mutate({ kind, file: file.name, rows, dryRun: dry }, { onSuccess: () => { setFile(null); if (input.current) input.current.value = ""; } });
  };
  return (
    <>
      <PageHeader title="Importador" description="Sube un CSV de productos (formato Shopify) o clientes. Usa la simulación para validar antes de aplicar." />
      {can && <Card title="Nueva importación" className="mb-4"><div className="grid items-end gap-3 sm:grid-cols-[12rem_1fr_auto_auto]">
        <Select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as ImportJob["kind"])}><option value="products">Productos</option><option value="customers">Clientes</option></Select>
        <div><label htmlFor="csv" className="mb-1.5 block text-xs font-medium">Archivo CSV</label><input id="csv" ref={input} type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-fg" /></div>
        <Checkbox label="Simulación (dry run)" checked={dry} onChange={(e) => setDry(e.target.checked)} />
        <Button variant="primary" icon={<Upload className="size-4" />} loading={start.isPending} disabled={!file} onClick={() => void go()}>{dry ? "Validar" : "Importar"}</Button>
      </div><p className="mt-2 text-xs text-muted">Productos requiere columna “title”; clientes, “email”.</p></Card>}
      <div className="space-y-3">{data?.map((j) => (
        <Card key={j.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{j.file} <span className="text-xs text-muted">· {j.kind === "products" ? "Productos" : "Clientes"}{j.dryRun ? " · simulación" : ""}</span></p></div>
          <div className="flex items-center gap-2"><StatusBadge status={j.status} />{can && j.status === "running" && <Button size="sm" variant="danger" icon={<X className="size-3.5" />} onClick={() => cancel.mutate(j.id)}>Cancelar</Button>}</div></div>
          <div className="mt-3 h-2 rounded-full bg-surface2" role="progressbar" aria-label={`Progreso de ${j.file}`} aria-valuenow={j.processed} aria-valuemin={0} aria-valuemax={j.total}><div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${(j.processed / Math.max(1, j.total)) * 100}%` }} /></div>
          <p className="mt-1 text-xs text-muted">{j.processed} de {j.total} filas · {j.errors.length} errores</p>
          {j.errors.length > 0 && <table className="mt-3 w-full text-left text-xs"><caption className="sr-only">Errores por fila</caption><thead className="text-muted"><tr><th scope="col" className="w-16 py-1">Fila</th><th scope="col">Error</th></tr></thead><tbody>{j.errors.map((e) => <tr key={e.row} className="border-t border-line"><td className="py-1">{e.row}</td><td>{e.message}</td></tr>)}</tbody></table>}
        </Card>))}</div>
    </>
  );
}
