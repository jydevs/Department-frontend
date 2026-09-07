"use client";

/**
 * SCAFFOLD STUB — flesh out in `feature/account-modal`.
 *
 * Account panel shown from the header account icon. Small dropdown-style panel
 * anchored top-right (see reference). API: controlled via `open` / `onClose`.
 * Global wiring to the header happens in `feature/overlay-state` (Tanda 4).
 */
interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Cuenta">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/20"
      />
      <div className="absolute right-4 top-20 w-72 bg-dept-white p-4 text-dept-black shadow-lg">
        <p className="font-condensed text-xs text-dept-gray-500">Cuenta</p>
        <button className="mt-3 w-full bg-dept-blue py-2 font-condensed text-sm text-dept-white">
          Iniciar sesión con shop
        </button>
        <button className="mt-2 w-full bg-dept-red-dark py-2 font-condensed text-xs text-dept-white">
          Otras opciones de inicio de sesión
        </button>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 border border-dept-gray-300 py-2 font-condensed text-xs">
            Pedidos
          </button>
          <button className="flex-1 border border-dept-gray-300 py-2 font-condensed text-xs">
            Perfil
          </button>
        </div>
      </div>
    </div>
  );
}
