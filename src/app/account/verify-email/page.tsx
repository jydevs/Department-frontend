import { Button } from "@/components/ui/Button";

export default function VerifyEmailPage() {
  return (
    <div
      data-testid="verify-email-page"
      className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16"
    >
      <div className="mx-auto w-full max-w-md border border-white/15 bg-dept-black p-8 text-center sm:p-10">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
          Verificación
        </p>
        <h1 className="font-display text-display-md text-dept-white mb-4">Verifica tu correo</h1>
        <p className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300 mb-8">
          Hemos enviado un enlace de confirmación a tu dirección de correo electrónico. Haz clic en el enlace para activar tu cuenta.
        </p>
        <Button href="/account/login" variant="solid" size="lg" className="w-full">
          Ir a iniciar sesión
        </Button>
      </div>
    </div>
  );
}
