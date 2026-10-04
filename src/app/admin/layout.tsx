import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { absolute: "Panel · Daregular Dept." },
  robots: { index: false, follow: false },
};

const THEME_SCRIPT = `try{if(localStorage.getItem("dept-admin-theme")==="light"){document.currentScript.parentElement.setAttribute("data-theme","light")}}catch(e){}`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root min-h-screen bg-bg text-fg" data-theme="dark">
      {/* Script estático (nada viene de la API): aplica el tema guardado antes del primer pintado. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <Providers>{children}</Providers>
    </div>
  );
}
