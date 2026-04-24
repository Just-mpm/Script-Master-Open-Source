import { describe, it, expect } from 'vitest';
import {
  APP_MAX_WIDTH,
  APP_HEADER_HEIGHT,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  WHITE,
  BLACK,
  SUCCESS_MAIN,
  ERROR_MAIN,
  WARNING_MAIN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DISABLED,
  APP_BACKGROUND,
  APP_SURFACE,
  APP_BORDER,
  TRANSPARENT,
  GLASS_BG,
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_GLOW,
  APP_BACKGROUND_GLOW,
  RADIUS_SM,
  RADIUS_XS,
  GAP_DEFAULT,
  ICON_SIZE_SM,
  ICON_SIZE_MD,
  ICON_SIZE_LG,
  WHITE_50,
  BLACK_50,
  ERROR_BG_SUBTLE,
  ERROR_BG_MEDIUM,
  WARNING_BG_SUBTLE,
  WHITE_01,
  CYAN_GLOW,
  PURPLE_GLOW_SOFT,
  SHADOW_DEEP,
  SHADOW_IMAGE,
  EMPTY_ICON_SIZE,
  EMPTY_WRAPPER_MAX_WIDTH,
  EMPTY_WRAPPER_PADDING_XS,
  EMPTY_WRAPPER_PADDING_MD,
} from '../../src/theme/tokens';

