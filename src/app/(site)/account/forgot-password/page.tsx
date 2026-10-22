import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = { title: "¿Olvidaste tu contraseña?" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
