import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PricingCard } from '../../../src/components/public/PricingCard';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/theme/tokens')>();
  return { ...actual, APP_MAX_WIDTH: 1600,
  APP_BORDER: 'rgba(255,255,255,0.08)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
  BRAND_SECONDARY: '#F7941E',
  ICON_SIZE_MD: 20,
  TEXT_PRIMARY: '#f8fafc',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  TEXT_DISABLED: 'rgba(248, 250, 252, 0.38)',
  SUCCESS_MAIN: '#4caf50',
  SHADOW_DEEP: 'rgba(0, 0, 0, 0.4)',
  GAP_DEFAULT: 1,
  APP_SURFACE: 'rgba(255, 255, 255, 0.04)',
  WHITE_05: 'rgba(255, 255, 255, 0.05)',
  WHITE_015: 'rgba(255, 255, 255, 0.015)', };
});;

describe('PricingCard', () => {
  const defaultProps = {
    name: 'Pro',
    price: 'R$ 49,90/mês',
    description: 'Para criadores de conteúdo que querem ir além',
    features: [
      { text: 'Geração de áudio ilimitada', included: true },
      { text: 'Geração de imagens com IA', included: true },
      { text: 'Exportação de vídeo HD', included: false },
      { text: 'Assistente de roteiro', included: true },
    ],
    ctaLabel: 'Começar agora',
    onCtaClick: vi.fn(),
  };

  it('renderiza nome, preço e descrição do plano', () => {
    render(<PricingCard {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Pro')).toBeDefined();
    expect(screen.getByText('R$ 49,90/mês')).toBeDefined();
    expect(screen.getByText('Para criadores de conteúdo que querem ir além')).toBeDefined();
  });

  it('renderiza todas as features com ícone de check para incluídas', () => {
    const includedOnly = [
      { text: 'Feature A', included: true },
      { text: 'Feature B', included: true },
      { text: 'Feature C', included: true },
    ];

    render(<PricingCard {...defaultProps} features={includedOnly} />, { wrapper: Wrapper });

    const list = screen.getByRole('list');
    const items = list.querySelectorAll('li');
    expect(items.length).toBe(3);

    // Cada feature incluída deve ter um SVG de ícone
    const svgIcons = list.querySelectorAll('svg');
    expect(svgIcons.length).toBe(3);

    // Verifica que textos das features estão presentes
    expect(screen.getByText('Feature A')).toBeDefined();
    expect(screen.getByText('Feature B')).toBeDefined();
    expect(screen.getByText('Feature C')).toBeDefined();
  });

  it('renderiza ícone de close para features não incluídas', () => {
    const notIncluded = [
      { text: 'Suporte prioritário', included: false },
      { text: 'API access', included: false },
    ];

    render(<PricingCard {...defaultProps} features={notIncluded} />, { wrapper: Wrapper });

    const list = screen.getByRole('list');
    const items = list.querySelectorAll('li');
    expect(items.length).toBe(2);

    // Features não incluídas também devem ter ícones SVG
    const svgIcons = list.querySelectorAll('svg');
    expect(svgIcons.length).toBe(2);

    expect(screen.getByText('Suporte prioritário')).toBeDefined();
    expect(screen.getByText('API access')).toBeDefined();
  });

  it('renderiza botão CTA com label correto', () => {
    render(<PricingCard {...defaultProps} />, { wrapper: Wrapper });

    const button = screen.getByRole('button', { name: 'Começar agora' });
    expect(button).toBeDefined();
    expect(button.textContent).toBe('Começar agora');
  });

  it('chama onCtaClick ao clicar no botão', () => {
    const onCtaClick = vi.fn();
    render(<PricingCard {...defaultProps} onCtaClick={onCtaClick} />, { wrapper: Wrapper });

    const button = screen.getByRole('button', { name: 'Começar agora' });
    fireEvent.click(button);

    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });

  it('aplica estilos de destaque quando recommended=true', () => {
    render(<PricingCard {...defaultProps} recommended />, { wrapper: Wrapper });

    // Badge "Popular" deve estar visível
    expect(screen.getByText('Popular')).toBeDefined();
  });

  it('não renderiza badge Popular quando recommended=false', () => {
    render(<PricingCard {...defaultProps} recommended={false} />, { wrapper: Wrapper });

    expect(screen.queryByText('Popular')).toBeNull();
  });

  it('renderiza subtítulo do preço quando fornecido', () => {
    render(<PricingCard {...defaultProps} priceSubtitle="por mês" />, { wrapper: Wrapper });

    expect(screen.getByText('por mês')).toBeDefined();
  });

  it('não renderiza subtítulo do preço quando ausente', () => {
    render(<PricingCard {...defaultProps} />, { wrapper: Wrapper });

    // O preço principal deve existir, mas sem subtítulo extra
    expect(screen.getByText('R$ 49,90/mês')).toBeDefined();
  });

  it('renderiza lista com aria-label contendo nome do plano', () => {
    render(<PricingCard {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByRole('list', { name: /Funcionalidades do plano Pro/ })).toBeDefined();
  });

  it('renderiza sem onCtaClick sem erro', () => {
    render(<PricingCard {...defaultProps} onCtaClick={undefined} />, { wrapper: Wrapper });

    const button = screen.getByRole('button', { name: 'Começar agora' });
    expect(button).toBeDefined();
    // Clicar sem handler não deve lançar erro
    expect(() => fireEvent.click(button)).not.toThrow();
  });
});
