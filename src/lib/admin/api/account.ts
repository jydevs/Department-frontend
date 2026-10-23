"use client";

import { useMutation } from "@tanstack/react-query";
import { api, setAccessToken } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";

export interface ChangePasswordResponse {
  accessToken: string;
  expiresIn: number;
  mustChangePassword: false;
  twoFactorSetupRequired: boolean;
}

/** El backend revoca las sesiones y devuelve una nueva: se guarda el token y el panel sigue conectado. */
export function useChangePassword() {
  return useMutation<ChangePasswordResponse, ApiError, { current: string; new: string }>({
    mutationFn: async (body) => {
      const res = await api.post<ChangePasswordResponse>("/auth/change-password", body);
      setAccessToken(res.accessToken, res.expiresIn);
      return res;
    },
  });
}

/** `code`: TOTP de 6 dígitos o código de recuperación de 8 caracteres. */
export function useRegenerateRecoveryCodes() {
  return useMutation<{ recoveryCodes: string[]; message: string }, ApiError, { password: string; code: string }>({
    mutationFn: (body) => api.post<{ recoveryCodes: string[]; message: string }>("/auth/2fa/recovery-codes", body),
  });
}

export function useSetup2fa() {
  return useMutation<{ otpauthUrl: string }, ApiError, void>({
    mutationFn: () => api.post<{ otpauthUrl: string }>("/auth/2fa/setup"),
  });
}

export function useEnable2fa() {
  return useMutation<{ recoveryCodes: string[]; message: string }, ApiError, { password: string; code: string }>({
    mutationFn: (body) => api.post<{ recoveryCodes: string[]; message: string }>("/auth/2fa/enable", body),
  });
}

export function useDisable2fa() {
  return useMutation<{ message: string }, ApiError, { password: string; code: string }>({
    mutationFn: (body) => api.post<{ message: string }>("/auth/2fa/disable", body),
  });
}

/** Extrae el secreto en base32 del URI otpauth:// (parámetro `secret`). */
export function secretFromOtpauth(uri: string): string | null {
  const q = uri.split("?")[1];
  if (!q) return null;
  for (const part of q.split("&")) {
    const [k, v] = part.split("=");
    if (k === "secret" && v) return decodeURIComponent(v);
  }
  return null;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** Requisitos que cumple / no cumple. */
  checks: { label: string; ok: boolean }[];
}

/** Medidor simple de fortaleza (longitud y variedad de caracteres). */
export function passwordStrength(pw: string): PasswordStrength {
  const checks = [
    { label: "Al menos 12 caracteres", ok: pw.length >= 12 },
    { label: "Mayúsculas y minúsculas", ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: "Al menos un número", ok: /\d/.test(pw) },
    { label: "Al menos un símbolo", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  let score = checks.filter((c) => c.ok).length;
  if (pw.length >= 16 && score >= 3) score = 4;
  if (pw.length < 12) score = Math.min(score, 1);
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Muy fuerte"];
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  return { score: pw.length === 0 ? 0 : s, label: pw.length === 0 ? "" : labels[s], checks };
}
