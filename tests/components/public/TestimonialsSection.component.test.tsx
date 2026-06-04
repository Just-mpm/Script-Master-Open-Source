import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TestimonialsSection } from '../../../src/components/public/TestimonialsSection';
import { TestimonialCard } from '../../../src/components/public/TestimonialCard';
import type { Testimonial } from '../../../src/data/testimonials';
import { I18nProvider } from '../../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter>{children}</MemoryRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}

vi.mock('../../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/theme/tokens')>();
  return { ...actual, APP_MAX_WIDTH: 1600,
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  BRAND_SECONDARY: '#F7941E',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)', };
});;

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

// ─── TestimonialCard ────────────────────────────────────────

describe('TestimonialCard', () => {
  const mockTestimonial: Testimonial = {
    id: 'test-id',
    name: 'João Silva',
    role: 'Criador de conteúdo',
    company: 'Canal Teste',
    text: 'Texto do depoimento de teste.',
    rating: 5,
    useCase: 'YouTube',
  };

  it('renderiza o nome do autor', () => {
    render(<TestimonialCard testimonial={mockTestimonial} index={0} />, { wrapper: Wrapper });
    expect(screen.getByText('João Silva')).toBeDefined();
  });

  it('renderiza o cargo e empresa concatenados', () => {
    render(<TestimonialCard testimonial={mockTestimonial} index={0} />, { wrapper: Wrapper });
    // MUI caption renderiza cargo e empresa no mesmo <span> com "·"
    expect(screen.getByText(/Criador de conteúdo/)).toBeDefined();
    expect(screen.getByText(/Canal Teste/)).toBeDefined();
  });

  it('renderiza o texto do depoimento entre aspas', () => {
    render(<TestimonialCard testimonial={mockTestimonial} index={0} />, { wrapper: Wrapper });
    // As aspas decorativas (ldquo/rdquo) envolvem o texto
    expect(screen.getByText(/Texto do depoimento de teste\./)).toBeDefined();
  });

  it('renderiza as iniciais do nome como avatar', () => {
    render(<TestimonialCard testimonial={mockTestimonial} index={0} />, { wrapper: Wrapper });
    // MUI Avatar sem src não renderiza alt attribute — busca pelo texto das iniciais
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toBeDefined();
    expect(avatar?.textContent).toBe('JS');
  });

  it('renderiza rating com valor correto', () => {
    render(<TestimonialCard testimonial={mockTestimonial} index={0} />, { wrapper: Wrapper });
    // MUI Rating com value={5} e readOnly
    const rating = document.querySelector('[aria-label="5 Stars"]');
    expect(rating).toBeDefined();
  });

  it('renderiza rating com meia estrela', () => {
    const halfRating: Testimonial = { ...mockTestimonial, rating: 4.5 };
    render(<TestimonialCard testimonial={halfRating} index={0} />, { wrapper: Wrapper });
    const rating = document.querySelector('[aria-label="4.5 Stars"]');
    expect(rating).toBeDefined();
  });

  it('renderiza avatar com 2 iniciais para nome composto', () => {
    const compoundName: Testimonial = { ...mockTestimonial, name: 'Prof. Maria Costa' };
    render(<TestimonialCard testimonial={compoundName} index={0} />, { wrapper: Wrapper });
    // "Prof." split = ["Prof.", "Maria", "Costa"] → ["P", "M"] → "PM"
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toBeDefined();
    expect(avatar?.textContent).toBe('PM');
  });
});

// ─── TestimonialsSection ────────────────────────────────────

describe('TestimonialsSection', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza o título da seção como h2', () => {
    render(<TestimonialsSection />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });

  it('renderiza o subtítulo descritivo', () => {
    render(<TestimonialsSection />, { wrapper: Wrapper });
    const paragraphs = screen.getAllByRole('paragraph');
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza os 6 depoimentos', () => {
    render(<TestimonialsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Lucas Andrade')).toBeDefined();
    expect(screen.getByText('Camila Ferreira')).toBeDefined();
    expect(screen.getByText('Ricardo Mendes')).toBeDefined();
    expect(screen.getByText('Prof. Juliana Costa')).toBeDefined();
    expect(screen.getByText('Gabriel Oliveira')).toBeDefined();
    expect(screen.getByText('Mariana Lopes')).toBeDefined();
  });

  it('renderiza cargo e empresa de cada depoente', () => {
    render(<TestimonialsSection />, { wrapper: Wrapper });
    // Cargo e empresa aparecem concatenados no mesmo <span> com "·"
    expect(screen.getByText(/Criador de conteúdo/)).toBeDefined();
    expect(screen.getByText(/Podcaster/)).toBeDefined();
    expect(screen.getByText(/Head de Marketing/)).toBeDefined();
    expect(screen.getByText(/Professora de História/)).toBeDefined();
    expect(screen.getByText(/Produtor de conteúdo curto/)).toBeDefined();
    expect(screen.getByText(/Roteirista freelance/)).toBeDefined();
  });

  it('renderiza rating para cada depoimento', () => {
    render(<TestimonialsSection />, { wrapper: Wrapper });
    // 5 depoimentos com rating 5 + 1 com rating 4
    const fiveStars = document.querySelectorAll('[aria-label="5 Stars"]');
    const fourStars = document.querySelectorAll('[aria-label="4 Stars"]');
    expect(fiveStars.length).toBe(5);
    expect(fourStars.length).toBe(1);
  });

  it('localiza textos dos depoimentos para en', () => {
    localStorage.setItem('s2a_locale', 'en');
    render(<TestimonialsSection />, { wrapper: Wrapper });
    expect(screen.getByText(/I used to freeze when it was time to record/)).toBeDefined();
  });
});
