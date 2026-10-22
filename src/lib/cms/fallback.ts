import type { MenuData, SectionEnvelope, TemplateData } from "@/lib/api/types";

/**
 * Chrome (menus, newsletter and footer) of the original site, used ONLY when the CMS cannot provide it: the API is
 * unreachable or the document is missing. It mirrors the content the backend seeds (`src/cms/seed/default-content.ts`
 * in the API repository), so the storefront looks the same whether the CMS answers or not.
 *
 * Everything an admin can edit still wins: these values apply to a document that does not exist, never to one that
 * exists with other content.
 */

const TAGLINE = "Uniforms for the unnoticed.";
const LEDE =
  "Este proyecto es el primer lanzamiento oficial de Disruptive Dept, una marca que no diseña ropa, sino mensajes.";

export const FALLBACK_MENUS: Record<string, MenuData> = {
  main: {
    items: [
      { id: "nav-home", label: "Home", link: { type: "url", url: "/" } },
      {
        id: "nav-clothes",
        label: "Clothes",
        link: { type: "collection", handle: "all" },
        children: [
          { id: "nav-men", label: "Men", link: { type: "collection", handle: "men" } },
          { id: "nav-women", label: "Women", link: { type: "collection", handle: "women" } },
        ],
      },
      { id: "nav-community", label: "Community", link: { type: "page", handle: "community" } },
    ],
  },
  footer: {
    items: [
      { id: "foot-home", label: "Home", link: { type: "url", url: "/" } },
      { id: "foot-clothes", label: "Clothes", link: { type: "collection", handle: "all" } },
      { id: "foot-men", label: "Men", link: { type: "collection", handle: "men" } },
      { id: "foot-women", label: "Women", link: { type: "collection", handle: "women" } },
    ],
  },
};

/** Sections of `template/layout` (header, newsletter, footer) as the original site had them. */
export function fallbackLayoutTemplate(brandName: string): TemplateData {
  const sections: SectionEnvelope[] = [
    {
      id: "site-header",
      type: "site-header",
      enabled: true,
      settings: {
        menuKey: "main",
        logoVariant: "red",
        showAnnouncement: true,
        showSearch: true,
        showAccount: true,
        showCart: true,
        showProductCount: true,
        transparentOnHero: true,
        homeAriaLabel: `${brandName} — inicio`,
        searchLabel: "Buscar",
        accountLabel: "Cuenta",
        cartLabel: "Carrito",
        menuOpenLabel: "Abrir menú",
        menuCloseLabel: "Cerrar menú",
        navLabel: "Principal",
        mobileMenuLabel: "Menú",
        mobileMenuTagline: TAGLINE,
        skipLinkLabel: "Saltar al contenido",
      },
    },
    {
      id: "newsletter",
      type: "newsletter",
      enabled: true,
      settings: {
        eyebrow: "Newsletter",
        heading: "Únete a Regular Members Only.",
        placeholder: "Dirección de correo electrónico",
        inputLabel: "Dirección de correo electrónico",
        buttonLabel: "Suscribirse",
        loadingMessage: "Enviando...",
        successMessage: "Gracias por suscribirte.",
        errorMessage: "Introduce un correo válido.",
      },
    },
    {
      id: "site-footer",
      type: "footer",
      enabled: true,
      settings: {
        showNewsletter: false,
        showSocial: true,
        brandTitle: TAGLINE,
        brandText: LEDE,
        wordmark: brandName,
        showWordmark: true,
        copyright: `© ${new Date().getFullYear()} ${brandName}`,
        bottomText: "Colombia · COP",
        backToTopLabel: "Volver arriba",
      },
      blocks: [
        { id: "col-shop", type: "column", settings: { title: "Tienda", links: [], menuKey: "footer" } },
        {
          id: "col-community",
          type: "column",
          settings: { title: "Comunidad", links: [{ label: "Community", url: "/pages/community" }] },
        },
        {
          id: "col-account",
          type: "account-links",
          settings: { title: "Cuenta", accountLabel: "Mi cuenta", cartLabel: "Carrito" },
        },
      ],
    },
  ];
  return { sections };
}
