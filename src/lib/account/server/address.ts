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
 * The API's address schema does not accept null for `address2`, `postalCode`, `documentType` or `documentNumber`
 * (only `label` is nullable). On create, empty optional values are simply left out; on update, `address2` and
 * `postalCode` are sent as "" to clear them (their rule allows 0 characters).
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
        else if ((key === "address2" || key === "postalCode") && mode === "update") out[key] = "";
        else if (key === "address2" || key === "postalCode" || key === "documentType" || key === "documentNumber") continue;
        else out[key] = trimmed;
      } else out[key] = trimmed;
    } else out[key] = value;
  }
  return out;
}
