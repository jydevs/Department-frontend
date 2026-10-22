"use client";

import { useId, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";
import { DEFAULT_CART_CONFIG, type CartConfig } from "@/components/layout/config";

type DiscountLabels = Pick<CartConfig, "discountCodeLabel" | "discountApplyLabel" | "discountApplyingLabel" | "discountRemoveLabel" | "discountEmptyMessage">;

/**
 * Discount code field of the cart drawer and of the checkout summary: applies / removes the code on the server cart.
 * Texts come from the `cart-drawer` CMS section (template/cart); the checkout uses the defaults.
 */
export function DiscountBox({
  discountCode,
  discountAmount,
  labels = DEFAULT_CART_CONFIG,
}: {
  discountCode: string | null;
  discountAmount: number;
  labels?: DiscountLabels;
}) {
  const { applyDiscount, removeDiscount } = useCart();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const inputId = useId();
  const msgId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) {
      setMessage(labels.discountEmptyMessage);
      return;
    }
    setWorking(true);
    setMessage(null);
    const issue = await applyDiscount(value);
    setWorking(false);
    if (issue) setMessage(issue.fields?.code ?? issue.message);
    else setCode("");
  };

  const remove = async () => {
    setWorking(true);
    const issue = await removeDiscount();
    setWorking(false);
    setMessage(issue ? issue.message : null);
  };

  if (discountCode) {
    return (
      <div data-testid="discount-applied" className="flex items-center justify-between gap-3 border border-white/15 px-3 py-2.5">
        <p className="font-condensed text-xs tracking-[0.12em]">
          <span className="sr-only">{labels.discountCodeLabel}: </span>
          <span className="text-dept-white">{discountCode}</span>
          {discountAmount > 0 && <span className="text-dept-gray-300"> · −{formatCOP(discountAmount)}</span>}
        </p>
        <button
          type="button"
          data-testid="discount-remove"
          onClick={remove}
          disabled={working}
          className="link-underline font-condensed text-[11px] tracking-[0.2em] text-dept-gray-300 hover:text-dept-white disabled:opacity-40"
        >
          {labels.discountRemoveLabel}
        </button>
        <p role="status" aria-live="polite" className="sr-only">
          {message}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="font-condensed block text-[11px] tracking-[0.2em] text-dept-gray-300">
        {labels.discountCodeLabel}
      </label>
      <div className="mt-2 flex">
        <input
          id={inputId}
          data-testid="discount-input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (message) setMessage(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={message ? true : undefined}
          aria-describedby={msgId}
          className="font-condensed h-11 min-w-0 flex-1 border border-white/20 bg-transparent px-3 text-sm uppercase tracking-[0.1em] text-dept-white outline-none focus:border-dept-white"
        />
        <button
          type="submit"
          data-testid="discount-apply"
          disabled={working}
          className="font-condensed h-11 border border-l-0 border-white/20 px-4 text-xs tracking-[0.16em] transition-colors hover:bg-dept-white hover:text-dept-black disabled:opacity-40"
        >
          {working ? labels.discountApplyingLabel : labels.discountApplyLabel}
        </button>
      </div>
      <p id={msgId} role="alert" data-testid="discount-error" className="font-condensed mt-2 min-h-4 text-xs tracking-[0.06em] text-dept-red-light">
        {message}
      </p>
    </form>
  );
}
