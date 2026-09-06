/**
 * Formats a peso amount the way the Daregular Dept. storefront does:
 * "$99.000,00 COP" (Colombian grouping, two decimals, trailing "COP").
 */
export function formatCOP(amount: number): string {
  const formatted = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted} COP`;
}
