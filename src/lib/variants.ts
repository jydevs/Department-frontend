import type { Product, ProductVariant } from "@/data/types";

/** Selección de opciones: un valor (o `null` si aún no se eligió) por cada opción de `Product.options`. */
export type Selection = (string | null)[];

const SIZE_OPTION = /^(talla|size)$/i;
export const isSizeOption = (name: string): boolean => SIZE_OPTION.test(name.trim());

/** Una opción con un único valor ("Default Title", una sola talla…) no necesita elegirse. */
export const needsChoice = (p: Product, optionIndex: number): boolean => (p.options[optionIndex]?.values.length ?? 0) > 1;

/** Selección inicial: las opciones con un único valor ya vienen elegidas. */
export const initialSelection = (p: Product): Selection => p.options.map((o) => (o.values.length === 1 ? o.values[0] : null));

/** La variante coincide con lo elegido en las opciones anteriores a `before` (las posteriores no la limitan). */
const matches = (v: ProductVariant, sel: Selection, before = sel.length): boolean => sel.every((s, i) => i >= before || s === null || v.values[i] === s);

/** Variante que corresponde a una selección COMPLETA (`undefined` si falta elegir algo o la combinación no existe). */
export function selectedVariant(p: Product, sel: Selection): ProductVariant | undefined {
  if (sel.some((s) => s === null)) return undefined;
  return p.variants.find((v) => matches(v, sel));
}

/** Variante comprable cuando solo hay una (producto sin opciones reales). */
export const onlyVariant = (p: Product): ProductVariant | undefined => (p.variants.length === 1 ? p.variants[0] : undefined);

/**
 * ¿Existe alguna variante DISPONIBLE con `value` en la opción `optionIndex` y compatible con lo elegido en las opciones
 * ANTERIORES? (agotado por combinación: elegido "Rojo", la talla "S" se deshabilita si Rojo/S está agotada). La primera
 * opción siempre puede cambiarse libremente; al hacerlo se descartan las elecciones posteriores que dejen de ser posibles.
 */
export function valueAvailable(p: Product, sel: Selection, optionIndex: number, value: string): boolean {
  return p.variants.some((v) => v.available && v.values[optionIndex] === value && matches(v, sel, optionIndex));
}

/** Al elegir `value`, conserva las demás elecciones que sigan siendo posibles y descarta las que dejarían una combinación inexistente o agotada. */
export function selectValue(p: Product, sel: Selection, optionIndex: number, value: string): Selection {
  const next = sel.map((s, i) => (i === optionIndex ? value : s));
  return next.map((s, i) => {
    if (i <= optionIndex || s === null || !needsChoice(p, i)) return s;
    return valueAvailable(p, next, i, s) ? s : null;
  });
}

/** Nombres (en minúsculas) de las opciones que aún faltan por elegir. */
export const missingOptions = (p: Product, sel: Selection): string[] =>
  p.options.flatMap((o, i) => (needsChoice(p, i) && sel[i] === null ? [o.name] : []));

/** Etiqueta corta de una variante para botones de la tarjeta: los valores de sus opciones ("Negro / M"). */
export const variantLabel = (v: ProductVariant): string => v.values.filter(Boolean).join(" / ") || v.title;