describe('Design Tokens', () => {
  describe('Dimensões e layout', () => {
    it('APP_MAX_WIDTH deve ser 1600', () => {
      expect(APP_MAX_WIDTH).toBe(1600);
    });

    it('APP_HEADER_HEIGHT deve ser 60', () => {
      expect(APP_HEADER_HEIGHT).toBe(60);
    });

    it('EMPTY_ICON_SIZE deve ser número positivo', () => {
      expect(EMPTY_ICON_SIZE).toBeGreaterThan(0);
    });

    it('EMPTY_WRAPPER_MAX_WIDTH deve ser número positivo', () => {
      expect(EMPTY_WRAPPER_MAX_WIDTH).toBeGreaterThan(0);
    });

    it('EMPTY_WRAPPER_PADDING_XS deve ser número positivo', () => {
      expect(EMPTY_WRAPPER_PADDING_XS).toBeGreaterThan(0);
    });

    it('EMPTY_WRAPPER_PADDING_MD deve ser número positivo', () => {
      expect(EMPTY_WRAPPER_PADDING_MD).toBeGreaterThan(0);
    });

    it('icon sizes devem ser crescentes', () => {
      expect(ICON_SIZE_SM).toBeLessThan(ICON_SIZE_MD);
      expect(ICON_SIZE_MD).toBeLessThan(ICON_SIZE_LG);
    });

    it('radii devem ser crescentes', () => {
      expect(RADIUS_XS).toBeLessThanOrEqual(RADIUS_SM);
    });

    it('GAP_DEFAULT deve ser 1', () => {
      expect(GAP_DEFAULT).toBe(1);
    });
  });

  describe('Cores da marca', () => {
    it('BRAND_PRIMARY deve ser hex válido (cyan)', () => {
      expect(BRAND_PRIMARY).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('BRAND_SECONDARY deve ser hex válido (purple)', () => {
      expect(BRAND_SECONDARY).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('BRAND_PRIMARY e BRAND_SECONDARY devem ser diferentes', () => {
      expect(BRAND_PRIMARY).not.toBe(BRAND_SECONDARY);
    });
  });

  describe('Cores semânticas', () => {
    it('SUCCESS_MAIN deve ser hex verde', () => {
      expect(SUCCESS_MAIN).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('ERROR_MAIN deve ser hex vermelho', () => {
      expect(ERROR_MAIN).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('WARNING_MAIN deve ser hex âmbar', () => {
      expect(WARNING_MAIN).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('cores semânticas devem ser diferentes entre si', () => {
      const semanticColors = [SUCCESS_MAIN, ERROR_MAIN, WARNING_MAIN];
      const unique = new Set(semanticColors);
      expect(unique.size).toBe(semanticColors.length);
    });
  });

  describe('Cores de erro/warning sutil', () => {
    it('ERROR_BG_SUBTLE deve ser rgba com opacidade baixa', () => {
      expect(ERROR_BG_SUBTLE).toMatch(/^rgba\(/);
      expect(ERROR_BG_SUBTLE).toContain('0.08');
    });

    it('ERROR_BG_MEDIUM deve ser rgba com opacidade média', () => {
      expect(ERROR_BG_MEDIUM).toMatch(/^rgba\(/);
      expect(ERROR_BG_MEDIUM).toContain('0.12');
    });

    it('WARNING_BG_SUBTLE deve ser rgba com opacidade baixa', () => {
      expect(WARNING_BG_SUBTLE).toMatch(/^rgba\(/);
      expect(WARNING_BG_SUBTLE).toContain('0.08');
    });
  });

  describe('Cores de texto', () => {
    it('TEXT_PRIMARY deve ser hex claro', () => {
      expect(TEXT_PRIMARY).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('TEXT_SECONDARY deve ser rgba com opacidade', () => {
      expect(TEXT_SECONDARY).toMatch(/^rgba\(/);
    });

    it('TEXT_DISABLED deve ser rgba com menor opacidade que secondary', () => {
      expect(TEXT_DISABLED).toMatch(/^rgba\(/);
      const secOpacity = parseFloat(TEXT_SECONDARY.match(/[\d.]+(?=\))/)?.[0] ?? '1');
      const disOpacity = parseFloat(TEXT_DISABLED.match(/[\d.]+(?=\))/)?.[0] ?? '1');
      expect(disOpacity).toBeLessThan(secOpacity);
    });
  });

  describe('Superfícies', () => {
    it('WHITE e BLACK devem ser hex válidos', () => {
      expect(WHITE).toBe('#ffffff');
      expect(BLACK).toBe('#000000');
    });

    it('APP_BACKGROUND deve ser hex', () => {
      expect(APP_BACKGROUND).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('APP_SURFACE deve ser hex', () => {
      expect(APP_SURFACE).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('APP_BORDER deve ser rgba com opacidade', () => {
      expect(APP_BORDER).toMatch(/^rgba\(/);
    });

    it('TRANSPARENT deve ser "transparent"', () => {
      expect(TRANSPARENT).toBe('transparent');
    });

    it('GLASS_BG deve ser rgba', () => {
      expect(GLASS_BG).toMatch(/^rgba\(/);
    });

    it('SHADOW_DEEP deve ser hex', () => {
      expect(SHADOW_DEEP).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('SHADOW_IMAGE deve ser rgba', () => {
      expect(SHADOW_IMAGE).toMatch(/^rgba\(/);
    });
  });

  describe('Opacidades branco/preto', () => {
    it('WHITE_50 deve ter exatamente 50% opacidade', () => {
      expect(WHITE_50).toContain('0.5');
    });

    it('BLACK_50 deve ter exatamente 50% opacidade', () => {
      expect(BLACK_50).toContain('0.5');
    });

    it('WHITE_01 deve ser muito transparente', () => {
      expect(WHITE_01).toContain('0.01');
    });
  });

  describe('Glows', () => {
    it('CYAN_GLOW deve ser rgba', () => {
      expect(CYAN_GLOW).toMatch(/^rgba\(/);
    });

    it('PURPLE_GLOW_SOFT deve ser rgba', () => {
      expect(PURPLE_GLOW_SOFT).toMatch(/^rgba\(/);
    });
  });

  describe('Gradients', () => {
    it('BRAND_GRADIENT deve conter linear-gradient', () => {
      expect(BRAND_GRADIENT).toContain('linear-gradient');
      expect(BRAND_GRADIENT).toContain(BRAND_PRIMARY);
      expect(BRAND_GRADIENT).toContain(BRAND_SECONDARY);
    });

    it('BRAND_GRADIENT_HOVER deve conter linear-gradient', () => {
      expect(BRAND_GRADIENT_HOVER).toContain('linear-gradient');
    });

    it('BRAND_GLOW deve ser um box-shadow CSS com brand primary', () => {
      // BRAND_GLOW é o valor CSS do box-shadow (sem a propriedade "box-shadow:")
      expect(BRAND_GLOW).toContain('rgba(34, 211, 238');
      expect(BRAND_GLOW).toContain('px');
    });

    it('APP_BACKGROUND_GLOW deve conter radial-gradient', () => {
      expect(APP_BACKGROUND_GLOW).toContain('radial-gradient');
    });
  });
});
