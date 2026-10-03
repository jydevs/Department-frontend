"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSaveDraft } from "@/lib/api/content";
import type { ContentDoc, JsonValue } from "@/lib/types";

/** Estado local del borrador con autoguardado (3 s sin teclear) y aviso de cambios sin guardar. */
export function useDraft(doc: ContentDoc, withSeo = false) {
  const [local, setLocal] = useState<JsonValue>(doc.draft);
  const [seo, setSeo] = useState({ seoTitle: doc.seoTitle ?? "", seoDescription: doc.seoDescription ?? "" });
  const [dirty, setDirty] = useState(false);
  const save = useSaveDraft();
  const latest = useRef({ local, seo });
  useEffect(() => { latest.current = { local, seo }; }, [local, seo]);
  const flush = useCallback(() => {
    save.mutate({ kind: doc.kind, key: doc.key, draft: latest.current.local, ...(withSeo ? latest.current.seo : {}) }, { onSuccess: () => setDirty(false) });
  }, [save, doc.kind, doc.key, withSeo]);
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(flush, 3000);
    return () => clearTimeout(t);
  }, [local, seo, dirty, flush]);
  const change = useCallback((v: JsonValue) => { setLocal(v); setDirty(true); }, []);
  const changeSeo = useCallback((p: Partial<typeof seo>) => { setSeo((s) => ({ ...s, ...p })); setDirty(true); }, []);
  const reset = useCallback((v: JsonValue) => { setLocal(v); setDirty(false); }, []);
  return { local, change, seo, changeSeo, dirty, saving: save.isPending, flush, reset };
}
