// Editable texts of the CMS sections rendered by client components. Kept out of the "use client" files so server code can use the defaults.

/** Editable texts of the `cart-drawer` CMS section (`template/cart`). */
export interface CartConfig {
  title: string;
  closeLabel: string;
  emptyTitle: string;
  emptyText: string;
  /** substring of emptyText drawn underlined; clicking it opens the account panel */
  emptyTextHighlight?: string;
  continueLabel: string;
  checkoutLabel: string;
  checkoutHref: string;
  subtotalLabel: string;
  sizeLabel: string;
  removeLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  unavailableMessage: string;
  discountLabel: string;
  shippingLabel: string;
  shippingText: string;
  taxLabel: string;
  totalLabel: string;
  taxIncludedNote: string;
  discountCodeLabel: string;
  discountApplyLabel: string;
  discountApplyingLabel: string;
  discountRemoveLabel: string;
  discountEmptyMessage: string;
}

export const DEFAULT_CART_CONFIG: CartConfig = {
  title: "Carrito",
  closeLabel: "Cerrar",
  emptyTitle: "Tu carrito está vacío",
  emptyText: "¿Tienes una cuenta? Inicia sesión para pagar más rápido.",
  emptyTextHighlight: "Inicia sesión",
  continueLabel: "Seguir comprando",
  checkoutLabel: "Finalizar compra",
  checkoutHref: "/checkout",
  subtotalLabel: "Subtotal",
  sizeLabel: "Talla",
  removeLabel: "Eliminar",
  decreaseLabel: "Quitar una unidad",
  increaseLabel: "Añadir una unidad",
  unavailableMessage: "Ya no está disponible. Elimínalo para continuar.",
  discountLabel: "Descuento",
  shippingLabel: "Envío",
  shippingText: "Se calcula al pagar",
  taxLabel: "IVA",
  totalLabel: "Total estimado",
  taxIncludedNote: "Precios con IVA incluido. El envío se suma al elegir tu dirección.",
  discountCodeLabel: "Código de descuento",
  discountApplyLabel: "Aplicar",
  discountApplyingLabel: "Aplicando…",
  discountRemoveLabel: "Quitar",
  discountEmptyMessage: "Escribe tu código de descuento.",
};


/** Editable texts of the `newsletter` CMS section. */
export interface NewsletterConfig {
  eyebrow?: string;
  heading: string;
  text?: string;
  placeholder: string;
  inputLabel: string;
  buttonLabel: string;
  loadingMessage: string;
  successMessage: string;
  errorMessage: string;
  backgroundColor?: string;
}

export const DEFAULT_NEWSLETTER: NewsletterConfig = {
  eyebrow: "Newsletter",
  heading: "Únete a Regular Members Only.",
  placeholder: "Dirección de correo electrónico",
  inputLabel: "Dirección de correo electrónico",
  buttonLabel: "Suscribirse",
  loadingMessage: "Enviando...",
  successMessage: "Gracias por suscribirte.",
  errorMessage: "Introduce un correo válido.",
};


/** Editable texts of the `contact-form` CMS section. */
export interface ContactFormConfig {
  heading: string;
  showPhone: boolean;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  subjectLabel: string;
  messageLabel: string;
  submitLabel: string;
  loadingLabel: string;
  successMessage: string;
  errorMessage: string;
}

export const DEFAULT_CONTACT_FORM: ContactFormConfig = {
  heading: 'Ponte en contacto',
  showPhone: true,
  nameLabel: 'Nombre',
  emailLabel: 'Email',
  phoneLabel: 'Teléfono',
  subjectLabel: 'Asunto',
  messageLabel: 'Mensaje',
  submitLabel: 'Enviar',
  loadingLabel: 'Enviando...',
  successMessage: '¡Mensaje enviado! Pronto nos pondremos en contacto.',
  errorMessage: 'Error al enviar. Intenta de nuevo.',
};

