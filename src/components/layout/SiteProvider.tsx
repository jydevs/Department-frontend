"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteClientConfig } from "@/lib/cms/site";
import { bool, num, str, type Settings } from "@/lib/cms/types";

const EMPTY: SiteClientConfig = {
  brandName: "Daregular Dept.", tagline: "", header: {}, nav: [],
  announcement: { enabled: false, items: [], duration: 38 }, search: { settings: {}, suggestions: [] }, cart: {}, productCount: 0,
};

const Ctx = createContext<SiteClientConfig>(EMPTY);

/** Configuración editable (CMS) disponible para los componentes cliente de la tienda. */
export function SiteProvider({ value, children }: { value: SiteClientConfig; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useSite = (): SiteClientConfig => useContext(Ctx);

/** Lectores con valor por defecto: la tienda sigue funcionando si un ajuste no existe en el CMS. */
export const cfg = (s: Settings) => ({
  str: (k: string, d: string) => str(s, k, d),
  bool: (k: string, d: boolean) => bool(s, k, d),
  num: (k: string, d: number) => num(s, k, d),
});
