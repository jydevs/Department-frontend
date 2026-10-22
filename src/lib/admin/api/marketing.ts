"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, saveBlob } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged } from "@/lib/admin/query";

export type NewsletterStatus = "pending" | "subscribed" | "unsubscribed";
export type ContactStatus = "new" | "read" | "replied" | "spam";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: NewsletterStatus;
  source: string;
  consentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactStatus;
  ip: string | null;
  createdAt: string;
}

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Nuevo",
  read: "Leído",
  replied: "Respondido",
  spam: "Spam",
};

export const NEWSLETTER_STATUS_LABELS: Record<NewsletterStatus, string> = {
  pending: "Pendiente de confirmar",
  subscribed: "Suscrito",
  unsubscribed: "Dado de baja",
};

const NL = ["marketing", "newsletter"] as const;
const CT = ["marketing", "contact"] as const;

export function useNewsletter(params: { status?: string; q?: string; page: number; pageSize: number }) {
  return usePaged<NewsletterSubscriber>(NL, "/admin/newsletter", params);
}

export function useUnsubscribe() {
  const qc = useQueryClient();
  return useMutation<NewsletterSubscriber, ApiError, string>({
    mutationFn: (id) => api.post<NewsletterSubscriber>(`/admin/newsletter/${id}/unsubscribe`),
    onSuccess: () => qc.invalidateQueries({ queryKey: NL }),
  });
}

export async function exportNewsletterCsv(): Promise<void> {
  const blob = await api.download("/admin/newsletter/export");
  saveBlob(blob, "newsletter-suscriptores.csv");
}

export function useContactMessages(params: { status?: string; q?: string; page: number; pageSize: number }) {
  return usePaged<ContactMessage>(CT, "/admin/contact-messages", params);
}

export function useSetContactStatus() {
  const qc = useQueryClient();
  return useMutation<ContactMessage, ApiError, { id: string; status: ContactStatus }>({
    mutationFn: ({ id, status }) => api.patch<ContactMessage>(`/admin/contact-messages/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CT }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/admin/contact-messages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CT }),
  });
}
