"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft, type CmsDoc, type JsonValue } from "@/lib/admin/api/content";
import { ApiError, errorMessage } from "@/lib/admin/errors";

export interface ResetOpts {
  /** Si hay cambios locales sin guardar, los conserva aparte (`kept`) para poder recuperarlos tras cargar la versión del servidor. */
  keepLocal?: boolean;
}

/**
 * Estado local del borrador con autoguardado (3 s sin teclear) y aviso de cambios sin guardar.
 * - Guardados SERIALIZADOS: una cola de una sola promesa. Cada guardado toma lo MÁS RECIENTE al ejecutarse y la versión que devolvió el anterior,
 *   así que dos guardados nunca viajan a la vez con la misma `version` (sin falsos 409 propios) y llamar a `flush()` varias veces equivale a esperar
 *   al guardado en vuelo y, si hubo más cambios, a uno más.
 * - El texto escrito durante un guardado en vuelo no se pierde: `dirty` es "revisión local ≠ última revisión guardada".
 * - `validate` (pura) devuelve el nº de errores: el servidor valida el documento completo, así que con errores locales no se guarda.
 * - 409 CONCURRENT_UPDATE → `conflict`: otra persona guardó. Al recargar la versión del servidor lo local se conserva en `kept`.
 */
export function useDraft(doc: CmsDoc, validate?: (v: JsonValue) => number) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<JsonValue>(doc.draft ?? {});
  const [rev, setRev] = useState(0);
  const [savedRev, setSavedRev] = useState(0);
  const [version, setVersion] = useState(doc.version);
  const [pending, setPending] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
  const [savedAt, setSavedAt] = useState(0); // contador de guardados: la vista previa se recarga con él
  const [kept, setKept] = useState<JsonValue | null>(null);
  const keptRef = useRef<JsonValue | null>(null);
  // fuente de verdad síncrona (los manejadores y la cola leen siempre lo último)
  const st = useRef({ local: (doc.draft ?? {}) as JsonValue, rev: 0, savedRev: 0, version: doc.version, epoch: 0, conflict: false, validate });
  const chain = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { st.current.validate = validate; }, [validate]);

  const run = useCallback(async () => {
    const s = st.current;
    if (s.rev === s.savedRev) return; // nada nuevo desde el último guardado
    if (s.conflict) throw new Error("Otra persona modificó el documento: recarga la versión del servidor antes de guardar.");
    if (s.validate && s.validate(s.local) > 0) throw new Error("Corrige los errores de validación antes de guardar");
    const sent = { local: s.local, rev: s.rev, epoch: s.epoch };
    try {
      const saved = await saveDraft(qc, { kind: doc.kind, key: doc.key, draft: sent.local, version: s.version });
      if (sent.epoch !== s.epoch) return; // el documento se reemplazó (recargar/descartar) mientras se guardaba
      s.version = saved.version; s.savedRev = sent.rev;
      setVersion(saved.version); setSavedRev(sent.rev); setIssues([]); setError(null); setConflict(false); setSavedAt((n) => n + 1);
    } catch (e) {
      if (sent.epoch === s.epoch) {
        if (e instanceof ApiError && e.code === "CONCURRENT_UPDATE") { s.conflict = true; setConflict(true); }
        else setError(errorMessage(e));
        if (e instanceof ApiError && e.details.length) setIssues(e.details);
      }
      throw e;
    }
  }, [qc, doc.kind, doc.key]);

  /** Guarda lo más reciente. Serializado: se encadena tras cualquier guardado en vuelo. */
  const flush = useCallback((): Promise<void> => {
    setPending((n) => n + 1);
    const p = chain.current.then(run).finally(() => setPending((n) => n - 1));
    chain.current = p.catch(() => undefined);
    return p;
  }, [run]);
  /** Espera a que termine lo que haya en vuelo (sin iniciar otro guardado). */
  const settle = useCallback(() => chain.current, []);
  /** Versión del documento que conoce el editor AHORA (la que devolvió el último guardado), sin esperar a un render. */
  const getVersion = useCallback(() => st.current.version, []);

  const dirty = rev !== savedRev;
  useEffect(() => {
    if (!dirty || conflict) return;
    const t = setTimeout(() => { const s = st.current; if (s.validate && s.validate(s.local) > 0) return; void flush().catch(() => undefined); }, 3000);
    return () => clearTimeout(t);
  }, [rev, dirty, conflict, flush]);

  const change = useCallback((v: JsonValue) => { const s = st.current; s.local = v; s.rev += 1; setLocal(v); setRev(s.rev); }, []);
  /** Adopta un documento del servidor (descartar, restaurar, recargar tras conflicto). */
  const reset = useCallback((d: CmsDoc, o: ResetOpts = {}) => {
    const s = st.current;
    if (o.keepLocal && s.rev !== s.savedRev) { keptRef.current = s.local; setKept(s.local); } else if (!o.keepLocal) { keptRef.current = null; setKept(null); }
    s.epoch += 1; s.local = d.draft ?? {}; s.version = d.version; s.rev += 1; s.savedRev = s.rev; s.conflict = false;
    setLocal(s.local); setVersion(d.version); setRev(s.rev); setSavedRev(s.rev); setConflict(false); setIssues([]); setError(null); setSavedAt((n) => n + 1);
  }, []);
  /** Vuelve a poner como borrador local lo que se conservó al recargar la versión del servidor. */
  const restoreKept = useCallback(() => { const k = keptRef.current; keptRef.current = null; setKept(null); if (k !== null) change(k); }, [change]);
  const dismissKept = useCallback(() => { keptRef.current = null; setKept(null); }, []);
  return { local, change, dirty, saving: pending > 0, flush, settle, getVersion, reset, conflict, error, issues, savedAt, version, kept, restoreKept, dismissKept };
}

export type Draft = ReturnType<typeof useDraft>;
