"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { AuthProvider } from "@/lib/admin/auth";
import { makeQueryClient } from "@/lib/admin/query";
import { ConfirmProvider } from "@/components/admin/ui/Overlay";
import { ToastProvider } from "@/components/admin/ui/Toast";

function ThemeInit() {
  useEffect(() => {
    try { if (localStorage.getItem("dept-admin-theme") === "light") document.querySelector<HTMLElement>(".admin-root")?.setAttribute("data-theme", "light"); } catch { /* sin almacenamiento */ }
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider><ThemeInit />{children}</AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
