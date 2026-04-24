import { describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material/styles';
import { glassPanelSx, insetPanelSx, glassSurfaceSx } from '../../src/theme/surfaces';

// Cria um tema mínimo com os campos exigidos pelos surfaces
const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    dark: { palette: {} },
    light: { palette: {} },
  },
  palette: {
    background: {
      default: '#050816',
      paper: '#10172a',
    },
    common: {
      white: '#ffffff',
      black: '#000000',
    },
  },
});

describe('Surface Functions', () => {
  describe('glassPanelSx', () => {
    it('deve retornar objeto com propriedades de estilo', () => {
      const sx = glassPanelSx(theme);
      expect(sx).toBeTypeOf('object');
    });

    it('deve ter position relative', () => {
      const sx = glassPanelSx(theme) as Record<string, unknown>;
      expect(sx.position).toBe('relative');
    });

    it('deve ter overflow hidden', () => {
      const sx = glassPanelSx(theme) as Record<string, unknown>;
      expect(sx.overflow).toBe('hidden');
    });

    it('deve conter border com alpha', () => {
      const sx = glassPanelSx(theme) as Record<string, unknown>;
      expect(sx.border).toMatch(/1px solid/);
    });

    it('deve conter backdropFilter', () => {
      const sx = glassPanelSx(theme) as Record<string, unknown>;
      expect(sx.backdropFilter).toBeDefined();
    });

    it('deve conter boxShadow', () => {
      const sx = glassPanelSx(theme) as Record<string, unknown>;
      expect(sx.boxShadow).toBeDefined();
    });

    it('deve conter borderRadius responsivo', () => {
      const sx = glassPanelSx(theme) as Record<string, unknown>;
      expect(sx.borderRadius).toBeDefined();
    });
  });

  describe('insetPanelSx', () => {
    it('deve retornar objeto com propriedades de estilo', () => {
      const sx = insetPanelSx(theme);
      expect(sx).toBeTypeOf('object');
    });

    it('deve ter borderRadius', () => {
      const sx = insetPanelSx(theme) as Record<string, unknown>;
      expect(sx.borderRadius).toBeDefined();
    });

    it('deve ter border com alpha', () => {
      const sx = insetPanelSx(theme) as Record<string, unknown>;
      expect(sx.border).toMatch(/1px solid/);
    });

    it('deve ter backgroundImage none', () => {
      const sx = insetPanelSx(theme) as Record<string, unknown>;
      expect(sx.backgroundImage).toBe('none');
    });

    it('deve ter boxShadow none (painel recessado)', () => {
      const sx = insetPanelSx(theme) as Record<string, unknown>;
      expect(sx.boxShadow).toBe('none');
    });
  });

  describe('glassSurfaceSx', () => {
    it('deve retornar objeto com propriedades de estilo', () => {
      const sx = glassSurfaceSx(theme);
      expect(sx).toBeTypeOf('object');
    });

    it('deve conter border com APP_BORDER', () => {
      const sx = glassSurfaceSx(theme) as Record<string, unknown>;
      expect(sx.border).toMatch(/1px solid/);
    });

    it('deve conter backdropFilter blur', () => {
      const sx = glassSurfaceSx(theme) as Record<string, unknown>;
      expect(sx.backdropFilter).toContain('blur');
    });

    it('deve conter WebkitBackdropFilter para Safari', () => {
      const sx = glassSurfaceSx(theme) as Record<string, unknown>;
      expect(sx.WebkitBackdropFilter).toBeDefined();
    });

    it('deve conter boxShadow', () => {
      const sx = glassSurfaceSx(theme) as Record<string, unknown>;
      expect(sx.boxShadow).toBeDefined();
    });
  });
});
