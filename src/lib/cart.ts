"use client";

/**
 * Public API of the cart (kept stable for the components): the cart now lives on the server and the real logic is in
 * `lib/cart/store.ts` (see there). `addToCart`, `setLineQty`, `removeFromCart`, `clearCart` and `useCart` keep their
 * names and arguments.
 */
export {
  addToCart,
  applyDiscount,
  clearCart,
  dismissCartMessage,
  refreshCart,
  removeDiscount,
  removeFromCart,
  removeVariant,
  setLineQty,
  setShippingQuote,
  setVariantQty,
  useCart,
  MAX_LINE_QUANTITY,
  type AddToCartInput,
  type CartItem,
  type ShippingQuoteParams,
} from "./cart/store";
