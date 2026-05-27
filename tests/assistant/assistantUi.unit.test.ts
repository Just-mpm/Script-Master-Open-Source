import { describe, it, expect, vi } from 'vitest';
import { createTheme } from '@mui/material/styles';
import {
  assistantDrawerPaperSx,
  assistantInsetSx,
  assistantMarkdownSx,
  assistantSuggestionChipSx,
} from '../../src/features/assistant/components/assistantUi';

// Mock das dependências de tema
vi.mock('../../src/theme/tokens', () => ({
  APP_BORDER: 'rgba(255,255,255,0.08)',
  APP_BORDER_STRONG: 'rgba(255,255,255,0.14)',
  APP_SURFACE: 'rgba(20,20,30,1)',
  APP_SURFACE_ELEVATED: 'rgba(30,30,45,1)',
  SHADOW_DEEP: 'rgba(0,0,0,0.5)',
  WHITE_01: 'rgba(255,255,255,0.01)',
  WHITE_04: 'rgba(255,255,255,0.04)',
  WHITE_06: 'rgba(255,255,255,0.06)',
  WHITE_08: 'rgba(255,255,255,0.08)',
  WHITE_10: 'rgba(255,255,255,0.10)',
  WHITE_82: 'rgba(255,255,255,0.82)',
  BLACK_50: 'rgba(0,0,0,0.5)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
  BRAND_SECONDARY: '#F7941E',
  TEXT_DISABLED: 'rgba(255,255,255,0.38)',
  TEXT_SECONDARY: 'rgba(248,250,252,0.68)',
  GAP_COMPACT: 4,
  GAP_MEDIUM: 8,
  GAP_DEFAULT: 12,
  RADIUS_XS: 8,
  RADIUS_CHIP: 999,
}));

vi.mock('../../src/theme/surfaces', () => ({
  insetPanelSx: () => ({
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  }),
}));

describe('assistantUi', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });

  describe('assistantDrawerPaperSx', () => {
    it('retorna objeto de estilos com propriedades obrigatórias', () => {
      const sx = assistantDrawerPaperSx(theme);

      expect(sx).toHaveProperty('width');
      expect(sx).toHaveProperty('maxWidth');
      expect(sx).toHaveProperty('backgroundColor');
      expect(sx).toHaveProperty('backdropFilter');
      expect(sx).toHaveProperty('borderLeft');
      expect(sx).toHaveProperty('boxShadow');
    });

    it('width responsivo tem valores para xs, sm e lg', () => {
      const sx = assistantDrawerPaperSx(theme);

      expect(sx.width).toEqual({ xs: '100%', sm: 400, lg: 440 });
    });

    it('maxWidth é 100%', () => {
      const sx = assistantDrawerPaperSx(theme);

      expect(sx.maxWidth).toBe('100%');
    });

    it('tem backdropFilter com blur', () => {
      const sx = assistantDrawerPaperSx(theme);

      expect(sx.backdropFilter).toContain('blur');
    });
  });

  describe('assistantInsetSx', () => {
    it('retorna objeto de estilos com backgroundColor', () => {
      const sx = assistantInsetSx(theme);

      expect(sx).toHaveProperty('backgroundColor');
      expect(typeof sx.backgroundColor).toBe('string');
    });

    it('inclui estilos do insetPanelSx', () => {
      const sx = assistantInsetSx(theme);

      // insetPanelSx mock retorna backgroundColor e borderRadius
      expect(sx).toHaveProperty('backgroundColor');
      expect(sx).toHaveProperty('borderRadius');
    });
  });

  describe('assistantMarkdownSx', () => {
    it('é um objeto (não função)', () => {
      expect(typeof assistantMarkdownSx).toBe('object');
      expect(assistantMarkdownSx).not.toBeNull();
    });

    it('remove margem superior do primeiro filho', () => {
      expect(assistantMarkdownSx['& > *:first-of-type'].mt).toBe(0);
    });

    it('remove margem inferior do último filho', () => {
      expect(assistantMarkdownSx['& > *:last-child'].mb).toBe(0);
    });

    it('tem estilo para parágrafos', () => {
      expect(assistantMarkdownSx).toHaveProperty('& p');
      expect(assistantMarkdownSx['& p']).toHaveProperty('my');
    });

    it('tem estilo para listas', () => {
      expect(assistantMarkdownSx).toHaveProperty('& ul, & ol');
      expect(assistantMarkdownSx['& ul, & ol']).toHaveProperty('my');
      expect(assistantMarkdownSx['& ul, & ol']).toHaveProperty('pl');
    });

    it('tem estilo para code inline', () => {
      expect(assistantMarkdownSx).toHaveProperty('& code');
      expect(assistantMarkdownSx['& code']).toHaveProperty('px');
      expect(assistantMarkdownSx['& code']).toHaveProperty('py');
      expect(assistantMarkdownSx['& code']).toHaveProperty('borderRadius');
      expect(assistantMarkdownSx['& code']).toHaveProperty('fontSize');
      expect(assistantMarkdownSx['& code']).toHaveProperty('backgroundColor');
    });

    it('tem estilo para pre (blocos de código)', () => {
      expect(assistantMarkdownSx).toHaveProperty('& pre');
      expect(assistantMarkdownSx['& pre']).toHaveProperty('overflowX');
      expect(assistantMarkdownSx['& pre']).toHaveProperty('p');
      expect(assistantMarkdownSx['& pre']).toHaveProperty('borderRadius');
      expect(assistantMarkdownSx['& pre']).toHaveProperty('backgroundColor');
    });

    it('tem estilo para itens de lista', () => {
      expect(assistantMarkdownSx).toHaveProperty('& li');
      expect(assistantMarkdownSx['& li']).toHaveProperty('mb');
    });
  });

  describe('assistantSuggestionChipSx', () => {
    it('é um objeto (não função)', () => {
      expect(typeof assistantSuggestionChipSx).toBe('object');
      expect(assistantSuggestionChipSx).not.toBeNull();
    });

    it('tem cursor pointer', () => {
      expect(assistantSuggestionChipSx.cursor).toBe('pointer');
    });

    it('tem hover state com borderColor', () => {
      const hover = assistantSuggestionChipSx['&:hover'];
      expect(hover).toBeDefined();
      expect(hover).toHaveProperty('borderColor');
      expect(hover).toHaveProperty('transform');
    });

    it('tem active state com transform', () => {
      const active = assistantSuggestionChipSx['&:active'];
      expect(active).toBeDefined();
      expect(active).toHaveProperty('transform');
    });

    it('tem transition para animação suave', () => {
      expect(assistantSuggestionChipSx).toHaveProperty('transition');
      expect(assistantSuggestionChipSx.transition).toContain('border-color');
      expect(assistantSuggestionChipSx.transition).toContain('transform');
    });
  });
});
