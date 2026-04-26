import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import FuncionalidadesPage from '../../../src/pages/public/FuncionalidadesPage';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

vi.mock('../../../src/components/public/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
  BRAND_SECONDARY: '#F7941E',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  ICON_SIZE_MD: 20,
  APP_BORDER: 'rgba(255,255,255,0.08)',
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('FuncionalidadesPage', () => {
  it('renderiza sem crash', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('renderiza o título principal', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Tudo que você precisa para criar')).toBeDefined();
  });

  it('renderiza o subtítulo', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText(/Explore todas as ferramentas integradas/)).toBeDefined();
  });

  it('renderiza todas as 6 seções de features', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    const sections = [
      'Estúdio de Voz (TTS)',
      'Renderização de Vídeo',
      'Geração de Imagens',
      'Speed Paint & Animação',
      'Assistente IA',
      'Plataforma',
    ];
    for (const section of sections) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeDefined();
    }
  });

  it('cada seção tem id para anchor links', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(document.getElementById('tts')).toBeDefined();
    expect(document.getElementById('video')).toBeDefined();
    expect(document.getElementById('images')).toBeDefined();
    expect(document.getElementById('speed-paint')).toBeDefined();
    expect(document.getElementById('assistant')).toBeDefined();
    expect(document.getElementById('platform')).toBeDefined();
  });

  it('renderiza features de TTS', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Geração de Áudio TTS')).toBeDefined();
    expect(screen.getByText('Chunking Inteligente')).toBeDefined();
    expect(screen.getByText('Multi-speaker')).toBeDefined();
    expect(screen.getByText('Controle de Voz')).toBeDefined();
  });

  it('renderiza features de vídeo', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Composição de Vídeo')).toBeDefined();
    expect(screen.getByText('Legendas Automáticas')).toBeDefined();
    expect(screen.getByText('3 Resoluções')).toBeDefined();
  });

  it('renderiza features de imagens', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Estúdio de Imagem')).toBeDefined();
    expect(screen.getByText('8 Aspect Ratios')).toBeDefined();
    expect(screen.getByText('Galeria Integrada')).toBeDefined();
  });

  it('renderiza features de Speed Paint', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Animação de Pintura')).toBeDefined();
    expect(screen.getByText('Batch Processing')).toBeDefined();
    expect(screen.getByText('Exportação Mídia')).toBeDefined();
  });

  it('renderiza features do assistente', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Chat Conversacional')).toBeDefined();
    expect(screen.getByText('Integração com Estúdio')).toBeDefined();
    expect(screen.getByText('Sistema de Memória')).toBeDefined();
  });

  it('renderiza features da plataforma', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Persistência Dual')).toBeDefined();
    expect(screen.getByText('Autenticação Google')).toBeDefined();
    expect(screen.getByText('Transcrição Whisper')).toBeDefined();
  });

  it('renderiza os feature showcases de deep dive', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Áudio Profissional com Gemini TTS')).toBeDefined();
    expect(screen.getByText('Vídeo Sem Servidor')).toBeDefined();
    expect(screen.getByText('Imagens com Referência Visual')).toBeDefined();
  });

  it('renderiza a CTA final', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Pronto para criar?' })).toBeDefined();
    // "Começar Grátis" aparece tanto no hero quanto na CTA final
    const links = screen.getAllByRole('link', { name: /Começar Grátis/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
