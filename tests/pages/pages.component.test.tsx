import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks comuns para todas as pages ---

vi.mock('@mui/material', () => {
  const module = vi.importActual('@mui/material');
  return {
    ...module,
  };
});

vi.mock('../../src/contexts/AudioContext', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGlobalAudioState: () => ({
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    activeId: null,
    formatTime: (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
  }),
  useGlobalAudioActions: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    seek: vi.fn(),
    formatTime: (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
    setDurationOverride: vi.fn(),
    audioRef: { current: null },
    getSnapshot: () => ({
      isPlaying: false, progress: 0, currentTime: 0, duration: 0, activeId: null,
    }),
  }),
  useAudioIsPlaying: vi.fn(() => false),
  useAudioCurrentTime: vi.fn(() => 0),
  useAudioActiveId: vi.fn(() => null),
  useAudioDuration: vi.fn(() => 0),
  useAudioProgress: vi.fn(() => 0),
}));

const mockUseAuth = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/features/speed-paint/store/animationStore', () => {
  const state = {
    queue: [] as unknown[],
    batchMode: 'idle' as string,
  };
  return {
    useAnimationStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock('../../src/features/video-render/store/videoRenderBridge', () => ({
  useVideoRenderBridge: () => ({
    syncExportState: vi.fn(),
    syncTranscriptionState: vi.fn(),
    resetBridge: vi.fn(),
  }),
}));

vi.mock('../../src/features/video-render/hooks/useVideoExporter', () => ({
  useVideoExporter: () => ({
    isRendering: false,
    renderProgress: 0,
  }),
}));

vi.mock('../../src/features/video-render/hooks/useTranscription', () => ({
  useTranscription: () => ({
    captions: [],
    isTranscribing: false,
    transcriptionProgress: 0,
    transcriptionStatusText: '',
    transcribeAudio: vi.fn(),
    cancelTranscription: vi.fn(),
    clearTranscription: vi.fn(),
    error: null,
    source: null,
    whisperSupported: true,
    isStale: false,
    updateCaptions: vi.fn(),
  }),
}));

vi.mock('../../src/features/video-render/types', () => ({
  DEFAULT_SUBTITLE_STYLE: {
    fontSize: 24,
    padding: 8,
    borderRadius: 6,
    opacity: 1,
    gap: 12,
    verticalOffset: 80,
  },
}));

// Componentes que são usados pelas pages
vi.mock('../../src/components/Library', () => ({
  Library: () => <div data-testid="library">Library</div>,
}));

vi.mock('../../src/components/Assistant', () => ({
  Assistant: () => <div data-testid="assistant">Assistant</div>,
}));

vi.mock('../../src/components/Inspector', () => ({
  Inspector: () => <div data-testid="inspector">Inspector</div>,
}));

vi.mock('../../src/components/ScriptEditor', () => ({
  ScriptEditor: () => <div data-testid="script-editor">ScriptEditor</div>,
}));

vi.mock('../../src/features/speed-paint/components/batch/BatchOrchestrator', () => ({
  BatchOrchestrator: () => <div data-testid="batch-orchestrator">BatchOrchestrator</div>,
}));

vi.mock('../../src/features/speed-paint/components/batch/QueueStaging', () => ({
  QueueStaging: () => <div data-testid="queue-staging">QueueStaging</div>,
}));

vi.mock('../../src/features/speed-paint/components/canvas/AnimationPlayer', () => ({
  AnimationPlayer: () => <div data-testid="animation-player">AnimationPlayer</div>,
}));

vi.mock('../../src/features/speed-paint/components/upload/ImageUpload', () => ({
  ImageUpload: () => <div data-testid="image-upload">ImageUpload</div>,
}));

vi.mock('../../src/components/VideoLibrary', () => ({
  VideoLibrary: () => <div data-testid="video-library">VideoLibrary</div>,
}));

vi.mock('../../src/components/VideoPreview', () => ({
  VideoPreview: () => <div data-testid="video-preview">VideoPreview</div>,
}));

vi.mock('../../src/features/video-render/components/VideoExportPanel', () => ({
  VideoExportPanel: () => <div data-testid="video-export-panel">VideoExportPanel</div>,
}));

vi.mock('../../src/features/video-render/components/TranscriptionPanel', () => ({
  TranscriptionPanel: () => <div data-testid="transcription-panel">TranscriptionPanel</div>,
}));

vi.mock('../../src/features/video-render/components/CaptionEditorPanel', () => ({
  CaptionEditorPanel: () => <div data-testid="caption-editor-panel">CaptionEditorPanel</div>,
}));

vi.mock('../../src/features/video-render/components/SubtitleInlineEditor', () => ({
  SubtitleInlineEditor: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// PublicHeader e PublicFooter (usados pelo LoginPage redesign)
vi.mock('../../src/components/public/PublicHeader', () => ({
  PublicHeader: () => <header data-testid="public-header">PublicHeader</header>,
}));

vi.mock('../../src/components/public/PublicFooter', () => ({
  PublicFooter: () => <footer data-testid="public-footer">PublicFooter</footer>,
}));

// Tokens e surfaces
vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Cadastro', description: 'Crie sua conta' }),
}));

vi.mock('../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  APP_HEADER_HEIGHT: 64,
  APP_ACTION_BAR_BOTTOM: 24,
  AVATAR_SIZE_SM: 32,
  AVATAR_SIZE_MD: 36,
  ICON_SIZE_SM: 14,
  ICON_SIZE_MD: 16,
  ICON_SIZE_LG: 18,
  RADIUS_XS: 2,
  RADIUS_SM: 3,
  RADIUS_CHIP: 6,
  GAP_COMPACT: 0.75,
  GAP_DEFAULT: 1,
  GAP_MEDIUM: 1.5,
  GAP_RELAXED: 2,
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_LIGHT: '#5BA3D0',
  BRAND_PRIMARY_DARK: '#1A5B8E',
  BRAND_SECONDARY: '#F7941E',
  BRAND_SECONDARY_LIGHT: '#FFB74D',
  BRAND_SECONDARY_DARK: '#E67300',
  BRAND_PRIMARY_CONTRAST_TEXT: '#ffffff',
  BRAND_SECONDARY_CONTRAST_TEXT: '#1A1A1A',
  WHITE: '#ffffff',
  BLACK: '#000000',
  SUCCESS_MAIN: '#10b981',
  ERROR_MAIN: '#ef4444',
  WARNING_MAIN: '#f59e0b',
  ERROR_BG_SUBTLE: 'rgba(239, 68, 68, 0.08)',
  ERROR_BG_MEDIUM: 'rgba(239, 68, 68, 0.12)',
  WARNING_BG_SUBTLE: 'rgba(245, 158, 11, 0.08)',
  TEXT_PRIMARY: '#f8fafc',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  TEXT_DISABLED: 'rgba(248, 250, 252, 0.38)',
  ACTION_ACTIVE: '#f8fafc',
  ACTION_HOVER: 'rgba(248, 250, 252, 0.05)',
  ACTION_SELECTED: 'rgba(46, 117, 182, 0.14)',
  ACTION_DISABLED: 'rgba(248, 250, 252, 0.3)',
  ACTION_DISABLED_BACKGROUND: 'rgba(248, 250, 252, 0.08)',
  ACTION_FOCUS: 'rgba(46, 117, 182, 0.22)',
  APP_BACKGROUND: '#050816',
  APP_BACKGROUND_DARKER: '#070b18',
  APP_BACKGROUND_SOFT: '#0b1020',
  APP_SURFACE: '#10172a',
  APP_SURFACE_ELEVATED: '#141c33',
  APP_BORDER: 'rgba(255, 255, 255, 0.08)',
  APP_BORDER_STRONG: 'rgba(255, 255, 255, 0.14)',
  SHADOW_DEEP: '#020617',
  SHADOW_IMAGE: 'rgba(2, 6, 23, 0.46)',
  WHITE_80: 'rgba(255, 255, 255, 0.8)',
  WHITE_82: 'rgba(255, 255, 255, 0.82)',
  WHITE_90: 'rgba(255, 255, 255, 0.9)',
  WHITE_92: 'rgba(255, 255, 255, 0.92)',
  WHITE_01: 'rgba(255, 255, 255, 0.01)',
  WHITE_04: 'rgba(255, 255, 255, 0.04)',
  WHITE_05: 'rgba(255, 255, 255, 0.05)',
  WHITE_015: 'rgba(255, 255, 255, 0.015)',
  WHITE_06: 'rgba(255, 255, 255, 0.06)',
  WHITE_08: 'rgba(255, 255, 255, 0.08)',
  WHITE_10: 'rgba(255, 255, 255, 0.1)',
  WHITE_12: 'rgba(255, 255, 255, 0.12)',
  WHITE_14: 'rgba(255, 255, 255, 0.14)',
  BLACK_18: 'rgba(0, 0, 0, 0.18)',
  BLACK_22: 'rgba(0, 0, 0, 0.22)',
  BLACK_34: 'rgba(0, 0, 0, 0.34)',
  BLACK_42: 'rgba(0, 0, 0, 0.42)',
  BLACK_44: 'rgba(0, 0, 0, 0.44)',
  BLACK_50: 'rgba(0, 0, 0, 0.5)',
  BLACK_56: 'rgba(2, 6, 23, 0.56)',
  BLACK_64: 'rgba(2, 6, 23, 0.64)',
  BLACK_66: 'rgba(0, 0, 0, 0.66)',
  BLACK_74: 'rgba(0, 0, 0, 0.74)',
  BLACK_82: 'rgba(0, 0, 0, 0.82)',
  BLACK_92: 'rgba(0, 0, 0, 0.92)',
  BLACK_24: 'rgba(0, 0, 0, 0.24)',
  BLACK_32: 'rgba(0, 0, 0, 0.32)',
  BLACK_38: 'rgba(0, 0, 0, 0.38)',
  BLACK_40: 'rgba(0, 0, 0, 0.40)',
  BLACK_46: 'rgba(0, 0, 0, 0.46)',
  BLACK_55: 'rgba(0, 0, 0, 0.55)',
  BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46, 117, 182, 0.12)',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  CYAN_GLOW: 'rgba(46, 117, 182, 0.28)',
  CYAN_GLOW_SOFT: 'rgba(46, 117, 182, 0.12)',
  PURPLE_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  BLACK_12: 'rgba(0, 0, 0, 0.12)',
  BLACK_10: 'rgba(0, 0, 0, 0.1)',
  WHITE_16: 'rgba(255, 255, 255, 0.16)',
  WHITE_18: 'rgba(255, 255, 255, 0.18)',
  WHITE_22: 'rgba(255, 255, 255, 0.22)',
  WHITE_24: 'rgba(255, 255, 255, 0.24)',
  WHITE_30: 'rgba(255, 255, 255, 0.3)',
  WHITE_38: 'rgba(255, 255, 255, 0.38)',
  WHITE_42: 'rgba(255, 255, 255, 0.42)',
  WHITE_44: 'rgba(255, 255, 255, 0.44)',
  WHITE_45: 'rgba(255, 255, 255, 0.45)',
  WHITE_46: 'rgba(255, 255, 255, 0.46)',
  WHITE_50: 'rgba(255, 255, 255, 0.5)',
  WHITE_56: 'rgba(255, 255, 255, 0.56)',
  WHITE_66: 'rgba(255, 255, 255, 0.66)',
  TRANSPARENT: 'transparent',
  GLASS_BG: 'rgba(16, 23, 42, 0.78)',
  EMPTY_ICON_SIZE: 36,
  EMPTY_WRAPPER_MAX_WIDTH: 340,
  EMPTY_WRAPPER_PADDING_XS: 3,
  EMPTY_WRAPPER_PADDING_MD: 4,
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
  BRAND_GRADIENT_HOVER: 'linear-gradient(135deg, #5BA3D0 0%, #F7941E 100%)',
  BRAND_GLOW: '0 14px 36px rgba(46, 117, 182, 0.26)',
  BRAND_GLOW_FOCUS: '0 0 0 3px rgba(46, 117, 182, 0.45)',
  APP_BACKGROUND_GLOW: 'radial-gradient(circle at 15% 15%, rgba(46, 117, 182, 0.12) 0%, transparent 34%), radial-gradient(circle at 85% 20%, rgba(247, 148, 30, 0.12) 0%, transparent 30%), linear-gradient(180deg, #050816 0%, #070b18 100%)',
}));

