import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { FeatureCard } from '../../../src/components/public/FeatureCard';
import { StepCard } from '../../../src/components/public/StepCard';
import { FeatureShowcase } from '../../../src/components/public/FeatureShowcase';
import { CTASection } from '../../../src/components/public/CTASection';
import { SocialProofBar } from '../../../src/components/public/SocialProofBar';
import Mic from '@mui/icons-material/Mic';

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

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  ICON_SIZE_MD: 20,
  APP_BORDER: 'rgba(255,255,255,0.08)',
}));

// ─── FeatureCard ───────────────────────────────────────────

describe('FeatureCard', () => {
  it('renderiza o título', () => {
    render(
      <FeatureCard icon={Mic} title="Voz com IA" description="Descrição da feature" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Voz com IA')).toBeDefined();
  });

  it('renderiza a descrição', () => {
    render(
      <FeatureCard icon={Mic} title="Voz com IA" description="Descrição da feature" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Descrição da feature')).toBeDefined();
  });

  it('renderiza o ícone como h3', () => {
    render(
      <FeatureCard icon={Mic} title="Voz com IA" description="Descrição da feature" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Voz com IA' })).toBeDefined();
  });

  it('renderiza conteúdo extra quando fornecido', () => {
    render(
      <FeatureCard icon={Mic} title="Voz com IA" description="Descrição da feature" extra={<span>Conteúdo extra</span>} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Conteúdo extra')).toBeDefined();
  });

  it('renderiza sem highlighted por padrão', () => {
    render(
      <FeatureCard icon={Mic} title="Voz com IA" description="Descrição da feature" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Voz com IA')).toBeDefined();
  });

  it('renderiza com highlighted=true sem erro', () => {
    render(
      <FeatureCard icon={Mic} title="Voz com IA" description="Descrição da feature" highlighted />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Voz com IA')).toBeDefined();
  });
});

// ─── StepCard ──────────────────────────────────────────────

describe('StepCard', () => {
  it('renderiza o título do passo', () => {
    render(
      <StepCard number={1} title="Escreva seu roteiro" description="Use o editor integrado" icon={Mic} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Escreva seu roteiro')).toBeDefined();
  });

  it('renderiza a descrição do passo', () => {
    render(
      <StepCard number={1} title="Escreva seu roteiro" description="Use o editor integrado" icon={Mic} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Use o editor integrado')).toBeDefined();
  });

  it('renderiza o número do passo', () => {
    render(
      <StepCard number={1} title="Escreva seu roteiro" description="Use o editor integrado" icon={Mic} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('1')).toBeDefined();
  });

  it('renderiza o título como h3', () => {
    render(
      <StepCard number={1} title="Escreva seu roteiro" description="Use o editor integrado" icon={Mic} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Escreva seu roteiro' })).toBeDefined();
  });
});

// ─── FeatureShowcase ───────────────────────────────────────

describe('FeatureShowcase', () => {
  const defaultProps = {
    icon: Mic,
    title: 'Voz Profissional',
    description: 'Transforme roteiros em narração profissional.',
    benefits: ['Benefício 1', 'Benefício 2'],
    visual: <img src="/test.png" alt="Feature visual" />,
  };

  it('renderiza o título como h2', () => {
    render(<FeatureShowcase {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Voz Profissional' })).toBeDefined();
  });

  it('renderiza a descrição', () => {
    render(<FeatureShowcase {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Transforme roteiros em narração profissional.')).toBeDefined();
  });

  it('renderiza todos os benefícios', () => {
    render(<FeatureShowcase {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Benefício 1')).toBeDefined();
    expect(screen.getByText('Benefício 2')).toBeDefined();
  });

  it('renderiza o conteúdo visual', () => {
    render(<FeatureShowcase {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByAltText('Feature visual')).toBeDefined();
  });

  it('renderiza com position="left" sem erro', () => {
    render(<FeatureShowcase {...defaultProps} position="left" />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Voz Profissional' })).toBeDefined();
  });
});

// ─── CTASection ────────────────────────────────────────────

describe('CTASection', () => {
  it('renderiza o título', () => {
    render(
      <CTASection title="Comece a criar" buttonLabel="Entrar" buttonHref="/login" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Comece a criar' })).toBeDefined();
  });

  it('renderiza o subtítulo quando fornecido', () => {
    render(
      <CTASection title="Comece a criar" subtitle="Grátis para começar" buttonLabel="Entrar" buttonHref="/login" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Grátis para começar')).toBeDefined();
  });

  it('renderiza o botão com o label correto', () => {
    render(
      <CTASection title="Comece a criar" buttonLabel="Entrar" buttonHref="/login" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('link', { name: /Entrar/i })).toBeDefined();
  });

  it('renderiza sem subtítulo sem erro', () => {
    render(
      <CTASection title="Comece a criar" buttonLabel="Entrar" buttonHref="/login" />,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });
});

// ─── SocialProofBar ────────────────────────────────────────

describe('SocialProofBar', () => {
  it('renderiza o label principal', () => {
    render(<SocialProofBar label="Mais de 1.000 criadores" />, { wrapper: Wrapper });
    expect(screen.getByText('Mais de 1.000 criadores')).toBeDefined();
  });

  it('renderiza o sublabel quando fornecido', () => {
    render(<SocialProofBar label="Mais de 1.000 criadores" sublabel="Transformando ideias em arte" />, { wrapper: Wrapper });
    expect(screen.getByText('Transformando ideias em arte')).toBeDefined();
  });

  it('não renderiza sublabel quando não fornecido', () => {
    render(<SocialProofBar label="Mais de 1.000 criadores" />, { wrapper: Wrapper });
    expect(screen.queryByText('Transformando ideias em arte')).toBeNull();
  });
});
