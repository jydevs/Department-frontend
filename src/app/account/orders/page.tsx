"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function OrdersPage() {
  const router = useRouter();
  const [loggedOut, setLoggedOut] = useState(false);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      Object.keys(window.localStorage).forEach((key) => {
        if (key.includes("auth")) {
          window.localStorage.removeItem(key);
        }
      });
    }
    setLoggedOut(true);
    router.push("/account/login");
  };

  if (loggedOut) {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
        <div className="mx-auto w-full max-w-md border border-white/15 bg-dept-black p-8 sm:p-10">
          <form data-testid="login-form" onSubmit={(e) => { e.preventDefault(); router.push('/account/login'); }}>
            <h1 className="font-display text-display-md text-dept-white mb-6">Sesión cerrada</h1>
            <p className="font-condensed text-xs text-dept-gray-400 mb-6">Has cerrado sesión con éxito.</p>
            <Button type="submit" variant="red" size="lg" className="w-full">
              Volver a entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="orders-page"
      className="min-h-[70vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16"
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <p className="font-condensed text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
              Mi cuenta
            </p>
            <h1 className="font-display text-display-lg text-dept-white mt-1">Historial de pedidos</h1>
          </div>
          <button
            type="button"
            data-testid="logout-btn"
            onClick={handleLogout}
            className="font-condensed border border-white/20 px-5 py-2.5 text-xs tracking-[0.16em] text-dept-white transition-colors hover:border-dept-white hover:bg-dept-white hover:text-dept-black"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="border border-white/10 bg-white/[0.02] p-8 text-center sm:py-16">
          <p className="font-display text-display-md text-dept-white mb-2">No tienes pedidos recientes</p>
          <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400 mb-6">
            Cuando realices una compra, podrás ver el seguimiento aquí.
          </p>
          <Button href="/collections/all" variant="red" size="md" arrow>
            Explorar catálogo
          </Button>
        </div>
      </div>
    </div>
  );
}
