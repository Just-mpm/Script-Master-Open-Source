/**
 * Logo centralizado do Script Master.
 *
 * Basta incrementar LOGO_VERSION para invalidar cache em todas as referências.
 * Cada variante é acessada via `logos.mark.transparent`, `logos.full.round`, etc.
 */
const LOGO_VERSION = 'v01';

const v = LOGO_VERSION;

const logos = {
  mark: {
    /** Ícone apenas, fundo transparente — uso inline ao lado do nome */
    transparent: `/logo-sem-titulo-transparente.webp?${v}`,
    /** Ícone apenas, fundo redondo — uso standalone (auth, empty states) */
    round: `/logo-sem-titulo-redondo.webp?${v}`,
    /** Ícone apenas, quadrado */
    square: `/logo-sem-titulo-quadrado.webp?${v}`,
  },
  full: {
    /** Logo completa com texto, fundo transparente — SEO, OG, 404 */
    transparent: `/logo-transparente.webp?${v}`,
    /** Logo completa com texto, fundo redondo */
    round: `/logo-redondo.webp?${v}`,
    /** Logo completa com texto, quadrado */
    square: `/logo-quadrado.webp?${v}`,
    /** Logo completa com texto, quadrado arredondado */
    roundedSquare: `/logo-quadrado-arredondado.webp?${v}`,
  },
  favicon: `/favicon-32.webp?${v}`,
  faviconIco: `/favicon.ico?${v}`,
  appleTouchIcon: `/apple-touch-icon.png?${v}`,
  ogImage: `/og-image.webp?${v}`,
} as const;

export default logos;
