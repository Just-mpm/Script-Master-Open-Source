import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { FAQAccordion } from '../../../src/components/public';

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
  WHITE_015: 'rgba(255, 255, 255, 0.015)',
}));

const mockItems = [
  {
    question: 'O que é o Script Master?',
    answer: 'Uma plataforma que transforma roteiros em áudio com inteligência artificial.',
  },
  {
    question: 'Quais modelos de IA são utilizados?',
    answer: 'Utilizamos os modelos Gemini da Google para geração de áudio e imagens.',
  },
  {
    question: 'É possível exportar em vídeo?',
    answer: 'Sim, você pode gerar vídeos automaticamente a partir das cenas do seu roteiro.',
  },
];

describe('FAQAccordion', () => {
  it('renderiza título quando fornecido', () => {
    render(<FAQAccordion items={mockItems} title="Perguntas Frequentes" />, { wrapper: Wrapper });

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Perguntas Frequentes');
  });

  it('renderiza todas as perguntas', () => {
    render(<FAQAccordion items={mockItems} title="FAQ" />, { wrapper: Wrapper });

    expect(screen.getByText('O que é o Script Master?')).toBeDefined();
    expect(screen.getByText('Quais modelos de IA são utilizados?')).toBeDefined();
    expect(screen.getByText('É possível exportar em vídeo?')).toBeDefined();
  });

  it('expande resposta ao clicar na pergunta', () => {
    render(<FAQAccordion items={mockItems} />, { wrapper: Wrapper });

    // AccordionSummary tem role="button"
    const firstButton = screen.getByRole('button', { name: /O que é o Script Master/ });
    expect(firstButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(firstButton);

    expect(firstButton.getAttribute('aria-expanded')).toBe('true');

    // Verifica que a resposta está no documento
    expect(screen.getByText('Uma plataforma que transforma roteiros em áudio com inteligência artificial.')).toBeDefined();
  });

  it('colapsa resposta ao clicar novamente', () => {
    render(<FAQAccordion items={mockItems} />, { wrapper: Wrapper });

    const firstButton = screen.getByRole('button', { name: /O que é o Script Master/ });

    // Expande
    fireEvent.click(firstButton);
    expect(firstButton.getAttribute('aria-expanded')).toBe('true');

    // Colapsa
    fireEvent.click(firstButton);
    expect(firstButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('funciona sem título (title opcional)', () => {
    render(<FAQAccordion items={mockItems} />, { wrapper: Wrapper });

    // Não deve haver heading h2 quando title não é fornecido
    // (MUI AccordionSummary renderiza h3 internamente, então filtramos por level)
    const heading = screen.queryByRole('heading', { level: 2 });
    expect(heading).toBeNull();

    // Perguntas ainda devem estar presentes
    expect(screen.getByText('O que é o Script Master?')).toBeDefined();
  });

  it('renderiza todas as respostas no DOM', () => {
    render(<FAQAccordion items={mockItems} title="FAQ" />, { wrapper: Wrapper });

    expect(screen.getByText('Uma plataforma que transforma roteiros em áudio com inteligência artificial.')).toBeDefined();
    expect(screen.getByText('Utilizamos os modelos Gemini da Google para geração de áudio e imagens.')).toBeDefined();
    expect(screen.getByText('Sim, você pode gerar vídeos automaticamente a partir das cenas do seu roteiro.')).toBeDefined();
  });

  it('renderiza com lista vazia sem erro', () => {
    render(<FAQAccordion items={[]} title="FAQ Vazio" />, { wrapper: Wrapper });

    expect(screen.getByText('FAQ Vazio')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('mantém outros accordions colapsados ao expandir um', () => {
    render(<FAQAccordion items={mockItems} />, { wrapper: Wrapper });

    const firstButton = screen.getByRole('button', { name: /O que é o Script Master/ });
    const secondButton = screen.getByRole('button', { name: /Quais modelos de IA/ });

    // Expande o primeiro
    fireEvent.click(firstButton);
    expect(firstButton.getAttribute('aria-expanded')).toBe('true');
    expect(secondButton.getAttribute('aria-expanded')).toBe('false');
  });
});
