"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { useConfirm, useToast } from "@/components/admin/ui";
import { ApiError, errorMessage, isConcurrentUpdate } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { useDocument, useDocumentMutations, type ContentKind, type DocDetail } from "@/lib/admin/api/content";
import { clone, deepEqual, type Obj } from "./content-utils";

export type ErrorMap = Record<string, string>;

/** Avisa antes de salir (recarga, cierre de pestaña o enlaces internos) mientras haya cambios sin guardar. */
export function useUnsavedGuard(dirty: boolean): void {
  const confirm = useConfirm();
  const router = useRouter();
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const a = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      void confirm({
        title: "Tienes cambios sin guardar",
        description: "Si sales ahora, se perderán los cambios que no hayas guardado como borrador.",
        confirmLabel: "Salir sin guardar",
        cancelLabel: "Seguir editando",
        tone: "danger",
      }).then((ok) => {
        if (ok) router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };
    window.addEventListener("beforeunload", onBefore);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBefore);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, confirm, router]);
}

export interface DocumentEditor {
  detail: DocDetail | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  data: Obj | null;
  setData: (next: Obj | ((cur: Obj) => Obj)) => void;
  dirty: boolean;
  errors: ErrorMap;
  setErrors: (e: ErrorMap) => void;
  /** Otro usuario guardó una versión más nueva (o la API respondió CONCURRENT_UPDATE). */
  conflict: boolean;
  /** Descarta los cambios locales y vuelve a leer el borrador del servidor. */
  reload: () => Promise<void>;
  save: () => Promise<boolean>;
  saving: boolean;
  publish: (note?: string) => Promise<boolean>;
  publishing: boolean;
  schedule: (publishAt: string, note?: string) => Promise<boolean>;
  scheduling: boolean;
  cancelSchedule: (versionId: string) => Promise<boolean>;
  discard: () => Promise<boolean>;
  discarding: boolean;
  restore: (versionId: string) => Promise<boolean>;
  restoring: boolean;
  /** Se incrementa tras cada guardado correcto (para recargar la vista previa). */
  savedTick: number;
  canWrite: boolean;
  canPublish: boolean;
}

interface Options {
  /** Validación local previa al guardado (devuelve errores por ruta). */
  validate?: (data: Obj) => ErrorMap;
}

