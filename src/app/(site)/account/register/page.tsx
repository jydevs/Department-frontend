import type { Metadata } from "next";
import { RegisterForm } from "@/components/account/RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return <RegisterForm />;
}
