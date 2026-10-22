"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Badge, Button, Card, DataTable, DateTime, EmptyState, PageHeader, Select, Switch, useToast, type DataTableColumn } from "@/components/admin/ui";
import { Notice, apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { saveBlob } from "@/lib/admin/api-client";
import { useCan } from "@/lib/admin/permissions";
import { cn } from "@/lib/admin/utils";

import { formatNumber } from "@/lib/admin/format";
import {
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_TONES,
  IMPORT_TYPE_LABELS,
  MAX_IMPORT_BYTES,
  isActiveJob,
  templateCsv,
  useCreateImport,
  useImportJobs,
  type ImportJob,
  type ImportType,
} from "@/lib/admin/api/imports";
import { ImportJobDrawer } from "./import-job-drawer";

function UploadCard({ onCreated }: { onCreated: (id: string) => void }) {
  const toast = useToast();
  const create = useCreateImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<ImportType>("products");
  const [dryRun, setDryRun] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setError("Solo se admiten archivos .csv (UTF-8).");
    if (f.size === 0) return setError("El archivo está vacío.");
    if (f.size > MAX_IMPORT_BYTES) return setError("El archivo supera los 10 MB.");
    setFile(f);
  };

  const submit = async () => {
    if (!file) return setError("Elige un archivo CSV.");
    setError(null);
    try {
      const job = await create.mutateAsync({ file, type, dryRun });
      toast.success(dryRun ? "Simulación en cola" : "Importación en cola");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onCreated(job.id);
    } catch (e) {
      setError(apiMessage(e));
      toast.error(apiMessage(e));
    }
  };

  const downloadTemplate = () => saveBlob(new Blob([`﻿${templateCsv(type)}`], { type: "text/csv;charset=utf-8" }), `plantilla-shopify-${type}.csv`);

  return (
    <Card title="Subir archivo" description="CSV con el formato de exportación de Shopify (UTF-8, hasta 10 MB y 5.000 filas).">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
            className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors", drag ? "border-accent bg-accent/5" : "border-border-strong bg-surface-2/50")}
          >
            <FileSpreadsheet aria-hidden size={28} className="text-muted" />
            {file ? (
              <p className="text-sm"><strong>{file.name}</strong> <span className="text-muted">({(file.size / 1024).toFixed(1)} KB)</span></p>
            ) : (
              <p className="text-sm text-muted">Arrastra aquí tu CSV o</p>
            )}
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              {file ? "Elegir otro archivo" : "Elegir archivo"}
            </Button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Archivo CSV" data-testid="import-file" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
        <div className="space-y-4">
          <Select
            label="Tipo de datos"
            value={type}
            onChange={(e) => setType(e.target.value as ImportType)}
            options={[
              { value: "products", label: "Productos" },
              { value: "customers", label: "Clientes" },
            ]}
          />
          <Switch checked={dryRun} onChange={setDryRun} label="Simulación (dry run)" hint={dryRun ? "Valida el archivo y cuenta lo que haría, sin guardar nada." : "Se crearán y actualizarán datos reales."} />
          <Button variant="primary" className="w-full" leftIcon={<Upload aria-hidden size={15} />} onClick={submit} loading={create.isPending} disabled={!file}>
            {dryRun ? "Simular importación" : "Importar"}
          </Button>
        </div>
      </div>
      <details className="mt-5 rounded-md border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Guía de formato</summary>
        <div className="space-y-2 border-t border-border p-3 text-sm text-muted">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Productos:</strong> una fila por variante; las filas del mismo <code>Handle</code> forman un producto. Obligatorias: <code>Handle</code> y <code>Title</code>. El resto de columnas Shopify (Vendor, Type, Tags, Option1 Name/Value, Variant SKU/Price/Inventory Qty, Image Src, Status…) son opcionales.</li>
            <li><strong>Clientes:</strong> una fila por cliente. Obligatoria: <code>Email</code>. Opcionales: First/Last Name, Phone, Accepts Email Marketing y la dirección predeterminada.</li>
            <li>Los errores se reportan por fila (sin el contenido de las celdas). Empieza siempre con una simulación.</li>
          </ul>
          <Button size="sm" leftIcon={<Download aria-hidden size={14} />} onClick={downloadTemplate}>
            Descargar plantilla CSV de {IMPORT_TYPE_LABELS[type].toLowerCase()}
          </Button>
        </div>
      </details>
    </Card>
  );
}

