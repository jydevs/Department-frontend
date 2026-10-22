import { notFound } from "next/navigation";

/** Cualquier ruta desconocida bajo /admin cae en el not-found propio del panel (sin cabecera ni pie de la tienda). */
export default function AdminCatchAll(): never {
  notFound();
}
