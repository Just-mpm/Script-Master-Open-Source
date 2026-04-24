import { describe, it, expect, vi } from 'vitest';
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
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: { uid: 'test-uid', email: 'test@test.com' }, loading: false, authError: null, clearAuthError: vi.fn(), login: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../../src/features/speed-paint/store/animationStore', () => ({
  useAnimationStore: () => ({
    queue: [],
    batchMode: 'idle',
  }),
}));

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

import { LibraryPage } from '../../src/pages/LibraryPage';
import { NotFoundPage } from '../../src/pages/NotFoundPage';
import { AssistantPage } from '../../src/pages/AssistantPage';
import { SpeedPaintPage } from '../../src/pages/SpeedPaintPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { StudioPage } from '../../src/pages/StudioPage';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Pages — Renderização', () => {
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
      expect(screen.getByText('Script Master')).toBeTruthy();
      expect(screen.getByText('Entrar com Google')).toBeTruthy();
    });

    it('deve exibir "Faça login para continuar"', () => {
      renderWithRouter(<LoginPage />);
      expect(screen.getByText('Faça login para continuar')).toBeTruthy();
    });
  });

  describe('StudioPage', () => {
    // Cria props mínimas para StudioPage
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
});
