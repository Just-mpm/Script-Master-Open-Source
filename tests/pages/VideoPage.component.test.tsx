import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { forwardRef } from 'react';
import { VideoPage } from '../../src/pages/VideoPage';
import { I18nProvider } from '../../src/features/i18n';

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

vi.mock('../../src/contexts/AudioContext', () => ({
  useGlobalAudioActions: () => ({
    pause: vi.fn(),
    play: vi.fn(),
    toggle: vi.fn(),
    seek: vi.fn(),
    formatTime: (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
  }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, loading: false, authError: null, clearAuthError: vi.fn(), login: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../../src/hooks/useAudioGenerator', () => ({
  useAudioGenerator: () => ({
    isGenerating: false,
    statusText: '',
    generationProgress: 0,
    audioUrl: null,
    audioBlob: null,
    scenes: [],
    audioSegments: [],
    projectId: null,
    error: null,
    setError: vi.fn(),
    generateAudio: vi.fn(),
    handleCancel: vi.fn(),
    loadProjectData: vi.fn(),
    durationInSeconds: 0,
  }),
}));

const audioGenStoreState = {
  audioUrl: null as string | null,
  audioBlob: null as Blob | null,
  scenes: [] as { imageUrl: string; timestamp: number }[],
  audioSegments: [] as unknown[],
  projectId: null as string | null,
  audioDuration: 0,
  loadProjectData: vi.fn(),
};

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

const bridgeFns = {
  syncExportState: vi.fn(),
  syncTranscriptionState: vi.fn(),
  resetBridge: vi.fn(),
};

vi.mock('../../src/features/video-render/store/videoRenderBridge', () => ({
  useVideoRenderBridge: Object.assign(
    () => bridgeFns,
    { getState: () => bridgeFns },
  ),
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

vi.mock('../../src/components/VideoPreview', () => ({
  VideoPreview: forwardRef(function VideoPreview() {
    return <div data-testid="video-preview">VideoPreview</div>;
  }),
}));

vi.mock('../../src/components/VideoLibrary', () => ({
  VideoLibrary: () => <div data-testid="video-library">VideoLibrary</div>,
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
  SubtitleInlineEditor: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/features/studio/store', () => {
  const studioState = {
    script: '',
    setScript: vi.fn(),
    sceneRatio: '16:9',
  };
  const audioGenState = {
    audioUrl: null as string | null,
    audioBlob: null as Blob | null,
    scenes: [] as { imageUrl: string; timestamp: number }[],
    audioSegments: [] as unknown[],
    projectId: null as string | null,
    audioDuration: 0,
    loadProjectData: vi.fn(),
  };
  return {
    useStudioStore: (selector?: (s: typeof studioState) => unknown) =>
      selector ? selector(studioState) : studioState,
    VIDEO_FPS: 30,
    useAudioGeneratorStore: (selector?: (s: typeof audioGenState) => unknown) =>
      selector ? selector(audioGenState) : audioGenState,
    getAudioDurationSeconds: () => 0,
  };
});

describe('VideoPage', () => {
  const videoPlayerRef = { current: null };

  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza o título da página', () => {
    render(<VideoPage videoPlayerRef={videoPlayerRef} />, { wrapper: Wrapper });
    expect(screen.getByText('Montagem visual')).toBeDefined();
  });

  it('renderiza o VideoPreview', () => {
    render(<VideoPage videoPlayerRef={videoPlayerRef} />, { wrapper: Wrapper });
    expect(screen.getByTestId('video-preview')).toBeDefined();
  });

  it('renderiza o TranscriptionPanel', () => {
    render(<VideoPage videoPlayerRef={videoPlayerRef} />, { wrapper: Wrapper });
    expect(screen.getByTestId('transcription-panel')).toBeDefined();
  });

  it('renderiza o VideoExportPanel', () => {
    render(<VideoPage videoPlayerRef={videoPlayerRef} />, { wrapper: Wrapper });
    expect(screen.getByTestId('video-export-panel')).toBeDefined();
  });

  it('renderiza o VideoLibrary', () => {
    render(<VideoPage videoPlayerRef={videoPlayerRef} />, { wrapper: Wrapper });
    expect(screen.getByTestId('video-library')).toBeDefined();
  });

  it('renderiza o SubtitleInlineEditor', () => {
    render(<VideoPage videoPlayerRef={videoPlayerRef} />, { wrapper: Wrapper });
    // SubtitleInlineEditor é wrapper que renderiza children (VideoPreview)
    expect(screen.getByTestId('video-preview')).toBeDefined();
  });
});
