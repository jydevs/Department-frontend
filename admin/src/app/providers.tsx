"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { makeQueryClient } from "@/lib/query";
import { ConfirmProvider } from "@/components/ui/Overlay";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
