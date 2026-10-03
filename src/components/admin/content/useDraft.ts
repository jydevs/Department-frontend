"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft, type CmsDoc, type JsonValue } from "@/lib/admin/api/content";
import { ApiError } from "@/lib/admin/errors";

/**
 * Estado local del borrador con autoguardado (3 s sin teclear) y aviso de cambios sin guardar.
 * - Bloqueo optimista: cada guardado envía la `version` del documento y adopta la que devuelve el servidor.
 * - `validate` (pura) devuelve el nº de errores: el servidor valida el documento completo, así que con errores
 *   locales no se autoguarda (el botón "Guardar" tampoco) hasta corregirlos.
 * - 409 CONCURRENT_UPDATE → `conflict` (la pantalla ofrece recargar la versión del servidor).
 */
export function useDraft(doc: CmsDoc, validate?: (v: JsonValue) => number) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<JsonValue>(doc.draft ?? {});
  const [dirty, setDirty] = useState(false);
  const [rev, setRev] = useState(0);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
  const [savedAt, setSavedAt] = useState(0); // contador de guardados: la vista previa se recarga con él
  const latest = useRef({ local, rev, validate });
  const version = useRef(doc.version);
  useEffect(() => { latest.current = { local, rev, validate }; }, [local, rev, validate]);

  const flush = useCallback(async () => {
    const sent = latest.current;
    if (sent.validate && sent.validate(sent.local) > 0) throw new Error("Corrige los errores de validación antes de guardar");
    setSaving(true);
    try {
      const saved = await saveDraft(qc, { kind: doc.kind, key: doc.key, draft: sent.local, version: version.current });
      version.current = saved.version;
      setIssues([]); setConflict(false); setSavedAt((n) => n + 1);
      if (latest.current.rev === sent.rev) setDirty(false);
    } catch (e) {
      if (e instanceof ApiError && e.code === "CONCURRENT_UPDATE") setConflict(true);
      if (e instanceof ApiError && e.details.length) setIssues(e.details);
      throw e;
    } finally { setSaving(false); }
  }, [qc, doc.kind, doc.key]);

  useEffect(() => {
    if (!dirty || conflict) return;
    const t = setTimeout(() => { if (latest.current.validate && latest.current.validate(latest.current.local) > 0) return; void flush().catch(() => undefined); }, 3000);
    return () => clearTimeout(t);
  }, [rev, dirty, conflict, flush]);

  const change = useCallback((v: JsonValue) => { setLocal(v); setDirty(true); setRev((r) => r + 1); }, []);
  /** Adopta un documento del servidor (descartar, restaurar, recargar tras conflicto). */
  const reset = useCallback((d: CmsDoc) => { setLocal(d.draft ?? {}); version.current = d.version; setDirty(false); setConflict(false); setIssues([]); setRev((r) => r + 1); setSavedAt((n) => n + 1); }, []);
  return { local, change, dirty, saving, flush, reset, conflict, issues, savedAt };
}
