import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HeroSection } from '../../../src/components/public/HeroSection';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
}));

describe('HeroSection', () => {
  const defaultProps = {
    title: 'Título do Hero',
    subtitle: 'Subtítulo descritivo do hero',
  };

  it('renderiza o título', () => {
    render(<HeroSection {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Título do Hero')).toBeDefined();
  });

  it('renderiza o subtítulo', () => {
    render(<HeroSection {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Subtítulo descritivo do hero')).toBeDefined();
  });

  it('renderiza o CTA primário quando fornecido', () => {
    render(
      <HeroSection {...defaultProps} primaryCta={{ label: 'Começar', to: '/login' }} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('link', { name: /Começar/i })).toBeDefined();
  });

  it('renderiza o CTA secundário quando fornecido', () => {
    render(
      <HeroSection
        {...defaultProps}
        primaryCta={{ label: 'Começar', to: '/login' }}
        secondaryCta={{ label: 'Saiba Mais', to: '/features' }}
      />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('link', { name: /Saiba Mais/i })).toBeDefined();
  });

  it('não renderiza CTA quando não fornecido', () => {
    render(<HeroSection {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renderiza o conteúdo visual quando fornecido', () => {
    render(
      <HeroSection {...defaultProps} visual={<img src="/test.png" alt="Visual" />} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByAltText('Visual')).toBeDefined();
  });

  it('renderiza com showGlow=false sem erro', () => {
    render(
      <HeroSection {...defaultProps} showGlow={false} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Título do Hero')).toBeDefined();
  });

  it('renderiza com visualPosition="left" sem erro', () => {
    render(
      <HeroSection {...defaultProps} visual={<div data-testid="visual">Visual</div>} visualPosition="left" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId('visual')).toBeDefined();
  });
});
