"use client";

/**
 * SCAFFOLD STUB — flesh out in `feature/cart-drawer`.
 *
 * Right-side cart drawer. Empty state only (no cart logic). API: controlled via
 * `open` / `onClose`. Global wiring to the header cart icon happens in
 * `feature/overlay-state` (Tanda 4).
 */
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Carrito">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col items-center justify-center gap-4 bg-dept-white p-8 text-center text-dept-black">
        <h2 className="font-display text-2xl">Tu carrito está vacío</h2>
        <p className="font-body text-sm text-dept-gray-500">
          ¿Tienes una cuenta?{" "}
          <button className="underline">Inicia sesión</button> para pagar más rápido.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 bg-dept-red px-6 py-3 font-condensed text-sm text-dept-white"
        >
          Seguir comprando
        </button>
      </aside>
    </div>
  );
}
