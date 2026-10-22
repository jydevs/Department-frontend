import type { ReactNode } from "react";
import { AppShell } from "@/components/admin/shell/app-shell";
import { AuthGate } from "@/components/admin/shell/auth-gate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
