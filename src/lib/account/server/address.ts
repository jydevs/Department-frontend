import "server-only";

export const ADDRESS_FIELDS = [
  "label",
  "isDefault",
  "fullName",
  "phone",
  "department",
  "city",
  "address1",
  "address2",
  "postalCode",
  "documentType",
  "documentNumber",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_RE.test(value);

/**
 * Empty optional values are left out on create. On update, `label`, `documentType` and `documentNumber` are sent as
 * null to clear them (the 4-character minimum of the number only applies when there is a value) and `address2` /
 * `postalCode` as "" (their rule allows 0 characters).
 */
export function cleanAddressPayload(
  input: Record<string, string | number | boolean | null>,
  mode: "create" | "update",
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        if (key === "label") out[key] = null;
        else if ((key === "documentType" || key === "documentNumber") && mode === "update") out[key] = null;
        else if ((key === "address2" || key === "postalCode") && mode === "update") out[key] = "";
        else if (key === "address2" || key === "postalCode" || key === "documentType" || key === "documentNumber") continue;
        else out[key] = trimmed;
      } else out[key] = trimmed;
    } else out[key] = value;
  }
  return out;
}