/** Controlador de edición de un documento del CMS: borrador local, bloqueo optimista, guardar, publicar, programar… */
export function useDocumentEditor(kind: ContentKind, key: string, options: Options = {}): DocumentEditor {
  const toast = useToast();
  const canWrite = useCan("content:write");
  const canPublish = useCan("content:publish");
  const query = useDocument(kind, key);
  const m = useDocumentMutations(kind, key);
  const detail = query.data;

  const [data, setDataState] = useState<Obj | null>(null);
  const [base, setBase] = useState<{ version: number; draft: Obj } | null>(null);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [conflict, setConflict] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  const dirty = data !== null && base !== null && !deepEqual(data, base.draft);

  const adopt = useCallback((d: DocDetail) => {
    setBase({ version: d.version, draft: d.draft });
    setDataState(clone(d.draft));
    setConflict(false);
  }, []);

  // Adopta el documento al cargarlo, y cuando cambia en el servidor sin cambios locales pendientes.
  if (detail && (base === null || (detail.version !== base.version && !dirty))) {
    setBase({ version: detail.version, draft: detail.draft });
    setDataState(clone(detail.draft));
  }
  const stale = !!detail && !!base && detail.version !== base.version && dirty;

  const setData = useCallback((next: Obj | ((cur: Obj) => Obj)) => {
    setDataState((cur) => {
      if (cur === null) return cur;
      return typeof next === "function" ? next(cur) : next;
    });
  }, []);

  const fail = useCallback(
    (e: unknown) => {
      if (isConcurrentUpdate(e)) {
        setConflict(true);
        toast.warning("Alguien más editó este documento mientras trabajabas. Recarga para ver sus cambios.");
        return;
      }
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") setErrors(e.fieldErrors());
      toast.error(errorMessage(e));
    },
    [toast],
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (!data || !base) return false;
    const local = options.validate?.(data) ?? {};
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error("Corrige los campos marcados antes de guardar.");
      return false;
    }
    try {
      const res = await m.saveDraft.mutateAsync({ data, version: base.version });
      adopt(res);
      setErrors({});
      setSavedTick((t) => t + 1);
      toast.success("Borrador guardado");
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, base, m.saveDraft, adopt, fail, toast, options.validate]);

  // Ctrl/Cmd + S guarda el borrador
  const saveRef = useRef(save);
  const stateRef = useRef({ dirty, canWrite });
  useEffect(() => {
    saveRef.current = save;
    stateRef.current = { dirty, canWrite };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (stateRef.current.canWrite && stateRef.current.dirty) void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useUnsavedGuard(dirty);

  const publish = useCallback(
    async (note?: string): Promise<boolean> => {
      if (dirty && !(await save())) return false;
      try {
        const res = await m.publish.mutateAsync({ note: note?.trim() || undefined });
        adopt(res);
        setErrors({});
        toast.success("Publicado: los cambios ya están en la tienda");
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.code === "NOTHING_TO_PUBLISH") {
          toast.info("No hay cambios por publicar: el borrador es igual a lo publicado.");
          return false;
        }
        fail(e);
        return false;
      }
    },
    [dirty, save, m.publish, adopt, fail, toast],
  );

  const schedule = useCallback(
    async (publishAt: string, note?: string): Promise<boolean> => {
      if (dirty && !(await save())) return false;
      try {
        await m.schedule.mutateAsync({ publishAt, note: note?.trim() || undefined });
        toast.success("Publicación programada");
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
    [dirty, save, m.schedule, fail, toast],
  );

  const cancelSchedule = useCallback(
    async (versionId: string): Promise<boolean> => {
      try {
        await m.cancelSchedule.mutateAsync(versionId);
        toast.success("Programación cancelada");
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
    [m.cancelSchedule, fail, toast],
  );

  const discard = useCallback(async (): Promise<boolean> => {
    try {
      const res = await m.discard.mutateAsync();
      adopt(res);
      setErrors({});
      setSavedTick((t) => t + 1);
      toast.success("Borrador restablecido a lo publicado");
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === "NOT_PUBLISHED") toast.info("Este documento aún no tiene una versión publicada a la que volver.");
      else fail(e);
      return false;
    }
  }, [m.discard, adopt, fail, toast]);

  const restore = useCallback(
    async (versionId: string): Promise<boolean> => {
      try {
        const res = await m.restore.mutateAsync(versionId);
        adopt(res);
        setErrors({});
        setSavedTick((t) => t + 1);
        toast.success("Versión restaurada al borrador. Revísala y publícala cuando quieras.");
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.code === "VERSION_INVALID") toast.error("Esa versión ya no cumple el esquema actual y no se puede restaurar.");
        else fail(e);
        return false;
      }
    },
    [m.restore, adopt, fail, toast],
  );

  const reload = useCallback(async () => {
    const res = await query.refetch();
    if (res.data) {
      adopt(res.data);
      setErrors({});
    }
  }, [query, adopt]);

  return {
    detail,
    isLoading: query.isPending,
    error: query.error,
    refetch: () => void query.refetch(),
    data,
    setData,
    dirty,
    errors,
    setErrors,
    conflict: conflict || stale,
    reload,
    save,
    saving: m.saveDraft.isPending,
    publish,
    publishing: m.publish.isPending,
    schedule,
    scheduling: m.schedule.isPending,
    cancelSchedule,
    discard,
    discarding: m.discard.isPending,
    restore,
    restoring: m.restore.isPending,
    savedTick,
    canWrite,
    canPublish,
  };
}
