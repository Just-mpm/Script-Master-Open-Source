import { describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material/styles';

describe('AppThemeProvider', () => {
  it('deve importar appTheme corretamente', async () => {
    const { default: appTheme } = await import('../../src/theme/appTheme');
    expect(appTheme).toBeDefined();
    expect(appTheme.palette).toBeDefined();
  });

  it('deve importar LinkBehavior corretamente', async () => {
    const { LinkBehavior } = await import('../../src/theme/linkBehavior');
    expect(LinkBehavior).toBeDefined();
    expect(LinkBehavior.displayName).toBeUndefined(); // forwardRef
  });
});
