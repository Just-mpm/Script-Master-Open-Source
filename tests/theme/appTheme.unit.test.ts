import { describe, it, expect } from 'vitest';
import appTheme from '../../src/theme/appTheme';

describe('appTheme', () => {
  it('deve ser um objeto de tema válido', () => {
    expect(appTheme).toBeDefined();
    expect(appTheme).toBeTypeOf('object');
  });

  it('deve ter paleta definida', () => {
    expect(appTheme.palette).toBeDefined();
  });

  it('deve ter cor primária (brand blue)', () => {
    expect(appTheme.palette.primary.main).toBe('#2E75B6');
  });

  it('deve ter cor secundária (brand orange)', () => {
    expect(appTheme.palette.secondary.main).toBe('#F7941E');
  });

  it('deve ter cores de status semântico', () => {
    expect(appTheme.palette.success.main).toBe('#10b981');
    expect(appTheme.palette.error.main).toBe('#ef4444');
    expect(appTheme.palette.warning.main).toBe('#f59e0b');
  });

  it('deve ter background default escuro', () => {
    expect(appTheme.palette.background.default).toBe('#050816');
  });

  it('deve ter background paper (surface)', () => {
    expect(appTheme.palette.background.paper).toBe('#10172a');
  });

  it('deve ter cores de texto', () => {
    expect(appTheme.palette.text.primary).toBeDefined();
    expect(appTheme.palette.text.secondary).toBeDefined();
    expect(appTheme.palette.text.disabled).toBeDefined();
  });

  it('deve ter tipografia configurada', () => {
    expect(appTheme.typography).toBeDefined();
    expect(appTheme.typography.fontFamily).toContain('Inter');
  });

  it('deve ter h1-h6 com fontWeight 700', () => {
    for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
      expect(appTheme.typography[level].fontWeight).toBe(700);
    }
  });

  it('deve ter body1 com lineHeight', () => {
    expect(appTheme.typography.body1.lineHeight).toBe(1.6);
  });

  it('deve ter body2 com lineHeight', () => {
    expect(appTheme.typography.body2.lineHeight).toBe(1.55);
  });

  it('deve ter shape com borderRadius padrão', () => {
    expect(appTheme.shape.borderRadius).toBe(6);
  });

  it('deve ter spacing definido', () => {
    expect(appTheme.spacing).toBeDefined();
  });

  it('deve ter componentes customizados', () => {
    expect(appTheme.components).toBeDefined();
    const comps = appTheme.components!;
    expect(comps.MuiButton).toBeDefined();
    expect(comps.MuiPaper).toBeDefined();
    expect(comps.MuiAppBar).toBeDefined();
    expect(comps.MuiCssBaseline).toBeDefined();
    expect(comps.MuiAlert).toBeDefined();
    expect(comps.MuiCard).toBeDefined();
    expect(comps.MuiIconButton).toBeDefined();
    expect(comps.MuiLink).toBeDefined();
    expect(comps.MuiSnackbar).toBeDefined();
    expect(comps.MuiToolbar).toBeDefined();
  });

  it('deve ter divider com APP_BORDER', () => {
    expect(appTheme.palette.divider).toBe('rgba(255, 255, 255, 0.08)');
  });

  it('deve ter action colors', () => {
    expect(appTheme.palette.action).toBeDefined();
    expect(appTheme.palette.action.hover).toBeDefined();
    expect(appTheme.palette.action.selected).toBeDefined();
    expect(appTheme.palette.action.disabled).toBeDefined();
  });
});