export function ImportsPage() {
  return (
    <PermissionGate perm="import:read">
      <ImportsPageInner />
    </PermissionGate>
  );
}

function ImportsPageInner() {
  const canWrite = useCan("import:write");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useImportJobs(page, pageSize);
  const hasActive = query.data?.items.some((j) => isActiveJob(j.status)) ?? false;
  const refetchJobs = query.refetch;
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => void refetchJobs(), 2000);
    return () => clearInterval(t);
  }, [hasActive, refetchJobs]);


  const columns: DataTableColumn<ImportJob>[] = [
    { key: "file", header: "Archivo", cell: (j) => <span className="block max-w-[220px] truncate font-medium">{j.fileName}</span> },
    { key: "type", header: "Tipo", hideOnMobile: true, cell: (j) => IMPORT_TYPE_LABELS[j.type] },
    {
      key: "mode",
      header: "Modo",
      hideOnMobile: true,
      cell: (j) => (j.dryRun ? <Badge tone="info">Simulación</Badge> : <Badge tone="neutral">Real</Badge>),
    },
    {
      key: "status",
      header: "Estado",
      cell: (j) => (
        <span className="inline-flex items-center gap-2">
          <Badge tone={IMPORT_STATUS_TONES[j.status]} dot>{IMPORT_STATUS_LABELS[j.status]}</Badge>
          {isActiveJob(j.status) ? <span className="text-xs text-muted">{j.progressPercent}%</span> : null}
        </span>
      ),
    },
    {
      key: "counts",
      header: "Resultado",
      hideOnMobile: true,
      cell: (j) => (
        <span className="text-[13px] tabular-nums text-muted">
          +{formatNumber(j.createdCount)} · ~{formatNumber(j.updatedCount)} · ={formatNumber(j.skippedCount)} · <span className={j.errorCount ? "text-danger" : undefined}>!{formatNumber(j.errorCount)}</span>
        </span>
      ),
    },
    { key: "date", header: "Fecha", hideOnMobile: true, cell: (j) => <DateTime value={j.createdAt} mode="relative" /> },
  ];

  const data = query.data;
  return (
    <>
      <PageHeader title="Importador" description="Trae productos o clientes desde un CSV de Shopify." />
      <div className="space-y-5">
        {canWrite ? <UploadCard onCreated={setOpenId} /> : <Notice>Tu rol solo permite consultar el historial de importaciones (<code>import:write</code> es necesario para subir archivos).</Notice>}
        <div>
          <h2 className="mb-3 text-[15px]">Historial</h2>
          <DataTable
            aria-label="Historial de importaciones"
            columns={columns}
            rows={data?.items ?? []}
            getRowId={(j) => j.id}
            onRowClick={(j) => setOpenId(j.id)}
            loading={query.isFetching}
            error={query.isError ? query.error : undefined}
            onRetry={() => query.refetch()}
            empty={<EmptyState icon={<Upload aria-hidden size={22} />} title="Aún no hay importaciones" description="Sube un CSV para empezar." />}
            pagination={data ? { page, pageSize, total: data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); }, pageSizes: [10, 25, 50] } : undefined}
          />
          <p className="mt-2 text-xs text-muted">Resultado: + creados · ~ actualizados · = omitidos · ! errores.</p>
        </div>
      </div>
      {openId ? <ImportJobDrawer id={openId} canWrite={canWrite} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