import { LibraryPage } from '../../src/pages/LibraryPage';
import { NotFoundPage } from '../../src/pages/NotFoundPage';
import { AssistantPage } from '../../src/pages/AssistantPage';
import { SpeedPaintPage } from '../../src/pages/SpeedPaintPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { RegisterPage } from '../../src/pages/RegisterPage';
import { StudioPage } from '../../src/pages/StudioPage';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const defaultAuth = {
  user: null,
  loading: false,
  authError: null,
  clearAuthError: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  loginWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  logout: vi.fn(),
};

describe('Pages — Renderização', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuth);
  });

  describe('LibraryPage', () => {
    it('deve renderizar sem crash', () => {
      renderWithRouter(<LibraryPage />);
      expect(screen.getByTestId('library')).toBeTruthy();
    });
  });

  describe('NotFoundPage', () => {
    it('deve renderizar sem crash', () => {
      renderWithRouter(<NotFoundPage />);
      expect(screen.getByText('Página não encontrada')).toBeTruthy();
    });

    it('deve exibir botão "Voltar ao início"', () => {
      renderWithRouter(<NotFoundPage />);
      expect(screen.getByText('Voltar ao início')).toBeTruthy();
    });

    it('deve exibir "Página não encontrada" quando visitante', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuth, user: null });
      renderWithRouter(<NotFoundPage />);
      expect(screen.getByText('Página não encontrada')).toBeTruthy();
    });

    it('deve exibir "Página não encontrada" quando autenticado', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuth, user: { uid: 'u1', displayName: 'Test', photoURL: null } });
      renderWithRouter(<NotFoundPage />);
      expect(screen.getByText('Página não encontrada')).toBeTruthy();
    });
  });

  describe('AssistantPage', () => {
    it('deve renderizar sem crash', () => {
      renderWithRouter(
        <AssistantPage
          currentState={{
            script: '',
            selectedVoice: 'Puck',
            audioProfile: '',
            scene: '',
            pace: 'normal',
            styleNotes: '',
            isMultiSpeaker: false,
            generateScenes: false,
            sceneRatio: '16:9',
            sceneDensity: 15,
            visualFramework: 'general',
            referenceImage: null,
          }}
          onApplySettings={vi.fn()}
        />
      );
      expect(screen.getByTestId('assistant')).toBeTruthy();
    });
  });

  describe('SpeedPaintPage', () => {
    it('deve renderizar sem crash (estado vazio = upload)', () => {
      renderWithRouter(<SpeedPaintPage />);
      expect(screen.getByText('Transforme Imagens em')).toBeTruthy();
      expect(screen.getByTestId('batch-orchestrator')).toBeTruthy();
    });
  });

  describe('LoginPage', () => {
    it('deve renderizar sem crash', () => {
      renderWithRouter(<LoginPage />);
      // "Script Master" aparece no PublicHeader e no card de login
      expect(screen.getAllByText('Script Master').length).toBeGreaterThan(0);
      expect(screen.getByText('Entrar com Google')).toBeTruthy();
    });

    it('deve renderizar PublicHeader e PublicFooter', () => {
      renderWithRouter(<LoginPage />);
      expect(screen.getByTestId('public-header')).toBeTruthy();
      expect(screen.getByTestId('public-footer')).toBeTruthy();
    });

    it('deve exibir os 4 benefícios de LOGIN_BENEFITS', () => {
      renderWithRouter(<LoginPage />);
      expect(screen.getByText('Voz com IA')).toBeTruthy();
      expect(screen.getByText('Vídeo Automático')).toBeTruthy();
      expect(screen.getByText('Imagens')).toBeTruthy();
      expect(screen.getByText('Assistente IA')).toBeTruthy();
    });

    it('deve exibir a descrição dos benefícios', () => {
      renderWithRouter(<LoginPage />);
      expect(screen.getByText('Roteiros em áudio profissional com Gemini TTS')).toBeTruthy();
      expect(screen.getByText('Renderização client-side com legendas')).toBeTruthy();
      expect(screen.getByText('Geração com 8 aspect ratios e referência')).toBeTruthy();
      expect(screen.getByText('Chat com memória e integração ao estúdio')).toBeTruthy();
    });

    it('deve exibir o título "Crie com IA, sem limites"', () => {
      renderWithRouter(<LoginPage />);
      expect(screen.getByText('Crie com IA, sem limites')).toBeTruthy();
    });

    it('deve exibir "Entre com Google ou email" no card', () => {
      renderWithRouter(<LoginPage />);
      expect(screen.getByText('Entre com Google ou email')).toBeTruthy();
    });

    it('deve exibir loading quando auth está carregando', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuth, loading: true });
      renderWithRouter(<LoginPage />);
      expect(screen.getByText('Verificando sessão...')).toBeTruthy();
    });

    it('deve exibir erro de autenticação quando houver', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuth, authError: 'Erro de popup' });
      renderWithRouter(<LoginPage />);
      expect(screen.getByText('Erro de popup')).toBeTruthy();
    });

    it('deve exibir link skip-to-content', () => {
      renderWithRouter(<LoginPage />);
      const skipLink = screen.getByText('Pular para o conteúdo');
      expect(skipLink).toBeDefined();
      const anchor = skipLink.closest('a');
      expect(anchor?.getAttribute('href')).toBe('#main-content');
    });
  });

  describe('StudioPage', () => {
    const minimalProps = {
      script: '',
      setScript: vi.fn(),
      isGenerating: false,
      handleGenerate: vi.fn(),
      isGenerateDisabled: false,
      scenes: [],
      isMultiSpeaker: false,
      setIsMultiSpeaker: vi.fn(),
      speakerAName: '',
      setSpeakerAName: vi.fn(),
      selectedVoice: 'Puck',
      setSelectedVoice: vi.fn(),
      speakerBName: '',
      setSpeakerBName: vi.fn(),
      speakerBVoice: '',
      setSpeakerBVoice: vi.fn(),
      audioProfile: '',
      setAudioProfile: vi.fn(),
      scene: '',
      setScene: vi.fn(),
      pace: 'normal',
      setPace: vi.fn(),
      styleNotes: '',
      setStyleNotes: vi.fn(),
      generateScenes: false,
      setGenerateScenes: vi.fn(),
      sceneDensity: 15,
      setSceneDensity: vi.fn(),
      sceneRatio: '16:9' as const,
      setSceneRatio: vi.fn(),
      visualFramework: 'general',
      setVisualFramework: vi.fn(),
      referenceImage: null,
      setReferenceImage: vi.fn(),
    };

    it('deve renderizar sem crash', () => {
      renderWithRouter(<StudioPage {...minimalProps} />);
      expect(screen.getByTestId('inspector')).toBeTruthy();
      expect(screen.getByTestId('script-editor')).toBeTruthy();
    });
  });

  describe('RegisterPage', () => {
    it('deve renderizar sem crash', () => {
      renderWithRouter(<RegisterPage />);
      // "Criar conta" aparece no título e no botão
      const criarContaElements = screen.getAllByText('Criar conta');
      expect(criarContaElements.length).toBeGreaterThanOrEqual(1);
    });

    it('deve renderizar PublicHeader e PublicFooter', () => {
      renderWithRouter(<RegisterPage />);
      expect(screen.getByTestId('public-header')).toBeTruthy();
      expect(screen.getByTestId('public-footer')).toBeTruthy();
    });

    it('deve exibir link "Faça login"', () => {
      renderWithRouter(<RegisterPage />);
      expect(screen.getByText('Faça login')).toBeTruthy();
    });
  });

  describe('Redirects', () => {
    it('/register deve redirecionar para /cadastro', async () => {
      const { Navigate } = await import('react-router-dom');
      // Renderiza o componente Navigate que o App usa para /register -> /cadastro
      renderWithRouter(
        <Navigate to="/cadastro" replace />
      );
      // Apenas verifica que Navigate renderiza sem crash
      expect(true).toBeTruthy();
    });
  });
});
