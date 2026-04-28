import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import StatusPage from '../../../src/pages/public/StatusPage';

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
  APP_BORDER: 'rgba(255,255,255,0.08)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
  BRAND_SECONDARY: '#F7941E',
  TEXT_PRIMARY: '#f8fafc',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  SUCCESS_MAIN: '#10b981',
  WARNING_MAIN: '#f59e0b',
  ERROR_MAIN: '#ef4444',
  TEXT_DISABLED: 'rgba(248, 250, 252, 0.38)',
  SHADOW_DEEP: '#020617',
  ICON_SIZE_MD: 16,
  ICON_SIZE_LG: 18,
  WHITE_04: 'rgba(255,255,255,0.04)',
  WHITE_06: 'rgba(255,255,255,0.06)',
  WHITE_12: 'rgba(255,255,255,0.12)',
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Status dos Serviços' }),
}));

vi.mock('../../../src/features/i18n', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'status.hero.title': 'Status dos Serviços',
        'status.hero.subtitle': 'Status informativo dos serviços do Script Master. Dados atualizados manualmente.',
        'status.disclaimer': 'Os dados exibidos nesta página são informativos e não representam monitoramento em tempo real. O status real dos serviços depende de terceiros (Google Gemini, Firebase).',
        'status.globalStatus': 'Todos os sistemas operacionais',
        'status.lastCheck': `Última atualização: build ${params?.date ?? ''} (dados informativos)`,
        'status.incidents.title': 'Últimos 90 dias',
        'status.incidents.resolved': 'Resolvido',
        'status.incidents.degraded': 'Degradado',
        'status.services.api.name': 'API Gemini (IA)',
        'status.services.api.description': 'Geração de áudio, imagens e assistente conversacional',
        'status.services.auth.name': 'Firebase Auth',
        'status.services.auth.description': 'Autenticação e gerenciamento de contas',
        'status.services.firestore.name': 'Firebase Firestore',
        'status.services.firestore.description': 'Banco de dados e sincronização de projetos',
        'status.services.storage.name': 'Firebase Storage',
        'status.services.storage.description': 'Armazenamento de áudios, imagens e vídeos',
        'status.services.video.name': 'Renderização de Vídeo',
        'status.services.video.description': 'Processamento client-side via WebCodecs',
        'status.statusLabels.operational': 'Operacional',
        'status.statusLabels.degraded': 'Degradado',
        'status.statusLabels.outage': 'Indisponível',
        'status.statusLabels.maintenance': 'Manutenção',
      };
      return map[key] ?? key;
    },
    locale: 'pt-BR',
  }),
}));

describe('StatusPage', () => {
  it('renderiza título "Status dos Serviços"', () => {
    render(<StatusPage />, { wrapper: Wrapper });
    expect(screen.getByText('Status dos Serviços')).toBeDefined();
  });

  it('renderiza status global "Todos os sistemas operacionais"', () => {
    render(<StatusPage />, { wrapper: Wrapper });
    expect(screen.getByText('Todos os sistemas operacionais')).toBeDefined();
  });

  it('renderiza cards dos 5 serviços', () => {
    render(<StatusPage />, { wrapper: Wrapper });
    expect(screen.getByText('API Gemini (IA)')).toBeDefined();
    expect(screen.getByText('Firebase Auth')).toBeDefined();
    expect(screen.getByText('Firebase Firestore')).toBeDefined();
    expect(screen.getByText('Firebase Storage')).toBeDefined();
    expect(screen.getByText('Renderização de Vídeo')).toBeDefined();
  });

  it('renderiza status "Operacional" em cada serviço', () => {
    render(<StatusPage />, { wrapper: Wrapper });
    const operacionalChips = screen.getAllByText('Operacional');
    // 5 serviços, todos com status "Operacional"
    expect(operacionalChips.length).toBe(5);
  });
});
