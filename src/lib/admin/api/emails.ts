"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";

export interface EmailTemplate {
  key: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
  variables: string[];
  updatedAt: string;
}

export interface EmailTemplateInput {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
}

export interface EmailPreview {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

/** Plantillas con enlaces de un solo uso: solo owner/admin pueden editarlas. */
export const SENSITIVE_TEMPLATES = ["password_reset", "email_verify", "newsletter_confirm", "account_exists"];

export const TEMPLATE_LABELS: Record<string, { name: string; description: string }> = {
  order_confirmation: { name: "Confirmación de pedido", description: "Se envía al cliente al recibir su pedido." },
  order_shipped: { name: "Pedido enviado", description: "Aviso de despacho con guía de seguimiento." },
  order_cancelled: { name: "Pedido cancelado", description: "Se envía cuando se cancela un pedido." },
  password_reset: { name: "Restablecer contraseña", description: "Enlace para crear una nueva contraseña." },
  email_verify: { name: "Verificación de correo", description: "Enlace para confirmar el correo de la cuenta." },
  welcome: { name: "Bienvenida", description: "Primer correo tras crear la cuenta." },
  refund_issued: { name: "Reembolso emitido", description: "Confirma un reembolso al cliente." },
  newsletter_confirm: { name: "Confirmación de newsletter", description: "Doble confirmación de la suscripción." },
  account_exists: { name: "La cuenta ya existe", description: "Respuesta cuando alguien intenta registrar un correo ya usado." },
};

/** Datos de ejemplo iniciales de la vista previa (los mismos que usa el servidor). */
export const SAMPLE_DATA: Record<string, Record<string, string>> = {
  order_confirmation: { customerName: "Ana", orderNumber: "DD-1001", total: "$250.000", itemsSummary: "2 x Camiseta Oversize", orderUrl: "https://example.com/pedidos/DD-1001" },
  order_shipped: { customerName: "Ana", orderNumber: "DD-1001", carrier: "Servientrega", trackingNumber: "SV123456", trackingUrl: "https://example.com/rastreo/SV123456", orderUrl: "https://example.com/pedidos/DD-1001" },
  order_cancelled: { customerName: "Ana", orderNumber: "DD-1001", reason: "Cancelado a solicitud del cliente", orderUrl: "https://example.com/pedidos/DD-1001" },
  password_reset: { customerName: "Ana", resetUrl: "https://example.com/restablecer?token=ejemplo", expiresInMinutes: "60" },
  email_verify: { customerName: "Ana", verifyUrl: "https://example.com/verificar?token=ejemplo", expiresInHours: "48" },
  welcome: { customerName: "Ana", storeUrl: "https://example.com" },
  refund_issued: { customerName: "Ana", orderNumber: "DD-1001", amount: "$250.000", orderUrl: "https://example.com/pedidos/DD-1001" },
  newsletter_confirm: { confirmUrl: "https://example.com/newsletter/confirmar?token=ejemplo", unsubscribeUrl: "https://example.com/newsletter/baja?token=ejemplo" },
  account_exists: { customerName: "Ana", resetUrl: "https://example.com/account/forgot-password" },
};

const KEY = ["email-templates"] as const;

export function useEmailTemplates() {
  return useQuery<EmailTemplate[], ApiError>({
    queryKey: KEY,
    queryFn: ({ signal }) => api.get<EmailTemplate[]>("/admin/email-templates", { signal }),
  });
}

export function useEmailTemplate(key: string) {
  return useQuery<EmailTemplate, ApiError>({
    queryKey: [...KEY, key],
    queryFn: ({ signal }) => api.get<EmailTemplate>(`/admin/email-templates/${key}`, { signal }),
  });
}

export function useSaveEmailTemplate(key: string) {
  const qc = useQueryClient();
  return useMutation<EmailTemplate, ApiError, EmailTemplateInput>({
    mutationFn: (body) => api.put<EmailTemplate>(`/admin/email-templates/${key}`, body),
    onSuccess: (data) => {
      qc.setQueryData([...KEY, key], data);
      void qc.invalidateQueries({ queryKey: KEY, exact: true });
    },
  });
}

export function usePreviewEmail(key: string) {
  return useMutation<EmailPreview, ApiError, Record<string, string>>({
    mutationFn: (data) => api.post<EmailPreview>(`/admin/email-templates/${key}/preview`, { data }),
  });
}

export function useTestSendEmail(key: string) {
  return useMutation<void, ApiError, string>({
    mutationFn: (to) => api.post<void>(`/admin/email-templates/${key}/test-send`, { to }),
  });
}
