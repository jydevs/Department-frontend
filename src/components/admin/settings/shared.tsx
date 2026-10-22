"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { NoAccess } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import { cn } from "@/lib/admin/utils";
import { ApiError, errorMessage } from "@/lib/admin/errors";

/** Aviso en línea (info / advertencia / peligro). */
export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "danger"; title?: string; children?: ReactNode; className?: string }) {
  const toneClass = {
    info: "border-info/40 bg-info/10",
    warning: "border-warning/40 bg-warning/10",
    danger: "border-danger/40 bg-danger/10",
  }[tone];
  const iconClass = { info: "text-info", warning: "text-warning", danger: "text-danger" }[tone];
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={cn("flex gap-3 rounded-md border px-3.5 py-3 text-sm", toneClass, className)}>
      <Icon aria-hidden size={18} className={cn("mt-0.5 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn("text-muted", title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}

/** Muestra `children` solo con el permiso de lectura; si no, la pantalla de acceso denegado (y sin lanzar peticiones que darían 403). */
export function PermissionGate({ perm, children }: { perm: string; children: ReactNode }) {
  const allowed = useCan(perm);
  if (!allowed) return <NoAccess permission={perm} />;
  return <>{children}</>;
}

const M4_CODE_MESSAGES: Record<string, string> = {
  DISCOUNT_CODE_EXISTS: "Ya existe un descuento con ese código.",
  DISCOUNT_IN_USE: "Este descuento ya tiene canjes: desactívalo en lugar de eliminarlo.",
  ZONE_EXISTS: "Ya existe una zona de envío con ese nombre.",
  STAFF_EXISTS: "Ya hay una persona del equipo con ese correo.",
  ALREADY_ANONYMIZED: "Este cliente ya está anonimizado y no se puede editar.",
  IMPORT_NOT_CANCELLABLE: "Solo se pueden cancelar importaciones en cola o en curso.",
  INVALID_OTP: "El código de verificación no es correcto.",
  "2FA_ALREADY_ENABLED": "La verificación en dos pasos ya está activada.",
  "2FA_NOT_ENABLED": "La verificación en dos pasos no está activada.",
  "2FA_NOT_STARTED": "Inicia primero la configuración de la verificación en dos pasos.",
  INVALID_EMAIL: "El correo de destino no es válido.",
  INVALID_TEMPLATE: "La plantilla usa variables o marcado que no están permitidos.",
  UNSUPPORTED_MEDIA_TYPE: "Solo se admiten archivos CSV en UTF-8 (.csv).",
  PAYLOAD_TOO_LARGE: "El archivo supera el límite de 10 MB.",
};

const FORBIDDEN_MESSAGES: Array<[string, string]> = [
  ["Only owners can modify an owner", "Solo un propietario puede modificar a otro propietario."],
  ["Only owners can assign the owner role", "Solo un propietario puede asignar el rol Propietario."],
  ["Only owners and admins can edit this template", "Solo propietarios y administradores pueden editar esta plantilla."],
  ["Only owners and admins can erase customers", "Solo propietarios y administradores pueden anonimizar clientes."],
  ["Cannot change your own role", "No puedes cambiar tu propio rol."],
  ["Cannot deactivate yourself", "No puedes desactivarte a ti mismo."],
  ["last active owner", "No se puede degradar ni desactivar al último propietario activo."],
];

/** Como `errorMessage`, pero traduce los códigos y reglas propias de este módulo. */
export function apiMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const mapped = M4_CODE_MESSAGES[e.code];
    if (mapped) return mapped;
    if (e.status === 403) {
      const hit = FORBIDDEN_MESSAGES.find(([needle]) => e.message.includes(needle));
      if (hit) return hit[1];
    }
  }
  return errorMessage(e);
}

/** Errores por campo de un VALIDATION_ERROR (vacío para otros errores). */
export function fieldErrorsOf(e: unknown): Record<string, string> {
  return e instanceof ApiError && e.code === "VALIDATION_ERROR" ? e.fieldErrors() : {};
}

/** Mensaje general: para VALIDATION_ERROR con errores por campo devuelve null (se muestran junto al campo). */
export function formErrorOf(e: unknown): string | null {
  if (e instanceof ApiError && e.code === "VALIDATION_ERROR" && Object.keys(e.fieldErrors()).length > 0) return null;
  return apiMessage(e);
}

export const RESOURCE_LABELS: Record<string, string> = {
  staff: "Personal",
  roles: "Roles",
  audit: "Auditoría",
  settings: "Ajustes",
  products: "Productos",
  collections: "Colecciones",
  inventory: "Inventario",
  orders: "Pedidos",
  customers: "Clientes",
  content: "Contenido",
  media: "Medios",
  discounts: "Descuentos",
  shipping: "Envíos e impuestos",
  marketing: "Marketing",
  import: "Importador",
  analytics: "Analítica",
};

export const ACTION_LABELS: Record<string, string> = {
  read: "Ver",
  write: "Editar",
  publish: "Publicar",
};

export interface PermissionGroup {
  resource: string;
  label: string;
  actions: string[];
}

/** Agrupa "recurso:acción" por recurso. */
export function groupPermissions(perms: readonly string[]): PermissionGroup[] {
  if (perms.includes("*")) return [{ resource: "*", label: "Todos los recursos", actions: ["todo"] }];
  const map = new Map<string, string[]>();
  for (const p of perms) {
    const [resource, action = ""] = p.split(":");
    const list = map.get(resource) ?? [];
    list.push(action);
    map.set(resource, list);
  }
  return [...map.entries()]
    .map(([resource, actions]) => ({ resource, label: RESOURCE_LABELS[resource] ?? resource, actions }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  fulfillment: "Logística",
  support: "Soporte",
  analyst: "Analista",
};

/** owner y admin pueden anonimizar clientes y editar plantillas sensibles. */
export function isOwnerOrAdmin(role: string | undefined | null): boolean {
  return role === "owner" || role === "admin";
}

/** Valor legible (texto plano) de cualquier JSON para tablas de diff. */
export function plainValue(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return v === "" ? "(vacío)" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Encabezado accesible para columnas de acciones (texto solo para lectores). */
export function ActionsHeader() {
  return <span className="sr-only">Acciones</span>;
}
