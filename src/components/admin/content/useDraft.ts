"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSaveDraft } from "@/lib/admin/api/content";
import type { ContentDoc, JsonValue } from "@/lib/admin/types";

/**
 * Estado local del borrador con autoguardado (3 s sin teclear) y aviso de cambios sin guardar.
 * Cada cambio incrementa una revisión; un guardado solo marca "limpio" si no hubo cambios mientras guardaba.
 */
export function useDraft(doc: ContentDoc, withSeo = false) {
  const [local, setLocal] = useState<JsonValue>(doc.draft);
  const [seo, setSeo] = useState({ seoTitle: doc.seoTitle ?? "", seoDescription: doc.seoDescription ?? "" });
  const [dirty, setDirty] = useState(false);
  const [rev, setRev] = useState(0);
  const { mutateAsync, isPending } = useSaveDraft();
  const latest = useRef({ local, seo, rev });
  useEffect(() => { latest.current = { local, seo, rev }; }, [local, seo, rev]);

  const flush = useCallback(async () => {
    const sent = latest.current;
    await mutateAsync({ kind: doc.kind, key: doc.key, draft: sent.local, ...(withSeo ? sent.seo : {}) });
    if (latest.current.rev === sent.rev) setDirty(false);
  }, [mutateAsync, doc.kind, doc.key, withSeo]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => { void flush().catch(() => undefined); }, 3000);
    return () => clearTimeout(t);
  }, [rev, dirty, flush]);

  const change = useCallback((v: JsonValue) => { setLocal(v); setDirty(true); setRev((r) => r + 1); }, []);
  const changeSeo = useCallback((p: Partial<typeof seo>) => { setSeo((s) => ({ ...s, ...p })); setDirty(true); setRev((r) => r + 1); }, []);
  const reset = useCallback((v: JsonValue) => { setLocal(v); setDirty(false); setRev((r) => r + 1); }, []);
  return { local, change, seo, changeSeo, dirty, saving: isPending, flush, reset };
}
