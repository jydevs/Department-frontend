import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return <LoginForm />;
}
