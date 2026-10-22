"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/lib/admin/errors";
import { uploadMedia, validateUpload, type MediaItem } from "@/lib/admin/api/media";

export interface UploadEntry {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
  media?: MediaItem;
  /** El servidor ya tenía el mismo archivo (mismo hash) y devolvió el existente. */
  reused?: boolean;
}

const CONCURRENCY = 3;

/** Cola de subidas con progreso por archivo. `onBatchDone` recibe los medios subidos de cada tanda. */
export function useUploader(onBatchDone?: (media: MediaItem[]) => void) {
  const qc = useQueryClient();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const counter = useRef(0);
  const doneCb = useRef(onBatchDone);
  useEffect(() => {
    doneCb.current = onBatchDone;
  });

  const patch = useCallback((id: string, p: Partial<UploadEntry>) => {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...p } : e)));
  }, []);

  const addFiles = useCallback(
    (input: FileList | File[]) => {
      const files = Array.from(input);
      if (!files.length) return;
      const batch = files.map((file) => {
        counter.current += 1;
        const id = `up-${counter.current}`;
        const error = validateUpload(file);
        const entry: UploadEntry = { id, name: file.name, size: file.size, status: error ? "error" : "uploading", progress: 0, error: error ?? undefined };
        return { file, entry };
      });
      setEntries((list) => [...batch.map((b) => b.entry), ...list]);
      const queue = batch.filter((b) => b.entry.status === "uploading");
      const results: MediaItem[] = [];
      let cursor = 0;
      const worker = async () => {
        while (cursor < queue.length) {
          const job = queue[cursor++];
          try {
            const { media, created } = await uploadMedia(job.file, (pct) => patch(job.entry.id, { progress: pct }));
            results.push(media);
            patch(job.entry.id, { status: "done", progress: 100, media, reused: !created });
          } catch (e) {
            patch(job.entry.id, { status: "error", error: errorMessage(e) });
          }
        }
      };
      void Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)).then(() => {
        if (queue.length) void qc.invalidateQueries({ queryKey: ["media"] });
        if (results.length) doneCb.current?.(results);
      });
    },
    [patch, qc],
  );

  const clearFinished = useCallback(() => setEntries((list) => list.filter((e) => e.status === "uploading")), []);
  const busy = entries.some((e) => e.status === "uploading");

  return { entries, addFiles, clearFinished, busy };
}
