import { DEPARTMENTS } from "./departments";
import { PASSWORD_MAX, PASSWORD_MIN } from "./config";
import type { CustomerAddress } from "./types";

/** Field errors: field name → message. Empty object = valid. */
export type FieldErrors = Record<string, string>;

const CONTROL = /[\u0000-\u001f\u007f]/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,20}$/;

export function validEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 255 && EMAIL_RE.test(v);
}

/** Same rule as the API `name` field: 1..120 characters, no control characters. */
export function nameError(value: string, label: string): string | null {
  const v = value.trim();
  if (!v) return `Escribe tu ${label}.`;
  if (v.length > 120) return `El ${label} es demasiado largo (máximo 120).`;
  if (CONTROL.test(v)) return `El ${label} tiene caracteres no válidos.`;
  return null;
}

/** Digits with an optional leading +, 7..20 characters. Spaces and dashes typed by the user are removed first. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

export function phoneError(value: string, required: boolean): string | null {
  const v = normalizePhone(value);
  if (!v) return required ? "Escribe un teléfono." : null;
  return PHONE_RE.test(v) ? null : "Usa solo números (7 a 20 dígitos), con + opcional al inicio.";
}

export function passwordError(value: string): string | null {
  if (value.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (value.length > PASSWORD_MAX) return `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`;
  return null;
}

export interface AddressForm {
  label: string;
  fullName: string;
  phone: string;
  department: string;
  city: string;
  address1: string;
  address2: string;
  postalCode: string;
  documentType: string;
  documentNumber: string;
  isDefault: boolean;
}

export const EMPTY_ADDRESS: AddressForm = {
  label: "",
  fullName: "",
  phone: "",
  department: "",
  city: "",
  address1: "",
  address2: "",
  postalCode: "",
  documentType: "",
  documentNumber: "",
  isDefault: false,
};

export function addressToForm(a: CustomerAddress): AddressForm {
  return {
    label: a.label ?? "",
    fullName: a.fullName,
    phone: a.phone,
    department: a.department,
    city: a.city,
    address1: a.address1,
    address2: a.address2 ?? "",
    postalCode: a.postalCode ?? "",
    documentType: a.documentType ?? "",
    documentNumber: a.documentNumber ?? "",
    isDefault: a.isDefault,
  };
}

function textError(value: string, min: number, max: number, label: string): string | null {
  const v = value.trim();
  if (v.length < min) return min <= 1 ? `Completa ${label}.` : `${label[0]?.toUpperCase()}${label.slice(1)} debe tener al menos ${min} caracteres.`;
  if (v.length > max) return `${label[0]?.toUpperCase()}${label.slice(1)} no puede superar ${max} caracteres.`;
  if (CONTROL.test(v)) return `${label[0]?.toUpperCase()}${label.slice(1)} tiene caracteres no válidos.`;
  return null;
}

/** Mirror of the API `addressSchema` (+ label ≤ 40) so the user sees the problem before the round trip. */
export function validateAddress(form: AddressForm): FieldErrors {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | null) => {
    if (message) errors[key] = message;
  };
  set("fullName", textError(form.fullName, 2, 120, "el nombre completo"));
  set("phone", phoneError(form.phone, true));
  if (!(DEPARTMENTS as readonly string[]).includes(form.department)) errors.department = "Elige un departamento de la lista.";
  set("city", textError(form.city, 2, 80, "la ciudad"));
  set("address1", textError(form.address1, 5, 200, "la dirección"));
  if (form.address2.trim()) set("address2", textError(form.address2, 0, 200, "el complemento"));
  if (form.postalCode.trim()) set("postalCode", textError(form.postalCode, 0, 12, "el código postal"));
  if (form.label.trim()) set("label", textError(form.label, 1, 40, "la etiqueta"));
  if (form.documentType && !["CC", "CE", "NIT", "PP"].includes(form.documentType)) errors.documentType = "Tipo de documento no válido.";
  if (form.documentNumber.trim()) {
    set("documentNumber", textError(form.documentNumber, 4, 20, "el número de documento"));
    if (!form.documentType && !errors.documentNumber) errors.documentType = "Elige el tipo de documento.";
  } else if (form.documentType) {
    errors.documentNumber = "Escribe el número de documento.";
  }
  return errors;
}

export function addressPayload(form: AddressForm): Record<string, unknown> {
  return {
    label: form.label.trim(),
    fullName: form.fullName.trim(),
    phone: normalizePhone(form.phone),
    department: form.department,
    city: form.city.trim(),
    address1: form.address1.trim(),
    address2: form.address2.trim(),
    postalCode: form.postalCode.trim(),
    documentType: form.documentType,
    documentNumber: form.documentNumber.trim(),
    isDefault: form.isDefault,
  };
}
