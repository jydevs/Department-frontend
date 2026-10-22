import { DEPARTMENTS } from "./departments";

/** Client-side mirror of the API's checkout rules (the server stays the authority and its errors are mapped back). */

export interface AddressForm {
  fullName: string;
  phone: string;
  department: string;
  city: string;
  address1: string;
  address2: string;
  postalCode: string;
  documentType: string;
  documentNumber: string;
}

export interface CheckoutForm {
  email: string;
  phone: string;
  shipping: AddressForm;
  billingSame: boolean;
  billing: AddressForm;
  customerNote: string;
  shippingRateId: string;
  acceptTerms: boolean;
}

export const EMPTY_ADDRESS: AddressForm = {
  fullName: "",
  phone: "",
  department: "",
  city: "",
  address1: "",
  address2: "",
  postalCode: "",
  documentType: "",
  documentNumber: "",
};

export const EMPTY_FORM: CheckoutForm = {
  email: "",
  phone: "",
  shipping: EMPTY_ADDRESS,
  billingSame: true,
  billing: EMPTY_ADDRESS,
  customerNote: "",
  shippingRateId: "",
  acceptTerms: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9]{7,20}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

/** "300 123-4567" → "3001234567" (the API only takes digits and an optional leading +). */
export function normalizePhone(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

export type FormErrors = Record<string, string>;

/** Field ids: `email`, `phone`, `s_<field>`, `b_<field>`, `customerNote`, `shippingRateId`, `acceptTerms`. */
function validateAddress(a: AddressForm, p: "s_" | "b_", errors: FormErrors) {
  const text = (key: keyof AddressForm, label: string, min: number, max: number) => {
    const v = a[key].trim();
    if (v.length < min) errors[p + key] = v.length === 0 ? `${label} es obligatorio.` : `${label} es demasiado corto (mínimo ${min} caracteres).`;
    else if (v.length > max) errors[p + key] = `${label} es demasiado largo (máximo ${max} caracteres).`;
    else if (CONTROL_RE.test(v)) errors[p + key] = `${label} contiene caracteres no permitidos.`;
  };
  text("fullName", "El nombre completo", 2, 120);
  if (!PHONE_RE.test(normalizePhone(a.phone))) errors[`${p}phone`] = "Introduce un teléfono válido (7 a 20 dígitos, puede empezar por +).";
  if (!a.department) errors[`${p}department`] = "Elige un departamento.";
  else if (!(DEPARTMENTS as readonly string[]).includes(a.department)) errors[`${p}department`] = "Elige un departamento de la lista.";
  text("city", "La ciudad", 2, 80);
  text("address1", "La dirección", 5, 200);
  if (a.address2.trim().length > 200) errors[`${p}address2`] = "El complemento es demasiado largo.";
  if (a.postalCode.trim().length > 12) errors[`${p}postalCode`] = "El código postal es demasiado largo.";
  const hasType = a.documentType !== "";
  const hasNumber = a.documentNumber.trim() !== "";
  if (hasType !== hasNumber) {
    if (!hasType) errors[`${p}documentType`] = "Elige el tipo de documento.";
    else errors[`${p}documentNumber`] = "Escribe el número de documento.";
  } else if (hasNumber) {
    const n = a.documentNumber.trim();
    if (n.length < 4 || n.length > 20) errors[`${p}documentNumber`] = "El número de documento debe tener entre 4 y 20 caracteres.";
  }
}

export function validateCheckout(form: CheckoutForm): FormErrors {
  const errors: FormErrors = {};
  const email = form.email.trim();
  if (!email) errors.email = "El correo electrónico es obligatorio.";
  else if (!EMAIL_RE.test(email) || email.length > 255) errors.email = "Introduce un correo electrónico válido.";
  if (form.phone.trim() && !PHONE_RE.test(normalizePhone(form.phone))) errors.phone = "Introduce un teléfono válido (7 a 20 dígitos, puede empezar por +).";
  else if (!form.phone.trim()) errors.phone = "El teléfono de contacto es obligatorio.";
  validateAddress(form.shipping, "s_", errors);
  if (!form.billingSame) validateAddress(form.billing, "b_", errors);
  if (form.customerNote.length > 500) errors.customerNote = "La nota es demasiado larga (máximo 500 caracteres).";
  if (!form.shippingRateId) errors.shippingRateId = form.shipping.department ? "Elige un método de envío." : "Elige primero el departamento de entrega.";
  if (!form.acceptTerms) errors.acceptTerms = "Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.";
  return errors;
}

function addressPayload(a: AddressForm) {
  return {
    fullName: a.fullName.trim(),
    phone: normalizePhone(a.phone),
    department: a.department,
    city: a.city.trim(),
    address1: a.address1.trim(),
    address2: a.address2.trim(),
    postalCode: a.postalCode.trim(),
    documentType: a.documentType,
    documentNumber: a.documentNumber.trim(),
  };
}

/** Body sent to `/api/checkout` (without the idempotency key). Stable key order: it is also used to detect changes. */
export function checkoutPayload(form: CheckoutForm) {
  return {
    email: form.email.trim().toLowerCase(),
    phone: normalizePhone(form.phone),
    shippingAddress: addressPayload(form.shipping),
    ...(form.billingSame ? null : { billingAddress: addressPayload(form.billing) }),
    shippingRateId: form.shippingRateId,
    customerNote: form.customerNote.trim(),
  };
}

/** Maps an API error path (`shippingAddress.fullName`) to a field id (`s_fullName`). */
export function fieldIdForPath(path: string): string {
  if (path.startsWith("shippingAddress.")) return `s_${path.slice("shippingAddress.".length)}`;
  if (path.startsWith("billingAddress.")) return `b_${path.slice("billingAddress.".length)}`;
  if (path === "customerNote" || path === "email" || path === "phone" || path === "shippingRateId") return path;
  return "";
}

/** Order the fields appear on the page: the first error in this order gets the focus. */
export const FIELD_ORDER = [
  "email", "phone",
  "s_fullName", "s_phone", "s_department", "s_city", "s_address1", "s_address2", "s_postalCode", "s_documentType", "s_documentNumber",
  "shippingRateId",
  "b_fullName", "b_phone", "b_department", "b_city", "b_address1", "b_address2", "b_postalCode", "b_documentType", "b_documentNumber",
  "customerNote", "acceptTerms",
];
